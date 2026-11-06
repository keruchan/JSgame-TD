import { createClassicWaves } from '../waves/classic.js';

const waveSettings = {
  count: 20,
  healthGrowth: 1.13,
  introductions: [
    { type: 'fast', from: 3, every: 5, offset: 1 },
    { type: 'armored', from: 3, every: 4, offset: 3 },
    { type: 'tank', from: 6, every: 6, offset: 5 },
    { type: 'regen', from: 9, every: 7, offset: 2 },
  ],
};

export const emberCanyonLevel = {
  id: 'ember-canyon',
  name: 'Ember Canyon',
  mapId: 'ember-canyon',
  difficulty: 'Hard',
  description:
    'Hold the narrow canyon road against an armored assault. Use the tight bends for splash damage and invest in snipers before the heavy waves arrive.',
  rules: { startingGold: 200, startingLives: 20, breakTime: 4 },
  waveSettings,
  waves: createClassicWaves(waveSettings),
};
