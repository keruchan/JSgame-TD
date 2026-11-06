import { ENEMIES } from '../config/enemies.js';

function requireContent(condition, message) {
  if (!condition) throw new Error(`Invalid game content: ${message}`);
}

export function validateMap(map) {
  const label = `map "${map?.id ?? 'unknown'}"`;
  requireContent(typeof map?.id === 'string' && map.id.length > 0, `${label} needs an ID`);
  requireContent(typeof map.name === 'string' && map.name.length > 0, `${label} needs a name`);
  const { cols, rows, cell } = map.grid ?? {};
  requireContent(
    Number.isInteger(cols) &&
      cols >= 2 &&
      Number.isInteger(rows) &&
      rows >= 2 &&
      Number.isFinite(cell) &&
      cell >= 40,
    `${label} grid needs integer cols/rows >= 2 and cell >= 40`,
  );
  requireContent(
    Array.isArray(map.path) && map.path.length >= 2,
    `${label} needs at least two path points`,
  );
  requireContent(
    map.blockedCells === undefined || Array.isArray(map.blockedCells),
    `${label} blockedCells must be an array`,
  );
  requireContent(
    map.trees === undefined || Array.isArray(map.trees),
    `${label} trees must be an array`,
  );
  const validPoint = (point) =>
    Array.isArray(point) && point.length === 2 && point.every(Number.isInteger);
  const inside = ([x, y]) => x >= 0 && x < cols && y >= 0 && y < rows;
  const justOutside = ([x, y]) =>
    ((x === -1 || x === cols) && y >= 0 && y < rows) ||
    ((y === -1 || y === rows) && x >= 0 && x < cols);
  const pathCells = new Set();
  if (map.loop) {
    requireContent(
      map.path.length >= 5 && map.path[0].join(',') === map.path.at(-1).join(','),
      `${label} loop must close on its first point`,
    );
    requireContent(
      Array.isArray(map.portals) && map.portals.length === 3,
      `${label} loop needs three portals`,
    );
    requireContent(
      new Set(map.portals.map((portal) => portal.pathIndex)).size === 3,
      `${label} portal positions must be distinct`,
    );
    for (const portal of map.portals)
      requireContent(
        Number.isInteger(portal.pathIndex) &&
          portal.pathIndex >= 0 &&
          portal.pathIndex < map.path.length - 1 &&
          typeof portal.name === 'string' &&
          typeof portal.color === 'string',
        `${label} has an invalid portal`,
      );
  }
  map.path.forEach((point, index) => {
    requireContent(validPoint(point), `${label} path point ${index} must be an integer [col, row]`);
    requireContent(
      map.loop
        ? inside(point)
        : index === 0 || index === map.path.length - 1
          ? justOutside(point)
          : inside(point),
      `${label} endpoints must be one cell outside the board and intermediate points must be inside`,
    );
    if (index === 0) return;
    const [ax, ay] = map.path[index - 1],
      [bx, by] = point;
    requireContent(
      (ax === bx) !== (ay === by),
      `${label} segment ${index} must be nonzero and horizontal or vertical`,
    );
    const length = Math.abs(bx - ax) + Math.abs(by - ay);
    for (let i = 0; i <= length; i++)
      pathCells.add(`${ax + Math.sign(bx - ax) * i},${ay + Math.sign(by - ay) * i}`);
  });
  for (const point of map.blockedCells ?? []) {
    requireContent(
      validPoint(point) && inside(point),
      `${label} blocked cells must be inside the board`,
    );
    requireContent(
      !pathCells.has(point.join(',')),
      `${label} blocked cells cannot overlap its path`,
    );
  }
  for (const point of map.trees ?? []) {
    requireContent(
      Array.isArray(point) && point.length === 2 && point.every(Number.isFinite),
      `${label} trees need pixel [x, y] coordinates`,
    );
  }
  return map;
}

export function validateLevel(level, maps) {
  const label = `level "${level?.id ?? 'unknown'}"`;
  requireContent(typeof level?.id === 'string' && level.id.length > 0, `${label} needs an ID`);
  requireContent(typeof level.name === 'string' && level.name.length > 0, `${label} needs a name`);
  requireContent(
    Object.hasOwn(maps, level.mapId),
    `${label} references unknown map "${level.mapId}"`,
  );
  requireContent(
    Array.isArray(level.waves) && level.waves.length > 0,
    `${label} needs at least one wave`,
  );
  if (level.mode === 'circle') {
    requireContent(maps[level.mapId].loop === true, `${label} Circle Defense needs a looping map`);
    requireContent(
      Number.isInteger(level.rules?.populationLimit) && level.rules.populationLimit > 0,
      `${label} needs a positive populationLimit`,
    );
  }
  for (const key of ['startingGold', 'startingLives', 'breakTime']) {
    const value = level.rules?.[key];
    if (value !== undefined)
      requireContent(
        Number.isFinite(value) &&
          value >= (key === 'startingLives' ? 1 : 0) &&
          (key === 'breakTime' || Number.isInteger(value)),
        `${label} has invalid ${key}`,
      );
  }
  level.waves.forEach((wave, index) => {
    const name = `${label} wave ${index + 1}`;
    requireContent(Array.isArray(wave.enemies) && wave.enemies.length > 0, `${name} needs enemies`);
    requireContent(
      wave.enemies.every((type) => Object.hasOwn(ENEMIES, type)),
      `${name} contains an unknown enemy type`,
    );
    for (const key of ['spawnInterval', 'healthMultiplier', 'speedMultiplier']) {
      requireContent(
        Number.isFinite(wave[key]) && wave[key] > 0,
        `${name} needs a positive ${key}`,
      );
    }
    requireContent(
      Number.isInteger(wave.bonus) && wave.bonus >= 0,
      `${name} needs a nonnegative integer bonus`,
    );
    requireContent(
      wave.startDelay === undefined || (Number.isFinite(wave.startDelay) && wave.startDelay >= 0),
      `${name} has invalid startDelay`,
    );
  });
  return level;
}
