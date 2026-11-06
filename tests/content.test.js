import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/game.js';
import { GameMap } from '../js/map.js';
import { Waves, wavePlan } from '../js/waves.js';
import { MAPS, LEVELS, resolveLevel } from '../js/content/index.js';
import { validateMap, validateLevel } from '../js/content/validate.js';
import { createClassicWaves } from '../js/content/waves/classic.js';
import { ENEMIES } from '../js/config.js';

const testMap = {
  id: 'test-crossing',
  name: 'Test Crossing',
  grid: { cols: 10, rows: 8, cell: 40 },
  path: [
    [3, -1],
    [3, 4],
    [8, 4],
    [8, 8],
  ],
  blockedCells: [[1, 1]],
  theme: { grass: '#665544' },
};

function testLevel(overrides = {}) {
  return {
    id: 'test-mission',
    name: 'Test Mission',
    mapId: testMap.id,
    rules: { startingGold: 350, startingLives: 9, breakTime: 0.75 },
    waves: [
      {
        enemies: ['boss'],
        spawnInterval: 0.25,
        startDelay: 0,
        healthMultiplier: 2,
        speedMultiplier: 1.5,
        bonus: 73,
      },
      {
        enemies: ['basic', 'fast'],
        spawnInterval: 0.1,
        healthMultiplier: 1,
        speedMultiplier: 1,
        bonus: 19,
      },
    ],
    ...overrides,
  };
}

test('every registered map and level validates and resolves', () => {
  for (const map of Object.values(MAPS)) assert.equal(validateMap(map), map);
  for (const level of LEVELS) {
    validateLevel(level, MAPS);
    const resolved = resolveLevel(level.id);
    assert.equal(resolved.map, MAPS[level.mapId]);
    assert.equal(resolved.waves.length, level.waves.length);
  }
  assert.throws(() => resolveLevel('missing-map'), /Unknown level/);
});

test('a new map controls geometry, obstacles, landmarks, and theme without engine changes', () => {
  const map = new GameMap(testMap);
  assert.deepEqual(map.grid, { cols: 10, rows: 8, cell: 40, width: 400, height: 320 });
  assert.equal(map.buildable(1, 1, []), false);
  assert.equal(map.buildable(3, 2, []), false);
  assert.equal(map.buildable(0, 0, []), true);
  assert.equal(map.buildable(10, 0, []), false);
  assert.equal(map.buildable(0.5, 0, []), false);
  assert.deepEqual(map.entrance, { x: 140, y: 16 });
  assert.deepEqual(map.base, { x: 340, y: 290 });
  assert.deepEqual(map.position(map.length), { x: 340, y: 340 });
  assert.equal(map.theme.grass, '#665544');
  assert.ok(map.theme.path);
});

test('a registered level loads custom rules, scaling and waves, then restarts on the same map', () => {
  MAPS[testMap.id] = testMap;
  const definition = testLevel();
  LEVELS.push(definition);
  try {
    const game = Object.create(Game.prototype);
    game.storage = { record() {} };
    game.audio = { play() {}, unlock() {} };
    game.reset(definition.id);
    game.state = 'playing';
    assert.equal(game.gold, 350);
    assert.equal(game.lives, 9);
    assert.equal(game.waves.count, 2);
    game.chooseTower('archer');
    game.interact(0, 0);
    assert.equal(game.gold, 300);
    assert.equal(game.towers[0].x, 20);
    assert.equal(game.towers[0].y, 20);
    game.startWave();
    assert.equal(game.waves.hasBoss, true); // Boss on wave 1, not a hardcoded fifth wave.
    game.update(0.01);
    assert.equal(game.enemies.length, 1);
    const boss = game.enemies[0];
    assert.equal(boss.maxHealth, ENEMIES.boss.health * 2);
    assert.equal(boss.speed, ENEMIES.boss.speed * 1.5);
    boss.damage(1e9, game);
    game.update(0.01);
    assert.equal(game.waves.lastBonus, 73);
    assert.equal(game.waves.breakRemaining, 0.75);
    assert.equal(game.state, 'playing');
    game.update(0.76);
    game.startWave();
    game.update(1);
    assert.equal(game.enemies.length, 2);
    for (const enemy of game.enemies) enemy.damage(1e9, game);
    game.update(0.01);
    assert.equal(game.state, 'victory'); // Custom final wave is wave 2.
    assert.equal(game.waves.lastBonus, 19);
    game.play();
    assert.equal(game.level.id, definition.id);
    assert.equal(game.map.definition.id, testMap.id);
    assert.equal(game.gold, 350);
    assert.equal(game.lives, 9);
    assert.equal(game.waves.current, 0);
    assert.equal(game.towers.length, 0);
    assert.deepEqual(definition.waves[0].enemies, ['boss']);
    game.reset('woodland-pass');
    assert.equal(game.waves.count, 20);
    assert.equal(game.map.grid.cell, 48);
    assert.equal(game.gold, 200);
  } finally {
    LEVELS.pop();
    delete MAPS[testMap.id];
  }
});

test('independent wave managers never consume or mutate shared level content', () => {
  const level = testLevel();
  const a = new Waves(level),
    b = new Waves(level);
  a.start();
  a.queue.shift();
  b.start();
  assert.deepEqual(b.queue, ['boss']);
  const copy = wavePlan(2, level);
  copy.pop();
  assert.equal(level.waves[1].enemies.length, 2);
  assert.throws(() => wavePlan(3, level), RangeError);
});

test('classic preset overrides produce a valid reusable schedule', () => {
  const waves = createClassicWaves({ count: 6, baseCount: 4, bossEvery: 3, healthGrowth: 1.2 });
  validateLevel(testLevel({ waves }), { [testMap.id]: testMap });
  assert.equal(waves.length, 6);
  assert.equal(waves[0].enemies.length, 4);
  assert.equal(waves[2].enemies.includes('boss'), true);
  assert.equal(waves[4].enemies.includes('boss'), false);
  assert.equal(waves[5].enemies.includes('boss'), true);
  assert.equal(waves[5].healthMultiplier, 1.2 ** 5);
});

test('content validation catches broken map and level definitions before gameplay', () => {
  assert.throws(
    () =>
      validateMap({
        ...testMap,
        path: [
          [-1, 1],
          [3, 3],
          [10, 3],
        ],
      }),
    /horizontal or vertical/,
  );
  assert.throws(
    () =>
      validateMap({
        ...testMap,
        path: [
          [0, 0],
          [10, 0],
        ],
      }),
    /endpoints/,
  );
  assert.throws(() => validateMap({ ...testMap, blockedCells: [[3, 2]] }), /overlap/);
  assert.throws(() => validateMap({ ...testMap, grid: { cols: 0, rows: 8, cell: 40 } }), /grid/);
  assert.throws(() => validateLevel(testLevel(), {}), /unknown map/);
  assert.throws(
    () => validateLevel(testLevel({ waves: [] }), { [testMap.id]: testMap }),
    /at least one wave/,
  );
  const level = testLevel();
  level.waves[0].enemies = ['typo'];
  assert.throws(() => validateLevel(level, { [testMap.id]: testMap }), /unknown enemy/);
  level.waves[0].enemies = ['basic'];
  level.waves[0].spawnInterval = 0;
  assert.throws(() => validateLevel(level, { [testMap.id]: testMap }), /positive spawnInterval/);
});
