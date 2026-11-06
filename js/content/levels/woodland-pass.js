import { createClassicWaves } from '../waves/classic.js';

// A level pairs a map with resources, presentation, and a wave schedule.
// Multiple levels can reuse the same map with different waves or resources.
export const woodlandPassLevel = {
  id: 'woodland-pass',
  name: 'The Woodland Pass',
  mapId: 'woodland-pass',
  difficulty: 'Classic',
  description:
    'Build your defenses along the winding pass. Combine five towers, plan your upgrades, and hold the line.',
  rules: { startingGold: 200, startingLives: 20, breakTime: 4 },
  waveSettings: { count: 20 },
  waves: createClassicWaves(),
};
