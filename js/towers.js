import { TOWERS, RULES } from './config.js';
import { DEFAULT_MAP } from './content/maps/index.js';
export class Tower {
  constructor(type, col, row, grid = DEFAULT_MAP.grid) {
    this.type = type;
    this.col = col;
    this.row = row;
    this.x = (col + 0.5) * grid.cell;
    this.y = (row + 0.5) * grid.cell;
    this.level = 1;
    this.spent = TOWERS[type].cost;
    this.cooldown = 0;
    this.angle = -Math.PI / 2;
    this.recoil = 0;
    this.priority = 'first';
    this.mergedCount = 1;
  }

  get stats() {
    const c = TOWERS[this.type],
      n = this.level - 1;
    return {
      ...c,
      damage: c.damage * RULES.upgradeDamage ** n * this.mergedCount,
      range: c.range * RULES.upgradeRange ** n,
      rate: c.rate * RULES.upgradeRate ** n,
      slowDuration: (c.slowDuration || 0) + n * 0.35,
    };
  }

  get upgradeCost() {
    const cost = TOWERS[this.type].upgrades[this.level - 1];
    return cost === undefined ? null : cost * this.mergedCount;
  }

  get sellValue() {
    const refund = this.spent * RULES.refund;
    // Avoid losing a gold when decimal multiplication produces 230.99999999999997.
    return Math.floor(refund + Number.EPSILON * Math.max(1, Math.abs(refund)));
  }

  upgrade() {
    const cost = this.upgradeCost;
    if (cost === null) return false;
    this.spent += cost;
    this.level++;
    return true;
  }

  update(dt, game) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.recoil = Math.max(0, this.recoil - dt * 5);
    const s = this.stats;
    const target = game.enemies
      .filter((e) => e.alive && Math.hypot(e.x - this.x, e.y - this.y) <= s.range)
      .reduce((best, e) => {
        if (!best) return e;
        if (this.priority === 'strongest') return e.health > best.health ? e : best;
        if (this.priority === 'weakest') return e.health < best.health ? e : best;
        const progress = (enemy) => (game.mode === 'circle' ? enemy.travelled : enemy.distance);
        return progress(e) > progress(best) ? e : best;
      }, null);
    if (target) {
      this.angle = Math.atan2(target.y - this.y, target.x - this.x);
      if (this.cooldown <= 0) {
        game.shoot(this, target, s);
        this.cooldown = 1 / s.rate;
        this.recoil = 1;
      }
    }
  }

  draw(ctx, ghost = false) {
    const c = TOWERS[this.type];
    ctx.save();
    ctx.translate(this.x, this.y);
    if (ghost) ctx.globalAlpha = 0.65;
    const visual = c.visual ?? 'archer';
    ctx.fillStyle = '#1d2e2566';
    ctx.beginPath();
    ctx.ellipse(2, 12, 20, 12, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#555f47';
    ctx.strokeStyle = '#a1a77f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-17, -16, 34, 33, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#748062';
    ctx.fillRect(-14, 9, 28, 5);
    ctx.save();
    ctx.rotate(this.angle);
    ctx.fillStyle = c.color;
    ctx.strokeStyle = '#28382b';
    ctx.lineWidth = 2;
    if (visual === 'archer') {
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, 7);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#43543a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(2, 0, 13, -1.1, 1.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(21 - this.recoil * 4, 0);
      ctx.stroke();
    }
    if (visual === 'cannon') {
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#4b5046';
      ctx.fillRect(0, -7, 23 - this.recoil * 5, 14);
      ctx.fillStyle = '#242d27';
      ctx.fillRect(17 - this.recoil * 5, -5, 6, 10);
    }
    if (visual === 'frost') {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.rect(-9, -9, 18, 18);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#e0f5e9';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(6, 0);
      ctx.moveTo(0, -6);
      ctx.lineTo(0, 6);
      ctx.stroke();
    }
    if (visual === 'sniper') {
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#473f4d';
      ctx.fillRect(-3, -3, 32 - this.recoil * 5, 6);
      ctx.fillStyle = '#dbc6e0';
      ctx.fillRect(9, -5, 8, 3);
    }
    if (visual === 'machine') {
      ctx.beginPath();
      ctx.roundRect(-11, -10, 22, 20, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#4b4840';
      ctx.fillRect(0, -7, 24 - this.recoil * 2, 5);
      ctx.fillRect(0, 2, 24 - this.recoil * 2, 5);
    }
    ctx.restore();
    for (let i = 0; i < this.level; i++) {
      ctx.fillStyle = '#e5d7a0';
      ctx.fillRect(-this.level * 3 + i * 6, 19, 4, 3);
    }
    if (this.mergedCount > 1) {
      ctx.fillStyle = '#1a261e';
      ctx.fillRect(-15, -27, 30, 12);
      ctx.fillStyle = '#e6c077';
      ctx.font = 'bold 10px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(`×${this.mergedCount}`, 0, -18);
    }
    ctx.restore();
  }
}
