// Coordinates use grid cells. Endpoints sit one cell outside the board.
// Every path segment must be horizontal or vertical.
export const woodlandPass = {
  id: 'woodland-pass',
  name: 'The Woodland Pass',
  grid: { cols: 18, rows: 12, cell: 48 },
  path: [
    [-1, 3],
    [4, 3],
    [4, 8],
    [9, 8],
    [9, 2],
    [14, 2],
    [14, 9],
    [18, 9],
  ],
  blockedCells: [],
  // Decorations use logical canvas pixels; they do not block building.
  trees: [
    [33, 35],
    [61, 49],
    [807, 32],
    [830, 48],
    [25, 525],
    [52, 546],
    [783, 547],
  ],
  theme: {
    grass: '#4a5c3e',
    grassAlternate: '#506244',
    grid: '#acbb8b0b',
    grassDetail: '#83946440',
    pathBorder: '#34462f',
    pathEdge: '#b4a27d',
    path: '#c1ae88',
    pathDetail: '#a08c6955',
    pebbles: '#d6c29970',
    obstacle: '#73765e',
  },
};
