import test from 'node:test';
import assert from 'node:assert/strict';
import { CheatSequence } from '../js/cheat-sequence.js';
import { Game } from '../js/game.js';
import { TOWERS, RULES } from '../js/config.js';
import { makeCheckpoint, validCheckpoint } from '../js/campaign.js';

function game() {
  const g = Object.create(Game.prototype);
  g.storage = { record() {}, recordCircle() {}, saveCampaign() {} };
  g.audio = { play() {}, unlock() {} };
  g.startCircle();
  return g;
}
function build(g, type, col, row) {
  g.buildType = null;
  g.chooseTower(type);
  g.interact(col, row);
  return g.towers.at(-1);
}

test('the exact 5 title + 1 score + 1 title gesture toggles, and interruptions reset it', () => {
  const sequence = new CheatSequence();
  for (let i = 0; i < 5; i++) assert.equal(sequence.press('title'), false);
  assert.equal(sequence.press('score'), false);
  assert.equal(sequence.press('title'), true);
  assert.equal(sequence.step, 0);
  sequence.press('title');
  sequence.press('other');
  assert.equal(sequence.step, 0);
  for (let i = 0; i < 5; i++) sequence.press('title');
  sequence.press('title');
  assert.equal(sequence.step, 1);
  sequence.press('score');
  assert.equal(sequence.step, 0);
  for (let i = 0; i < 5; i++) sequence.press('title');
  sequence.press('score');
  sequence.press('score');
  assert.equal(sequence.press('title'), false);
});

test('gold cheat sets a safe total without granting earned-gold statistics or allowing invalid input', () => {
  const g = game();
  assert.equal(g.setGold(10000), true);
  assert.equal(g.gold, 10000);
  assert.equal(g.stats.earned, 0);
  for (const amount of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '100'])
    assert.equal(g.setGold(amount), false);
  assert.equal(g.setGold(0), true);
  g.orientationBlocked = true;
  assert.equal(g.setGold(100), false);
  g.orientationBlocked = false;
  g.setGold(Number.MAX_SAFE_INTEGER);
  g.earn(8);
  assert.equal(g.gold, Number.MAX_SAFE_INTEGER);
});

test('Titan Tower is locked by default and unlocking, placing, locking and resetting are consistent', () => {
  const g = game();
  g.setGold(10000);
  assert.equal(g.availableTowerTypes.includes('titan'), false);
  g.chooseTower('titan');
  assert.equal(g.buildType, null);
  g.setCheat('strongEnabled', true);
  const titan = build(g, 'titan', 3, 3);
  assert.equal(titan.type, 'titan');
  assert.equal(g.gold, 10000 - TOWERS.titan.cost);
  g.setCheat('strongEnabled', false);
  assert.equal(g.availableTowerTypes.includes('titan'), false);
  assert.equal(g.towers[0], titan);
  assert.ok(titan.stats.damage > TOWERS.sniper.damage);
  assert.ok(titan.stats.splash > 0);
  g.startCircle();
  assert.equal(g.strongEnabled, false);
  assert.equal(g.towers.length, 0);
});

test('fusion combines matching towers without lost damage or investment and charges combined upgrades', () => {
  const g = game();
  g.setGold(10000);
  g.setCheat('mergeEnabled', true);
  const a = build(g, 'archer', 3, 3),
    b = build(g, 'archer', 5, 3),
    c = build(g, 'archer', 7, 3);
  g.interact(3, 3);
  assert.equal(g.beginMerge(), true);
  g.interact(5, 3);
  assert.equal(g.towers.length, 2);
  assert.equal(a.mergedCount, 2);
  assert.equal(a.spent, 100);
  assert.equal(a.stats.damage, TOWERS.archer.damage * 2);
  g.beginMerge();
  g.interact(7, 3);
  assert.equal(a.mergedCount, 3);
  assert.equal(a.spent, 150);
  assert.equal(g.towers.length, 1);
  const gold = g.gold;
  g.upgrade();
  assert.equal(g.gold, gold - TOWERS.archer.upgrades[0] * 3);
  assert.equal(a.level, 2);
  assert.equal(a.spent, 330);
  assert.equal(a.stats.damage, TOWERS.archer.damage * RULES.upgradeDamage * 3);
  g.setCheat('mergeEnabled', false);
  assert.equal(a.mergedCount, 3);
  const refund = a.sellValue;
  g.sell();
  assert.equal(g.gold, gold - 180 + refund);
  assert.equal(refund, 231);
});

test('fusion rejects different types/levels, active waves, and stale or same-tower selection', () => {
  const g = game();
  g.setGold(10000);
  g.setCheat('mergeEnabled', true);
  const a = build(g, 'archer', 3, 3),
    b = build(g, 'archer', 5, 3),
    c = build(g, 'cannon', 7, 3);
  g.selected = a;
  g.beginMerge();
  assert.equal(g.mergeWith(c), false);
  assert.equal(g.towers.length, 3);
  b.upgrade();
  assert.equal(g.mergeWith(b), false);
  assert.equal(g.mergeWith(a), false);
  assert.equal(g.mergeSource, null);
  g.beginMerge();
  g.interact(9, 3);
  assert.equal(g.mergeSource, null);
  assert.equal(g.selected, null);
  g.selected = a;
  g.startWave();
  assert.equal(g.beginMerge(), false);
  assert.equal(g.mergeSource, null);
});

test('portrait blocks the simulation without modifying manual pause or consuming spawns', () => {
  const g = game();
  g.startWave();
  g.update(0.6);
  const snapshot = JSON.stringify({ wave: g.waves, enemies: g.enemies, gold: g.gold });
  g.orientationBlocked = true;
  g.update(10);
  assert.equal(JSON.stringify({ wave: g.waves, enemies: g.enemies, gold: g.gold }), snapshot);
  assert.equal(g.paused, false);
  g.orientationBlocked = false;
  g.update(0.3);
  assert.ok(g.waves.spawned > 1);
  g.togglePause();
  g.orientationBlocked = true;
  g.orientationBlocked = false;
  assert.equal(g.paused, true);
});

test('developer unlocks survive campaign transfers, checkpoints and retries, while new runs reset them', () => {
  const g = game();
  g.startCampaign();
  g.setCheat('strongEnabled', true);
  g.setCheat('mergeEnabled', true);
  const checkpoint = makeCheckpoint(g, 0);
  assert.equal(validCheckpoint(checkpoint), true);
  g.restartRun();
  assert.equal(g.campaign.checkpoint.cheats.strongEnabled, true);
  assert.equal(g.campaign.checkpoint.cheats.mergeEnabled, true);
  g.finish(true);
  assert.equal(g.advanceCampaign(), true);
  assert.equal(g.strongEnabled, true);
  assert.equal(g.mergeEnabled, true);
  g.restartRun();
  assert.equal(g.strongEnabled, true);
  assert.equal(g.mergeEnabled, true);
  g.startCampaign(checkpoint);
  assert.equal(g.strongEnabled, true);
  g.startCampaign();
  assert.equal(g.strongEnabled, false);
});
