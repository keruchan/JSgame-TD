// Circle Defense balance. The cap is simultaneous living enemies, not stage size.
export const CIRCLE_RULES = {
  startingGold: 650,
  startingLives: 20, // Unused in Circle Defense; retained for the shared level schema.
  populationLimit: 100,
  warningAt: 80,
  breakTime: 5,
};

export const CIRCLE_BALANCE = {
  stages: 20,
  baseCount: 120,
  countGrowth: 12,
  healthBase: 0.8,
  healthGrowth: 1.18,
  speedGrowth: 0.006,
  spawnInterval: 0.24, // Combined cadence across all three portals.
  intervalReduction: 0.004,
  minimumInterval: 0.15,
  bonusBase: 65,
  bonusGrowth: 10,
  regenSuppression: 3,
};
