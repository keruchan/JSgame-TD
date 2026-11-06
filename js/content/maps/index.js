import { woodlandPass } from './woodland-pass.js';
import { riverCrossing } from './river-crossing.js';
import { emberCanyon } from './ember-canyon.js';
import { frostfallPass } from './frostfall-pass.js';

// Import and add each new map here. Levels reference these IDs.
export const MAPS = {
  [woodlandPass.id]: woodlandPass,
  [riverCrossing.id]: riverCrossing,
  [emberCanyon.id]: emberCanyon,
  [frostfallPass.id]: frostfallPass,
};
export const DEFAULT_MAP = woodlandPass;
