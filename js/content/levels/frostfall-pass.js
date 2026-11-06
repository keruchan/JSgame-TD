import { createClassicWaves } from '../waves/classic.js';

const waveSettings = {
  count: 20,
  spawnInterval: 0.85,
  introductions: [
    { type: 'fast', from: 2, every: 3, offset: 1 },
    { type: 'armored', from: 4, every: 5, offset: 3 },
    { type: 'tank', from: 7, every: 7, offset: 5 },
    { type: 'regen', from: 6, every: 6, offset: 2 },
  ],
};

export const frostfallPassLevel = {
  id: 'frostfall-pass',
  name: 'Frostfall Pass',
  mapId: 'frostfall-pass',
  difficulty: 'Tactical',
  description:
    'Defend a frozen mountain trail with little room for mistakes. Slow the fast vanguard and concentrate fire on regenerating enemies at the central bends.',
  rules: { startingGold: 200, startingLives: 20, breakTime: 4 },
  waveSettings,
  waves: createClassicWaves(waveSettings),
};
