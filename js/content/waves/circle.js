import { CIRCLE_BALANCE as B } from '../../config/circle.js';

export function createCircleStages(overrides = {}) {
  const settings = { ...B, ...overrides };
  return Array.from({ length: settings.stages }, (_, index) => {
    const stage = index + 1;
    const count = settings.baseCount + index * settings.countGrowth;
    const enemies = Array.from({ length: count }, (_, i) => {
      let type = 'basic';
      if (stage >= 2 && i % 5 === 1) type = 'fast';
      if (stage >= 3 && i % 7 === 3) type = 'armored';
      if (stage >= 5 && i % 13 === 6) type = 'tank';
      if (stage >= 6 && i % 9 === 4) type = 'regen';
      return type;
    });
    // Three bosses replace regular spawns, one for each portal.
    if (stage % 5 === 0) enemies.splice(60, 3, 'boss', 'boss', 'boss');
    return {
      enemies,
      spawnInterval: Math.max(
        settings.minimumInterval,
        settings.spawnInterval - index * settings.intervalReduction,
      ),
      startDelay: 0.5,
      healthMultiplier: settings.healthBase * settings.healthGrowth ** index,
      speedMultiplier: 1 + index * settings.speedGrowth,
      bonus: settings.bonusBase + stage * settings.bonusGrowth,
    };
  });
}
