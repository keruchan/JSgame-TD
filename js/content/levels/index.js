import { woodlandPassLevel } from './woodland-pass.js';
import { riverCrossingLevel } from './river-crossing.js';
import { emberCanyonLevel } from './ember-canyon.js';
import { frostfallPassLevel } from './frostfall-pass.js';

// Registry order is the order of the level picker. Add new levels here.
export const LEVELS = [woodlandPassLevel, riverCrossingLevel, emberCanyonLevel, frostfallPassLevel];
export const DEFAULT_LEVEL = woodlandPassLevel;
