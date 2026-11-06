import { TOWERS } from '../../js/config.js';

export const DEFENSE_PLANS = {
  'woodland-pass': [
    ['archer', 3, 4],
    ['archer', 5, 5],
    ['archer', 8, 7],
    ['archer', 10, 4],
    ['frost', 8, 5],
    ['cannon', 5, 7],
    ['sniper', 11, 5],
    ['sniper', 12, 6],
    ['machine', 13, 8],
    ['cannon', 13, 3],
    ['frost', 15, 7],
    ['sniper', 11, 8],
  ],
  'river-crossing': [
    ['archer', 3, 3],
    ['archer', 8, 3],
    ['archer', 11, 3],
    ['archer', 10, 5],
    ['frost', 8, 5],
    ['cannon', 5, 5],
    ['sniper', 7, 7],
    ['sniper', 11, 8],
    ['machine', 5, 8],
    ['cannon', 13, 7],
    ['frost', 14, 8],
    ['sniper', 9, 10],
  ],
  'ember-canyon': [
    ['archer', 4, 7],
    ['archer', 5, 3],
    ['archer', 7, 5],
    ['archer', 9, 7],
    ['frost', 5, 7],
    ['cannon', 4, 3],
    ['sniper', 10, 5],
    ['sniper', 11, 6],
    ['machine', 12, 5],
    ['cannon', 12, 7],
    ['frost', 14, 5],
    ['sniper', 7, 9],
  ],
  'frostfall-pass': [
    ['archer', 4, 4],
    ['archer', 6, 7],
    ['archer', 10, 8],
    ['archer', 12, 5],
    ['frost', 10, 6],
    ['cannon', 6, 8],
    ['sniper', 13, 5],
    ['sniper', 13, 3],
    ['machine', 15, 4],
    ['cannon', 12, 3],
    ['frost', 15, 6],
    ['sniper', 8, 8],
  ],
};

export function prepareDefense(game, expand = false) {
  const plan = DEFENSE_PLANS[game.level.id];
  for (const [type, col, row] of plan) {
    if (game.towers.some((tower) => tower.col === col && tower.row === row)) continue;
    if (game.gold < TOWERS[type].cost) break;
    if (!game.map.buildable(col, row, game.towers))
      throw new Error(`Invalid defense tile: ${game.level.id} ${col},${row}`);
    game.buildType = null;
    game.chooseTower(type);
    game.interact(col, row);
  }
  const priority = ['sniper', 'cannon', 'archer', 'machine', 'frost'];
  const towers = [...game.towers].sort(
    (a, b) => a.level - b.level || priority.indexOf(a.type) - priority.indexOf(b.type),
  );
  for (const tower of towers) {
    while (tower.upgradeCost !== null && game.gold >= tower.upgradeCost) {
      game.selected = tower;
      game.upgrade();
    }
  }
  if (!expand || game.towers.length < plan.length) return;
  // Campaign reinvestment: fill strong long-range positions once the core
  // mixed defense is upgraded. Rank by how much of the path is covered.
  const candidates = [];
  const { cols, rows, cell } = game.map.grid;
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      if (!game.map.buildable(col, row, game.towers)) continue;
      const x = (col + 0.5) * cell,
        y = (row + 0.5) * cell;
      let coverage = 0;
      for (let d = 0; d < game.map.length; d += 24) {
        const p = game.map.position(d);
        if (Math.hypot(p.x - x, p.y - y) <= TOWERS.sniper.range) coverage++;
      }
      candidates.push({ col, row, coverage });
    }
  candidates.sort((a, b) => b.coverage - a.coverage);
  const fullCost = TOWERS.sniper.cost + TOWERS.sniper.upgrades.reduce((a, b) => a + b, 0);
  for (const { col, row } of candidates) {
    if (game.gold < fullCost) break;
    game.buildType = null;
    game.chooseTower('sniper');
    game.interact(col, row);
    game.selected = game.towers.at(-1);
    while (game.selected.upgradeCost !== null) game.upgrade();
  }
}

export function clearWave(game) {
  if (game.waves.breakRemaining > 0) game.update(game.waves.breakRemaining + 1 / 120);
  game.startWave();
  for (let tick = 0; tick < 240 * 120 && game.waves.active && game.state === 'playing'; tick++)
    game.update(1 / 120);
}
