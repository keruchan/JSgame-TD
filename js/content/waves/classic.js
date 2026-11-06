// Reusable wave preset. Levels can override these settings or supply their
// own hand-authored wave arrays without changing the wave engine.
export const CLASSIC_BALANCE = {
  count: 20,
  healthGrowth: 1.125,
  speedGrowth: 0.009,
  baseCount: 7,
  countGrowth: 1.45,
  spawnInterval: 0.9,
  intervalReduction: 0.024,
  minimumInterval: 0.34,
  bonusBase: 25,
  bonusGrowth: 5,
  bossEvery: 5,
  basicType: 'basic',
  bossType: 'boss',
  introductions: [
    { type: 'fast', from: 3, every: 4, offset: 1 },
    { type: 'armored', from: 4, every: 5, offset: 3 },
    { type: 'tank', from: 7, every: 7, offset: 5 },
    { type: 'regen', from: 9, every: 6, offset: 2 },
  ],
};

export function createClassicWaves(overrides = {}) {
  const settings = { ...CLASSIC_BALANCE, ...overrides };
  return Array.from({ length: settings.count }, (_, index) => {
    const wave = index + 1;
    const count = settings.baseCount + Math.floor(index * settings.countGrowth);
    const enemies = Array.from({ length: count }, (_, i) => {
      let type = settings.basicType;
      for (const rule of settings.introductions) {
        if (wave >= rule.from && i % rule.every === rule.offset) type = rule.type;
      }
      return type;
    });
    if (settings.bossEvery > 0 && wave % settings.bossEvery === 0) {
      enemies.splice(Math.floor(enemies.length * 0.55), 0, settings.bossType);
    }
    return {
      enemies,
      spawnInterval: Math.max(
        settings.minimumInterval,
        settings.spawnInterval - wave * settings.intervalReduction,
      ),
      startDelay: 0.3,
      healthMultiplier: settings.healthGrowth ** index,
      speedMultiplier: 1 + index * settings.speedGrowth,
      bonus: settings.bonusBase + wave * settings.bonusGrowth,
    };
  });
}
