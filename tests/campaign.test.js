import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/game.js';
import { LEVELS, MAPS } from '../js/content/index.js';
import { campaignLevel, campaignWaveCount, validCheckpoint } from '../js/campaign.js';
import { Storage } from '../js/effects.js';
import { prepareDefense, clearWave } from './helpers/defense.js';

function makeGame() {
  const game = Object.create(Game.prototype);
  game.storage = {
    saved: null,
    record() {},
    saveCampaign(value) {
      this.saved = value ? structuredClone(value) : null;
    },
  };
  game.audio = { play() {}, unlock() {} };
  return game;
}

test('four distinct playable maps each have twenty waves and four bosses', () => {
  assert.equal(LEVELS.length, 4);
  assert.equal(Object.keys(MAPS).length, 4);
  const paths = new Set();
  for (const level of LEVELS) {
    assert.equal(level.waves.length, 20);
    paths.add(JSON.stringify(MAPS[level.mapId].path));
    const types = new Set(level.waves.flatMap((wave) => wave.enemies));
    assert.equal(types.size, 6);
    assert.deepEqual(
      level.waves.flatMap((wave, i) => (wave.enemies.includes('boss') ? [i + 1] : [])),
      [5, 10, 15, 20],
    );
  }
  assert.equal(paths.size, 4);
});

for (const level of LEVELS.slice(1)) {
  test(`${level.name} is winnable in practice using only 200 starting gold and earned rewards`, () => {
    const game = makeGame();
    game.reset(level.id);
    game.state = 'playing';
    for (let wave = 1; wave <= 20; wave++) {
      prepareDefense(game);
      assert.ok(game.gold >= 0);
      clearWave(game);
      assert.equal(game.waves.active, false);
      assert.equal(game.lives, 20, `wave ${wave}`);
    }
    assert.equal(game.state, 'victory');
  });
}

test('campaign difficulty increases on every wave, including all map boundaries', () => {
  assert.equal(campaignWaveCount(), 80);
  let previous = null;
  for (let map = 0; map < LEVELS.length; map++) {
    const level = campaignLevel(map);
    assert.equal(level.waveOffset, map * 20);
    for (const wave of level.waves) {
      if (previous) {
        assert.ok(wave.healthMultiplier > previous.healthMultiplier);
        assert.ok(wave.speedMultiplier > previous.speedMultiplier);
        assert.ok(wave.spawnInterval < previous.spawnInterval);
        assert.ok(wave.enemies.length >= previous.enemies.length - 1); // A boss adds one enemy.
        assert.ok(wave.bonus > previous.bonus);
      }
      previous = wave;
    }
  }
  assert.throws(() => campaignLevel(4), RangeError);
});

test('map transition carries all resources, packs towers at full cost, and cannot pay twice', () => {
  const game = makeGame();
  game.startCampaign();
  assert.equal(game.advanceCampaign(), false);
  game.chooseTower('archer');
  game.interact(3, 4);
  game.selected = game.towers[0];
  game.upgrade();
  game.earn(123);
  game.lives = 17;
  game.score = 1234;
  game.stats.defeated = 3;
  const stats = { ...game.stats };
  game.waves.current = 20;
  game.finish(true);
  assert.equal(game.storage.saved.index, 1);
  assert.equal(game.storage.saved.gold, 323); // 200 + 123; no loss of tower investment.
  assert.equal(game.advanceCampaign(), true);
  assert.equal(game.campaign.index, 1);
  assert.equal(game.gold, 323);
  assert.equal(game.lives, 17);
  assert.equal(game.score, 1234);
  assert.deepEqual(game.stats, stats);
  assert.equal(game.towers.length, 0);
  assert.equal(game.enemies.length, 0);
  assert.equal(game.projectiles.length, 0);
  assert.equal(game.waves.current, 0);
  assert.equal(game.globalWave, 20);
  assert.equal(game.advanceCampaign(), false);
  assert.equal(game.gold, 323);
  game.earn(500);
  game.lives = 1;
  game.restartRun();
  assert.equal(game.gold, 323);
  assert.equal(game.lives, 17);
  assert.equal(game.score, 1234);
  assert.deepEqual(game.stats, stats);
  assert.equal(game.campaign.index, 1);
});

test('saved campaign resumes with the same resources; defeat retries checkpoint; final victory clears it', () => {
  const game = makeGame();
  game.startCampaign();
  game.earn(100);
  game.finish(true);
  const checkpoint = game.storage.saved;
  assert.equal(validCheckpoint(checkpoint), true);
  const restored = makeGame();
  assert.equal(restored.startCampaign(checkpoint), true);
  assert.equal(restored.gold, 300);
  assert.equal(restored.campaign.index, 1);
  restored.lives = 0;
  restored.finish(false);
  assert.equal(restored.advanceCampaign(), false);
  restored.restartRun();
  assert.equal(restored.gold, 300);
  assert.equal(restored.lives, 20);
  const final = { ...checkpoint, index: 3, levelId: LEVELS[3].id };
  restored.startCampaign(final);
  restored.finish(true);
  assert.equal(restored.storage.saved, null);
  assert.equal(restored.nextCampaignMap, null);
  assert.equal(restored.advanceCampaign(), false);
  for (const broken of [
    null,
    {},
    { ...checkpoint, index: 10 },
    { ...checkpoint, gold: -1 },
    { ...checkpoint, lives: 0 },
    { ...checkpoint, levelId: 'typo' },
    { ...checkpoint, score: NaN },
  ]) {
    assert.equal(validCheckpoint(broken), false);
  }
});

test('campaign checkpoints round-trip through storage, and blocked storage is handled', () => {
  const original = globalThis.localStorage;
  const entries = new Map();
  try {
    globalThis.localStorage = {
      getItem: (key) => entries.get(key) ?? null,
      setItem: (key, value) => entries.set(key, value),
      removeItem: (key) => entries.delete(key),
    };
    const storage = new Storage();
    const game = makeGame();
    game.startCampaign();
    const checkpoint = game.campaign.checkpoint;
    storage.saveCampaign(checkpoint);
    assert.deepEqual(storage.loadCampaign(), checkpoint);
    storage.saveCampaign(null);
    assert.equal(storage.loadCampaign(), null);
    globalThis.localStorage = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      },
      removeItem() {
        throw new Error('blocked');
      },
    };
    assert.equal(storage.loadCampaign(), null);
    assert.doesNotThrow(() => storage.saveCampaign(checkpoint));
    assert.doesNotThrow(() => storage.saveCampaign(null));
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
});

test('the full eighty-wave campaign is winnable without adding gold or lives', () => {
  const game = makeGame();
  game.startCampaign();
  for (let map = 0; map < LEVELS.length; map++) {
    for (let wave = 1; wave <= 20; wave++) {
      prepareDefense(game, true);
      assert.ok(game.gold >= 0);
      clearWave(game);
      assert.equal(game.waves.active, false, `map ${map + 1} wave ${wave} finishes`);
      assert.equal(game.lives, 20, `map ${map + 1} wave ${wave} defended`);
    }
    assert.equal(game.state, 'victory');
    assert.equal(game.globalWave, (map + 1) * 20);
    if (map < LEVELS.length - 1) assert.equal(game.advanceCampaign(), true);
  }
  assert.equal(game.campaign.index, 3);
  assert.equal(game.storage.saved, null);
});
