import { createClassicWaves } from '../waves/classic.js';

const waveSettings = {
  count: 20,
  introductions: [
    { type: 'fast', from: 2, every: 4, offset: 1 },
    { type: 'armored', from: 4, every: 5, offset: 3 },
    { type: 'tank', from: 7, every: 7, offset: 5 },
    { type: 'regen', from: 8, every: 6, offset: 2 },
  ],
};

export const riverCrossingLevel = {
  id: 'river-crossing',
  name: 'River Crossing',
  mapId: 'river-crossing',
  difficulty: 'Standard',
  description:
    'Guard a winding road through the river lowlands. Cover both sides of the long switchback and intercept runners before the final crossing.',
  rules: { startingGold: 200, startingLives: 20, breakTime: 4 },
  waveSettings,
  waves: createClassicWaves(waveSettings),
};
