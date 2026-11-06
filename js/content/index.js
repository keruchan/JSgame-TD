import { RULES } from '../config/rules.js';
import { TOWERS } from '../config/towers.js';
import { ENEMIES } from '../config/enemies.js';
import { validateUnits } from '../config/validate.js';
import { MAPS } from './maps/index.js';
import { LEVELS, DEFAULT_LEVEL } from './levels/index.js';
import { validateLevel, validateMap } from './validate.js';
import { circleLabyrinth } from './maps/circle-labyrinth.js';
import { circleLabyrinthLevel } from './levels/circle-labyrinth.js';

export const CIRCLE_LEVEL = circleLabyrinthLevel;
const allMaps = { ...MAPS, [circleLabyrinth.id]: circleLabyrinth };

// Fail early with an author-facing message rather than during a wave.
validateUnits(TOWERS, ENEMIES);
for (const [id, map] of Object.entries(allMaps)) {
  validateMap(map);
  if (id !== map.id) throw new Error(`Map registry key "${id}" must match map ID "${map.id}"`);
}
const ids = new Set();
for (const level of LEVELS) {
  if (ids.has(level.id)) throw new Error(`Duplicate level ID: ${level.id}`);
  ids.add(level.id);
  validateLevel(level, MAPS);
}
validateLevel(CIRCLE_LEVEL, allMaps);

export { LEVELS, DEFAULT_LEVEL, MAPS };

export function resolveLevel(id = DEFAULT_LEVEL.id) {
  const maps = { ...MAPS, [circleLabyrinth.id]: circleLabyrinth };
  const definition =
    typeof id === 'object'
      ? validateLevel(id, maps)
      : [...LEVELS, CIRCLE_LEVEL].find((level) => level.id === id);
  if (!definition) throw new Error(`Unknown level: ${id}`);
  return { ...definition, rules: { ...RULES, ...definition.rules }, map: maps[definition.mapId] };
}
