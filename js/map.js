import { DEFAULT_MAP } from './content/maps/index.js';
import { validateMap } from './content/validate.js';
export class GameMap {
  constructor(definition = DEFAULT_MAP) {
    validateMap(definition);
    this.definition = definition;
    this.loop = definition.loop === true;
    const { cols, rows, cell } = definition.grid;
    this.grid = { cols, rows, cell, width: cols * cell, height: rows * cell };
    this.theme = { ...DEFAULT_MAP.theme, ...definition.theme };
    this.blockedCells = new Set((definition.blockedCells ?? []).map((point) => point.join(',')));
    const turns = definition.path,
      GRID = this.grid;
    this.points = turns.map(([x, y]) => ({ x: (x + 0.5) * GRID.cell, y: (y + 0.5) * GRID.cell }));
    this.pathCells = new Set();
    this.segments = [];
    this.length = 0;
    for (let i = 1; i < turns.length; i++) {
      const [ax, ay] = turns[i - 1],
        [bx, by] = turns[i];
      const steps = Math.abs(bx - ax) + Math.abs(by - ay);
      for (let k = 0; k <= steps; k++)
        this.pathCells.add(`${ax + Math.sign(bx - ax) * k},${ay + Math.sign(by - ay) * k}`);
      const a = this.points[i - 1],
        b = this.points[i],
        length = Math.hypot(b.x - a.x, b.y - a.y);
      this.segments.push({ a, b, length, start: this.length });
      this.length += length;
    }
    this.portals = (definition.portals ?? []).map((portal) => ({
      ...portal,
      distance: this.segments[portal.pathIndex].start,
      ...this.points[portal.pathIndex],
    }));
  }

  position(distance) {
    if (this.loop) distance = ((distance % this.length) + this.length) % this.length;
    for (const s of this.segments)
      if (distance <= s.start + s.length) {
        const t = Math.max(0, (distance - s.start) / s.length);
        return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t };
      }
    return { ...this.points.at(-1) };
  }

  buildable(col, row, towers) {
    const { cols, rows } = this.grid;
    return (
      Number.isInteger(col) &&
      Number.isInteger(row) &&
      col >= 0 &&
      col < cols &&
      row >= 0 &&
      row < rows &&
      !this.pathCells.has(`${col},${row}`) &&
      !this.blockedCells.has(`${col},${row}`) &&
      !towers.some((t) => t.col === col && t.row === row)
    );
  }

  get entrance() {
    return this.landmark(this.points[0], 16);
  }

  get base() {
    return this.landmark(this.points.at(-1), 30);
  }

  landmark(point, margin) {
    return {
      x: Math.max(margin, Math.min(this.grid.width - margin, point.x)),
      y: Math.max(margin, Math.min(this.grid.height - margin, point.y)),
    };
  }

  draw(ctx) {
    const GRID = this.grid,
      cell = GRID.cell,
      theme = this.theme;
    ctx.lineWidth = 1;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.fillStyle = theme.grass;
    ctx.fillRect(0, 0, GRID.width, GRID.height);
    for (let y = 0; y < GRID.rows; y++)
      for (let x = 0; x < GRID.cols; x++) {
        if ((x * 17 + y * 13) % 7 === 0) {
          ctx.fillStyle = theme.grassAlternate;
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
        ctx.strokeStyle = theme.grid;
        ctx.strokeRect(x * cell + 0.5, y * cell + 0.5, cell, cell);
        if (!this.pathCells.has(`${x},${y}`)) {
          const n = (x * 31 + y * 19) % 11;
          if (n < 4) {
            const px = x * cell + cell * 0.25 + n * cell * 0.145,
              py = y * cell + cell * 0.375 + (n * cell) / 12;
            ctx.strokeStyle = theme.grassDetail;
            ctx.beginPath();
            ctx.moveTo(px - 3, py);
            ctx.lineTo(px, py - 6);
            ctx.lineTo(px + 2, py);
            ctx.moveTo(px + 3, py);
            ctx.lineTo(px + 6, py - 4);
            ctx.stroke();
          }
        }
      }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const path = () => {
      ctx.beginPath();
      this.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    };
    path();
    ctx.strokeStyle = theme.pathBorder;
    ctx.lineWidth = cell + 8;
    ctx.stroke();
    path();
    ctx.strokeStyle = theme.pathEdge;
    ctx.lineWidth = cell - 1;
    ctx.stroke();
    path();
    ctx.strokeStyle = theme.path;
    ctx.lineWidth = cell - 9;
    ctx.stroke();
    ctx.save();
    ctx.setLineDash([3, 14]);
    path();
    ctx.strokeStyle = theme.pathDetail;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    for (let i = 75; i < this.length - 60; i += 160) {
      const p = this.position(i);
      ctx.fillStyle = theme.pebbles;
      ctx.beginPath();
      ctx.ellipse(p.x + 9, p.y + 10, 2, 1, 0, 0, 7);
      ctx.fill();
    }
    for (const key of this.blockedCells) {
      const [col, row] = key.split(',').map(Number);
      ctx.fillStyle = theme.obstacle;
      ctx.beginPath();
      ctx.roundRect(col * cell + 8, row * cell + 10, cell - 16, cell - 20, 6);
      ctx.fill();
    }
    if (this.loop) this.drawPortals(ctx);
    else {
      this.drawEntrance(ctx);
      this.drawBase(ctx);
    }
    // Hand-planted groves sit in the margins, away from the build grid.
    (this.definition.trees ?? []).forEach(([x, y], i) => {
      ctx.fillStyle = '#293d2d66';
      ctx.beginPath();
      ctx.ellipse(x + 3, y + 12, 15, 7, 0, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#384c32';
      ctx.beginPath();
      ctx.moveTo(x, y - 20);
      ctx.lineTo(x - 15, y + 9);
      ctx.lineTo(x + 15, y + 9);
      ctx.fill();
      ctx.fillStyle = i % 2 ? '#64754b' : '#576d44';
      ctx.beginPath();
      ctx.moveTo(x, y - 25);
      ctx.lineTo(x - 12, y);
      ctx.lineTo(x + 12, y);
      ctx.fill();
    });
  }

  drawEntrance(ctx) {
    const { x, y } = this.entrance;
    ctx.fillStyle = '#e6d8b2';
    ctx.font = 'bold 9px Segoe UI';
    ctx.fillText('IN', x - 3, y + 5);
    ctx.fillStyle = '#718254';
    ctx.fillRect(x - 2, y - 38, 3, 23);
    ctx.fillStyle = '#d0b48a';
    ctx.beginPath();
    ctx.moveTo(x + 1, y - 38);
    ctx.lineTo(x + 19, y - 33);
    ctx.lineTo(x + 1, y - 27);
    ctx.fill();
  }

  drawPortals(ctx) {
    for (const [index, portal] of this.portals.entries()) {
      ctx.save();
      ctx.translate(portal.x, portal.y);
      ctx.fillStyle = '#253c35';
      ctx.strokeStyle = portal.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 17, 23, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 16, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = 'bold 10px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillStyle = portal.color;
      ctx.fillText(String.fromCharCode(65 + index), 0, 4);
      ctx.fillText(portal.name.toUpperCase(), 0, -31);
      ctx.restore();
    }
  }

  drawBase(ctx) {
    const { x, y } = this.base;
    ctx.fillStyle = '#30422d77';
    ctx.beginPath();
    ctx.ellipse(x, y + 9, 26, 14, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#a8ae8a';
    ctx.fillRect(x - 17, y - 17, 34, 30);
    ctx.fillStyle = '#d5d2ac';
    ctx.fillRect(x - 21, y - 23, 42, 10);
    for (let i = 0; i < 4; i++) ctx.fillRect(x - 21 + i * 11, y - 30, 8, 9);
    ctx.fillStyle = '#3b4b32';
    ctx.fillRect(x - 5, y - 2, 10, 15);
    ctx.fillStyle = '#c3d58c';
    ctx.fillRect(x - 1, y - 50, 2, 20);
    ctx.beginPath();
    ctx.moveTo(x + 1, y - 50);
    ctx.lineTo(x + 19, y - 44);
    ctx.lineTo(x + 1, y - 39);
    ctx.fill();
  }
}
