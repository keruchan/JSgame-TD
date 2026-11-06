import { CIRCLE_BALANCE } from './config/circle.js';

export class Projectile {
  constructor(tower, target, stats) {
    this.x = tower.x;
    this.y = tower.y;
    this.target = target;
    this.stats = stats;
    this.type = tower.type;
    this.alive = true;
    this.lastX = target.x;
    this.lastY = target.y;
  }

  update(dt, game) {
    if (!this.alive) return;
    if (this.target.alive) {
      this.lastX = this.target.x;
      this.lastY = this.target.y;
    }
    const dx = this.lastX - this.x,
      dy = this.lastY - this.y,
      d = Math.hypot(dx, dy),
      step = this.stats.projectileSpeed * dt;
    if (d <= step + 3) {
      this.x = this.lastX;
      this.y = this.lastY;
      this.alive = false;
      if (this.stats.splash) {
        for (const enemy of game.enemies)
          if (enemy.alive && Math.hypot(enemy.x - this.x, enemy.y - this.y) <= this.stats.splash)
            enemy.damage(
              this.stats.damage,
              game,
              this.stats.armorPierce || 0,
              this.stats.damageType,
            );
        game.effects.burst(this.x, this.y, this.stats.color, this.stats.splash);
      } else if (this.target.alive) {
        this.target.damage(
          this.stats.damage,
          game,
          this.stats.armorPierce || 0,
          this.stats.damageType,
        );
        if (this.stats.slow) this.target.slow(this.stats.slow, this.stats.slowDuration);
        if (game.mode === 'circle' && this.stats.slow)
          this.target.regenBlocked = CIRCLE_BALANCE.regenSuppression;
        game.effects.spark(this.x, this.y, this.stats.color);
      }
    } else {
      this.x += (dx / d) * step;
      this.y += (dy / d) * step;
    }
  }

  draw(ctx) {
    const angle = Math.atan2(this.lastY - this.y, this.lastX - this.x);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);
    ctx.strokeStyle = this.stats.color;
    ctx.lineWidth = this.stats.visual === 'sniper' ? 2 : 3;
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(0, 0);
    ctx.stroke();
    ctx.fillStyle = this.stats.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.stats.visual === 'cannon' ? 4 : 2, 0, 7);
    ctx.fill();
    ctx.restore();
  }
}
