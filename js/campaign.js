import { LEVELS, resolveLevel } from './content/index.js';
import { createClassicWaves } from './content/waves/classic.js';
import { CAMPAIGN_BALANCE as BALANCE } from './config/campaign.js';

export const campaignWaveCount = () =>
  LEVELS.reduce((count, level) => count + level.waves.length, 0);

export function campaignLevel(index) {
  const source = LEVELS[index];
  if (!source) throw new RangeError(`Campaign map ${index + 1} does not exist`);
  const offset = LEVELS.slice(0, index).reduce((count, level) => count + level.waves.length, 0);
  const schedule = source.waveSettings
    ? createClassicWaves({ ...source.waveSettings, count: offset + source.waves.length }).slice(
        offset,
      )
    : source.waves;
  const waves = schedule.map((wave, i) => {
    const progress = offset + i;
    return {
      ...wave,
      healthMultiplier:
        (1 + progress * BALANCE.healthStep) ** 2 * (1 + index * BALANCE.mapHealthStep),
      speedMultiplier: 1 + progress * BALANCE.speedStep,
      spawnInterval: Math.max(
        BALANCE.minimumInterval,
        BALANCE.spawnInterval - (progress + 1) * BALANCE.intervalReduction,
      ),
    };
  });
  return { ...resolveLevel(source.id), waves, waveOffset: offset };
}

export function validCheckpoint(value) {
  if (!value || value.version !== 1 || !Number.isInteger(value.index) || !LEVELS[value.index])
    return false;
  if (value.levelId !== LEVELS[value.index].id) return false;
  if (
    !Number.isInteger(value.gold) ||
    value.gold < 0 ||
    !Number.isInteger(value.lives) ||
    value.lives <= 0
  )
    return false;
  if (!Number.isInteger(value.score) || value.score < 0) return false;
  if (
    value.cheats !== undefined &&
    (!value.cheats ||
      typeof value.cheats.mergeEnabled !== 'boolean' ||
      typeof value.cheats.strongEnabled !== 'boolean')
  )
    return false;
  return ['defeated', 'earned', 'built'].every(
    (key) => Number.isInteger(value.stats?.[key]) && value.stats[key] >= 0,
  );
}

export function makeCheckpoint(game, index) {
  return {
    version: 1,
    index,
    levelId: LEVELS[index].id,
    gold: game.gold,
    lives: game.lives,
    score: game.score,
    stats: { ...game.stats },
    cheats: { mergeEnabled: game.mergeEnabled, strongEnabled: game.strongEnabled },
  };
}
