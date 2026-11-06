import test from 'node:test';
import assert from 'node:assert/strict';
import { TOWERS, ENEMIES } from '../js/config.js';
import { validateUnits } from '../js/config/validate.js';
import { Game } from '../js/game.js';
import { Enemy } from '../js/enemies.js';
import { Waves } from '../js/waves.js';
import { createClassicWaves } from '../js/content/waves/classic.js';

function makeGame() {
  const game = Object.create(Game.prototype);
  game.storage = { record() {} };
  game.audio = { play() {} };
  game.reset();
  game.state = 'playing';
  return game;
}

test('a newly configured tower can be bought, upgraded, and attack without new engine code', () => {
  TOWERS.ranger = {
    ...TOWERS.archer,
    name: 'Ranger Tower',
    cost: 80,
    damage: 22,
    upgrades: [80, 120],
  };
  try {
    validateUnits(TOWERS, ENEMIES);
    const game = makeGame();
    game.chooseTower('ranger');
    game.interact(1, 1);
    const tower = game.towers[0];
    assert.equal(tower.type, 'ranger');
    assert.equal(tower.stats.visual, 'archer');
    assert.equal(game.gold, 120);
    game.selected = tower;
    game.upgrade();
    assert.equal(game.gold, 40);
    game.earn(80);
    game.upgrade();
    assert.equal(game.gold, 0);
    assert.equal(tower.level, 3);
    assert.equal(tower.upgradeCost, null);
    game.waves.current = 1;
    const target = new Enemy('basic', 1, game.map);
    target.x = tower.x + 30;
    target.y = tower.y;
    game.enemies = [target];
    tower.update(1 / 120, game);
    game.projectiles[0].update(1, game);
    assert.equal(game.stats.defeated, 1);
  } finally {
    delete TOWERS.ranger;
  }
});

test('a new enemy uses its own specs and can replace the default wave enemy or boss', () => {
  ENEMIES.raider = {
    ...ENEMIES.fast,
    name: 'Raider',
    isBoss: true,
    health: 80,
    armor: 0.4,
    regen: 0.01,
  };
  try {
    validateUnits(TOWERS, ENEMIES);
    const game = makeGame();
    const enemy = new Enemy('raider', 1, game.map);
    enemy.damage(20, game);
    assert.equal(enemy.health, 68);
    enemy.update(1, game);
    assert.equal(enemy.health, 68.8);
    const level = {
      id: 'raider-test',
      waves: createClassicWaves({
        count: 1,
        basicType: 'raider',
        bossType: 'raider',
        bossEvery: 1,
      }),
    };
    assert.ok(level.waves[0].enemies.every((type) => type === 'raider'));
    const waves = new Waves(level);
    waves.start();
    assert.equal(waves.hasBoss, true);
    assert.deepEqual(waves.bossNames, ['Raider']);
  } finally {
    delete ENEMIES.raider;
  }
});

test('invalid edited unit specs identify the affected unit and property', () => {
  assert.throws(
    () => validateUnits({ broken: { ...TOWERS.archer, rate: 0 } }, ENEMIES),
    /tower "broken".*rate/,
  );
  assert.throws(
    () => validateUnits(TOWERS, { broken: { ...ENEMIES.basic, armor: undefined } }),
    /enemy "broken".*armor/,
  );
  assert.throws(
    () => validateUnits({ broken: { ...TOWERS.frost, slowDuration: 0 } }, ENEMIES),
    /tower "broken".*slowDuration/,
  );
  assert.doesNotThrow(() => validateUnits({ basic: { ...TOWERS.archer, upgrades: [] } }, ENEMIES));
});
