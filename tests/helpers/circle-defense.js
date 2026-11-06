import { TOWERS } from '../../js/config.js';

// A reproducible paid strategy for balance checks, covering all three portals.
export const CIRCLE_DEFENSE_PLAN = [
  ['archer', 3, 3],
  ['archer', 20, 12],
  ['archer', 3, 13],
  ['archer', 5, 3],
  ['archer', 20, 14],
  ['archer', 3, 11],
  ['archer', 3, 4],
  ['archer', 18, 14],
  ['archer', 3, 9],
  ['archer', 7, 3],
  ['archer', 16, 14],
  ['archer', 4, 8],
  ['frost', 7, 6],
  ['cannon', 4, 6],
  ['frost', 20, 13],
  ['cannon', 17, 14],
  ['frost', 3, 8],
  ['cannon', 3, 12],
  ['sniper', 13, 9],
  ['sniper', 12, 13],
  ['machine', 14, 10],
  ['sniper', 14, 4],
];

export function prepareCircleDefense(game) {
  for (const [type, col, row] of CIRCLE_DEFENSE_PLAN) {
    if (game.towers.some((t) => t.col === col && t.row === row)) continue;
    if (game.gold < TOWERS[type].cost) break;
    if (!game.map.buildable(col, row, game.towers))
      throw new Error(`Blocked defense tile ${col},${row}`);
    game.buildType = null;
    game.chooseTower(type);
    game.interact(col, row);
  }
  const order = ['sniper', 'cannon', 'archer', 'machine', 'frost'];
  for (const tower of [...game.towers].sort(
    (a, b) => a.level - b.level || order.indexOf(a.type) - order.indexOf(b.type),
  )) {
    if (tower.upgradeCost !== null && game.gold >= tower.upgradeCost) {
      game.selected = tower;
      game.upgrade();
    }
  }
  if (game.towers.length < CIRCLE_DEFENSE_PLAN.length) return;
  const fullCost = TOWERS.sniper.cost + TOWERS.sniper.upgrades.reduce((a, b) => a + b, 0),
    cells = [];
  for (let row = 0; row < game.map.grid.rows; row++)
    for (let col = 0; col < game.map.grid.cols; col++) {
      if (!game.map.buildable(col, row, game.towers)) continue;
      const x = (col + 0.5) * 48,
        y = (row + 0.5) * 48;
      let coverage = 0;
      for (let d = 0; d < game.map.length; d += 24) {
        const p = game.map.position(d);
        if (Math.hypot(x - p.x, y - p.y) < 260) coverage++;
      }
      cells.push({ col, row, coverage });
    }
  cells.sort((a, b) => b.coverage - a.coverage);
  for (const { col, row } of cells) {
    if (game.gold < fullCost) break;
    game.buildType = null;
    game.chooseTower('sniper');
    game.interact(col, row);
    game.selected = game.towers.at(-1);
    while (game.selected.upgradeCost !== null) game.upgrade();
  }
}
