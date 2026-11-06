import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/game.js';
import { Enemy } from '../js/enemies.js';
import { Tower } from '../js/towers.js';
import { Projectile } from '../js/projectiles.js';
import { CIRCLE_LEVEL, resolveLevel } from '../js/content/index.js';
import { validateMap } from '../js/content/validate.js';
import { ENEMIES } from '../js/config.js';
import { Storage } from '../js/effects.js';
import { prepareCircleDefense } from './helpers/circle-defense.js';

function game() {
  const g = Object.create(Game.prototype);
  g.storage = { record() {}, recordCircle() {} };
  g.audio = { play() {}, unlock() {} };
  g.startCircle();
  return g;
}

test('Circle Defense has a larger closed maze, three distinct portals, and more than 100 spawns per stage', () => {
  const g = game(),
    classic = resolveLevel('woodland-pass');
  assert.ok(g.map.grid.cols > classic.map.grid.cols);
  assert.ok(g.map.grid.rows > classic.map.grid.rows);
  assert.equal(g.map.loop, true);
  assert.equal(g.map.portals.length, 3);
  assert.equal(new Set(g.map.portals.map((p) => p.distance)).size, 3);
  assert.equal(g.waves.count, 20);
  for (const [i, stage] of CIRCLE_LEVEL.waves.entries()) {
    assert.ok(stage.enemies.length > 100);
    if (i > 0) {
      assert.ok(stage.enemies.length > CIRCLE_LEVEL.waves[i - 1].enemies.length);
      assert.ok(stage.healthMultiplier > CIRCLE_LEVEL.waves[i - 1].healthMultiplier);
    }
    if ((i + 1) % 5 === 0)
      assert.deepEqual(
        [60, 61, 62].map((n) => stage.enemies[n]),
        ['boss', 'boss', 'boss'],
      );
  }
  const start = g.map.position(0),
    end = g.map.position(g.map.length),
    later = g.map.position(g.map.length * 10 + 100);
  assert.deepEqual(start, end);
  assert.ok(Math.hypot(later.x - g.map.position(100).x, later.y - g.map.position(100).y) < 0.00001);
  assert.equal(g.map.buildable(2, 2, []), false);
  assert.throws(() => validateMap({ ...g.map.definition, portals: [] }), /three portals/);
});

test('mobs loop repeatedly without disappearing or removing lives, and enter evenly through all portals', () => {
  const g = game();
  g.startWave();
  for (let i = 0; i < 150; i++) g.update(1 / 120);
  const counts = [0, 0, 0];
  for (const enemy of g.enemies) counts[enemy.portalIndex]++;
  assert.ok(counts.every((count) => count > 0));
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 1);
  const mob = g.enemies[0],
    lives = g.lives;
  mob.update((g.map.length * 3) / mob.speed, g);
  assert.equal(mob.alive, true);
  assert.ok(mob.laps >= 3);
  assert.equal(g.lives, lives);
  assert.ok(mob.x >= 0 && mob.x <= g.map.grid.width && mob.y >= 0 && mob.y <= g.map.grid.height);
});

test('100 living mobs is safe, 101 loses immediately, and dead mobs do not count', () => {
  const g = game();
  for (let i = 0; i < 100; i++) g.spawn('basic', i % 3);
  assert.equal(g.population, 100);
  assert.equal(g.state, 'playing');
  g.enemies[0].damage(1e9, g);
  assert.equal(g.population, 99);
  g.spawn('basic', 1);
  assert.equal(g.state, 'playing');
  g.spawn('basic', 2);
  assert.equal(g.state, 'over');
  assert.equal(g.population, 101);
  assert.equal(g.peakPopulation, 101);
  assert.match(g.lossReason, /101/);
  const before = g.enemies[1].distance;
  g.update(5);
  assert.equal(g.enemies[1].distance, before);
});

test('an undefended stage overflows before all spawns finish; pause freezes portals and movement', () => {
  const g = game();
  g.startWave();
  g.togglePause();
  const queue = g.waves.queue.length;
  g.update(10);
  assert.equal(g.waves.queue.length, queue);
  assert.equal(g.population, 0);
  g.togglePause();
  for (let i = 0; i < 60 * 120 && g.state === 'playing'; i++) g.update(1 / 120);
  assert.equal(g.state, 'over');
  assert.equal(g.waves.spawned, 101);
  assert.equal(g.waves.queue.length, 19);
});

test('weakness and resistance multiply damage after armor only in Circle Defense', () => {
  const g = game();
  const armored = new Enemy('armored', 1, g.map);
  armored.damage(100, g, 0, 'explosive');
  assert.equal(armored.health, ENEMIES.armored.health - 80);
  const resistant = new Enemy('armored', 1, g.map);
  resistant.damage(100, g, 0, 'rapid');
  assert.equal(resistant.health, ENEMIES.armored.health - 32.5);
  const tank = new Enemy('tank', 1, g.map);
  tank.damage(100, g, 0.75, 'precision');
  assert.ok(Math.abs(tank.health - (tank.maxHealth - 150 * (1 - 0.18 * 0.25))) < 0.00001);
  g.reset('woodland-pass');
  g.state = 'playing';
  const classic = new Enemy('armored', 1, g.map);
  classic.damage(100, g, 0, 'explosive');
  assert.equal(classic.health, 60);
});

test('frost suppresses regeneration temporarily; splash damage uses enemy weaknesses', () => {
  const g = game(),
    frost = new Tower('frost', 0, 0, g.map.grid),
    enemy = new Enemy('regen', 1, g.map);
  g.enemies = [enemy];
  new Projectile(frost, enemy, frost.stats).update(100, g);
  const health = enemy.health;
  enemy.update(1, g);
  assert.equal(enemy.health, health);
  assert.ok(enemy.slowTime > 0);
  enemy.update(2.1, g);
  assert.ok(enemy.health > health);
  const cannon = new Tower('cannon', 0, 0, g.map.grid),
    a = new Enemy('armored', 1, g.map),
    b = new Enemy('tank', 1, g.map);
  a.x = b.x = cannon.x;
  a.y = b.y = cannon.y;
  g.enemies = [a, b];
  new Projectile(cannon, a, cannon.stats).update(1, g);
  assert.equal(a.health, a.maxHealth - cannon.stats.damage * 1.6 * 0.5);
  assert.ok(Math.abs(b.health - (b.maxHealth - cannon.stats.damage * 1.2 * 0.82)) < 0.00001);
});

test('target priority chooses oldest, strongest or weakest independently of portal position', () => {
  const g = game(),
    tower = new Tower('archer', 3, 3, g.map.grid);
  const older = new Enemy('basic', 1, g.map),
    stronger = new Enemy('tank', 1, g.map);
  for (const mob of [older, stronger]) {
    mob.x = tower.x + 10;
    mob.y = tower.y;
  }
  older.travelled = 500;
  older.distance = 500;
  stronger.travelled = 10;
  stronger.distance = 3000;
  g.enemies = [older, stronger];
  tower.update(0.1, g);
  assert.equal(g.projectiles.at(-1).target, older);
  tower.priority = 'strongest';
  tower.cooldown = 0;
  tower.update(0.1, g);
  assert.equal(g.projectiles.at(-1).target, stronger);
  tower.priority = 'weakest';
  tower.cooldown = 0;
  tower.update(0.1, g);
  assert.equal(g.projectiles.at(-1).target, older);
});

test('a stage cannot clear with living loopers; restart resets the circle run and campaign remains separate', () => {
  const g = game();
  g.startWave();
  g.waves.queue = [];
  g.spawn('basic', 0);
  g.update(0.1);
  assert.equal(g.waves.active, true);
  g.enemies[0].damage(1e9, g);
  g.update(0.1);
  assert.equal(g.waves.active, false);
  const gold = g.gold;
  g.update(1);
  assert.equal(g.gold, gold);
  g.restartRun();
  assert.equal(g.mode, 'circle');
  assert.equal(g.gold, 650);
  assert.equal(g.population, 0);
  assert.equal(g.peakPopulation, 0);
  g.startCampaign();
  assert.equal(g.mode, 'tower');
  assert.equal(g.gold, 200);
  assert.equal(g.map.loop, false);
});

test('circle personal bests are stored independently of Tower Defense records', () => {
  const original = globalThis.localStorage,
    entries = new Map();
  try {
    globalThis.localStorage = {
      getItem: (key) => entries.get(key) ?? null,
      setItem: (key, value) => entries.set(key, value),
    };
    const storage = new Storage();
    storage.record(9999, 80);
    storage.recordCircle(1234, 5);
    const saved = new Storage();
    assert.equal(saved.bestScore, 9999);
    assert.equal(saved.bestWave, 80);
    assert.equal(saved.bestCircleScore, 1234);
    assert.equal(saved.bestCircleStage, 5);
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
});

test('a mixed defense clears all twenty Circle stages using only paid towers and earned gold', () => {
  const g = game();
  let defeated = 0;
  for (let stage = 1; stage <= 20; stage++) {
    prepareCircleDefense(g);
    assert.ok(g.gold >= 0);
    if (g.waves.breakRemaining) g.update(g.waves.breakRemaining + 0.01);
    g.startWave();
    for (let tick = 0; tick < 360 * 120 && g.waves.active && g.state === 'playing'; tick++)
      g.update(1 / 120);
    assert.equal(g.waves.active, false, `stage ${stage} finished`);
    assert.equal(g.population, 0);
    assert.ok(g.peakPopulation <= 100);
    assert.ok(g.stats.defeated > defeated);
    defeated = g.stats.defeated;
    assert.equal(g.state, stage === 20 ? 'victory' : 'playing');
  }
  assert.equal(
    g.stats.defeated,
    CIRCLE_LEVEL.waves.reduce((sum, wave) => sum + wave.enemies.length, 0),
  );
});
