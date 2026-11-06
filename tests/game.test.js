import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/game.js';
import { GameMap } from '../js/map.js';
import { Tower } from '../js/towers.js';
import { Enemy } from '../js/enemies.js';
import { Projectile } from '../js/projectiles.js';
import { wavePlan } from '../js/waves.js';
import { TOWERS, RULES } from '../js/config.js';

function game() {
  const g = Object.create(Game.prototype);
  g.map = new GameMap();
  g.storage = { record() {} };
  g.audio = { play() {}, unlock() {} };
  g.reset();
  g.state = 'playing';
  return g;
}
function simulate(g, seconds) {
  for (let t = 0; t < seconds && g.state === 'playing'; t += 1 / 120) g.update(1 / 120);
}

test('path is continuous, reaches the base, and excludes path tiles from building', () => {
  const map = new GameMap();
  for (let d = 1; d <= map.length; d += 7) {
    const a = map.position(d - 1),
      b = map.position(d);
    assert.ok(Math.abs(Math.hypot(a.x - b.x, a.y - b.y) - 1) < 0.00001);
  }
  assert.deepEqual(map.position(map.length), map.points.at(-1));
  assert.equal(map.buildable(4, 3, []), false);
  assert.equal(map.buildable(-1, 0, []), false);
  assert.equal(map.buildable(18, 0, []), false);
  assert.equal(map.buildable(2, 2, []), true);
  assert.equal(map.buildable(2, 2, [new Tower('archer', 2, 2)]), false);
});
test('placement, insufficient funds, upgrades, and refund use exact costs', () => {
  const g = game();
  g.chooseTower('archer');
  g.interact(4, 3);
  assert.equal(g.gold, 200);
  g.interact(2, 2);
  assert.equal(g.gold, 150);
  assert.equal(g.stats.built, 1);
  g.interact(2, 2);
  assert.equal(g.selected, g.towers[0]);
  assert.equal(g.buildType, null);
  const before = g.selected.stats;
  g.upgrade();
  assert.equal(g.gold, 90);
  assert.equal(g.selected.level, 2);
  assert.ok(g.selected.stats.damage > before.damage);
  g.upgrade();
  assert.equal(g.selected.level, 2);
  assert.equal(g.gold, 90);
  g.sell();
  assert.equal(g.gold, 167);
  assert.equal(g.towers.length, 0);
  g.gold = 0;
  g.chooseTower('sniper');
  g.interact(1, 1);
  assert.equal(g.towers.length, 0);
});
test('all towers allow three upgrades and cap at level four', () => {
  for (const type of Object.keys(TOWERS)) {
    const t = new Tower(type, 1, 1);
    for (let i = 0; i < 3; i++) assert.equal(t.upgrade(), true);
    assert.equal(t.level, 4);
    assert.equal(t.upgradeCost, null);
    assert.equal(t.upgrade(), false);
    assert.equal(
      t.sellValue,
      Math.floor(
        ((TOWERS[type].cost + TOWERS[type].upgrades.reduce((a, b) => a + b, 0)) * 70) / 100,
      ),
    );
  }
});
test('death is rewarded exactly once; armor and sniper penetration work', () => {
  const g = game(),
    e = new Enemy('basic', 1, g.map);
  e.damage(100, g);
  e.damage(100, g);
  assert.equal(g.gold, 208);
  assert.equal(g.stats.defeated, 1);
  assert.equal(e.health, 0);
  const a = new Enemy('armored', 1, g.map);
  a.damage(20, g);
  assert.equal(a.health, a.maxHealth - 10);
  a.damage(20, g, 0.75);
  assert.equal(a.health, a.maxHealth - 27.5);
});
test('frost expires, regeneration caps, and projectiles cannot duplicate kills', () => {
  const g = game(),
    e = new Enemy('regen', 1, g.map);
  e.health -= 20;
  e.slow(0.48, 0.5);
  const d = e.distance;
  e.update(0.25, g);
  assert.equal(e.slowFactor, 0.48);
  assert.ok(e.health > e.maxHealth - 20);
  assert.ok(e.distance - d < e.speed * 0.25);
  e.update(0.5, g);
  assert.equal(e.slowFactor, 1);
  e.health = e.maxHealth - 1;
  e.update(1, g);
  assert.equal(e.health, e.maxHealth);
  const target = new Enemy('basic', 1, g.map),
    tower = new Tower('sniper', 0, 2),
    a = new Projectile(tower, target, tower.stats),
    b = new Projectile(tower, target, tower.stats);
  g.enemies = [target];
  a.update(10, g);
  b.update(10, g);
  assert.equal(g.stats.defeated, 1);
});
test('cannon hits groups and frost projectiles apply slowing', () => {
  const g = game(),
    a = new Enemy('basic', 1, g.map),
    b = new Enemy('basic', 1, g.map);
  b.x += 20;
  g.enemies = [a, b];
  const cannon = new Tower('cannon', 0, 2);
  new Projectile(cannon, a, cannon.stats).update(10, g);
  assert.equal(g.stats.defeated, 2);
  const target = new Enemy('tank', 1, g.map);
  g.enemies = [target];
  const frost = new Tower('frost', 0, 2);
  new Projectile(frost, target, frost.stats).update(10, g);
  assert.equal(target.slowFactor, 0.48);
});
test('tower target selection prioritizes the enemy nearest the exit', () => {
  const g = game(),
    tower = new Tower('archer', 2, 2),
    a = new Enemy('basic', 1, g.map),
    b = new Enemy('basic', 1, g.map);
  a.x = b.x = tower.x + 20;
  a.y = b.y = tower.y;
  a.distance = 100;
  b.distance = 200;
  g.enemies = [a, b];
  tower.update(0.1, g);
  assert.equal(g.projectiles[0].target, b);
});
test('bosses appear exactly on waves 5, 10, 15, 20; all enemy types appear', () => {
  const types = new Set();
  for (let w = 1; w <= 20; w++) {
    const plan = wavePlan(w);
    plan.forEach((t) => types.add(t));
    assert.equal(plan.filter((t) => t === 'boss').length, w % 5 === 0 ? 1 : 0);
  }
  assert.equal(types.size, 6);
  assert.ok(wavePlan(1).every((t) => t === 'basic'));
});
test('pause freezes combat, spawning, cooldowns, effects, and intermission', () => {
  const g = game();
  g.startWave();
  g.paused = true;
  const snapshot = JSON.stringify({ waves: g.waves, enemies: g.enemies, towers: g.towers });
  g.update(10);
  assert.equal(JSON.stringify({ waves: g.waves, enemies: g.enemies, towers: g.towers }), snapshot);
  g.togglePause();
  g.update(1);
  assert.ok(g.enemies.length > 0);
});
test('wave cannot start twice; no-defense run ends in defeat; restart resets everything', () => {
  const g = game();
  g.startWave();
  g.startWave();
  assert.equal(g.waves.current, 1);
  simulate(g, 80);
  assert.equal(g.waves.active, false);
  assert.equal(g.lives, 13);
  assert.equal(g.gold, 230);
  simulate(g, 4.1);
  g.startWave();
  simulate(g, 80);
  simulate(g, 4.1);
  g.startWave();
  simulate(g, 80);
  assert.equal(g.state, 'over');
  assert.equal(g.lives, 0);
  g.reset();
  assert.equal(g.gold, 200);
  assert.equal(g.lives, 20);
  assert.equal(g.waves.current, 0);
  assert.equal(g.enemies.length, 0);
  assert.equal(g.stats.earned, 0);
});
test('all twenty waves resolve and victory waits for the final surviving enemy', () => {
  const g = game();
  g.waves.current = 19;
  g.startWave();
  g.waves.queue = [];
  const e = new Enemy('basic', 20, g.map);
  g.enemies = [e];
  g.update(0.1);
  assert.equal(g.state, 'playing');
  e.damage(1e9, g);
  g.update(0.1);
  assert.equal(g.state, 'victory');
  assert.equal(g.waves.active, false);
  assert.ok(g.gold > 200);
});
test('a strategic mixed defense beats all 20 waves using only the normal starting budget and earned gold', () => {
  const g = game();
  const plan = [
    ['archer', 3, 4],
    ['archer', 5, 5],
    ['archer', 8, 7],
    ['archer', 10, 4],
    ['frost', 8, 5],
    ['cannon', 5, 7],
    ['sniper', 11, 5],
    ['sniper', 12, 6],
    ['machine', 13, 8],
    ['cannon', 13, 3],
    ['frost', 15, 7],
    ['sniper', 11, 8],
  ];
  for (let w = 1; w <= 20; w++) {
    for (const [type, x, y] of plan) {
      if (g.towers.some((t) => t.col === x && t.row === y)) continue;
      if (g.gold < TOWERS[type].cost) break;
      assert.ok(g.map.buildable(x, y, g.towers));
      g.chooseTower(type);
      g.interact(x, y);
    }
    const priorities = ['sniper', 'cannon', 'archer', 'machine', 'frost'];
    const order = [...g.towers].sort(
      (a, b) => a.level - b.level || priorities.indexOf(a.type) - priorities.indexOf(b.type),
    );
    for (const t of order)
      if (t.upgradeCost !== null && g.gold >= t.upgradeCost) {
        g.selected = t;
        g.upgrade();
      }
    assert.ok(g.gold >= 0);
    g.waves.breakRemaining = 0;
    g.startWave();
    for (let i = 0; i < 180 * 120 && g.waves.active && g.state === 'playing'; i++)
      g.update(1 / 120);
    assert.equal(g.waves.active, false, `wave ${w} completed`);
    assert.equal(g.lives, 20, `wave ${w} defended`);
  }
  assert.equal(g.state, 'victory');
  assert.equal(g.stats.built, 12);
  assert.ok(g.stats.earned > 0);
});
