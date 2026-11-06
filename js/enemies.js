import { ENEMIES } from './config.js';
import { damageMultiplier } from './config/matchups.js';
export class Enemy {
  constructor(type, wave, map, modifiers = {}) {
    this.type = type;
    this.config = ENEMIES[type];
    this.maxHealth = this.config.health * (modifiers.healthMultiplier ?? 1);
    this.health = this.maxHealth;
    this.speed = this.config.speed * (modifiers.speedMultiplier ?? 1);
    this.distance = 0;
    this.travelled = 0;
    this.laps = 0;
    this.regenBlocked = 0;
    this.alive = true;
    this.slowTime = 0;
    this.slowFactor = 1;
    this.hitTime = 0;
    Object.assign(this, map.position(0));
  }

  update(dt, game) {
    if (!this.alive) return;
    this.hitTime = Math.max(0, this.hitTime - dt);
    this.regenBlocked = Math.max(0, this.regenBlocked - dt);
    this.slowTime = Math.max(0, this.slowTime - dt);
    if (this.slowTime === 0) this.slowFactor = 1;
    if (this.config.regen && this.regenBlocked === 0)
      this.health = Math.min(this.maxHealth, this.health + this.maxHealth * this.config.regen * dt);
    const step = this.speed * this.slowFactor * dt;
    this.distance += step;
    this.travelled += step;
    this.laps = Math.floor(this.travelled / game.map.length);
    Object.assign(this, game.map.position(this.distance));
    if (!game.map.loop && this.distance >= game.map.length) {
      this.alive = false;
      game.leak(this);
    }
  }

  damage(amount, game, pierce = 0, damageType = null) {
    if (!this.alive) return;
    this.health = Math.max(
      0,
      this.health -
        amount *
          damageMultiplier(this.config, damageType, game.mode) *
          (1 - this.config.armor * (1 - pierce)),
    );
    this.hitTime = 0.1;
    if (this.health <= 0) {
      this.alive = false;
      game.defeat(this);
    }
  }

  slow(factor, duration) {
    if (!this.alive) return;
    this.slowFactor = Math.min(this.slowFactor, factor);
    this.slowTime = Math.max(this.slowTime, duration);
  }

  draw(ctx) {
    const r = this.config.radius;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = '#1b271c55';
    ctx.beginPath();
    ctx.ellipse(2, r * 0.8, r, 5, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = this.hitTime > 0 ? '#f1e8ce' : this.config.color;
    ctx.strokeStyle = '#3c3b32';
    ctx.lineWidth = 2;
    const visual = this.config.visual ?? 'basic';
    ctx.beginPath();
    if (visual === 'fast') {
      ctx.moveTo(r, 0);
      ctx.lineTo(0, -r);
      ctx.lineTo(-r, 0);
      ctx.lineTo(0, r);
      ctx.closePath();
    } else if (visual === 'armored' || visual === 'tank') {
      ctx.roundRect(-r, -r, r * 2, r * 2, visual === 'tank' ? 4 : 2);
    } else {
      ctx.arc(0, 0, r, 0, 7);
    }
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3e3c32';
    if (visual === 'boss') {
      ctx.fillStyle = '#ecd291';
      ctx.beginPath();
      ctx.moveTo(-13, -12);
      ctx.lineTo(-16, -24);
      ctx.lineTo(-5, -18);
      ctx.lineTo(0, -27);
      ctx.lineTo(6, -18);
      ctx.lineTo(16, -24);
      ctx.lineTo(13, -12);
      ctx.fill();
      ctx.fillStyle = '#3e3c32';
    }
    ctx.fillRect(-r * 0.45, -3, 3, 4);
    ctx.fillRect(r * 0.25, -3, 3, 4);
    if (visual === 'regen') {
      ctx.fillStyle = '#eef0c9';
      ctx.fillRect(-4, 4, 8, 2);
      ctx.fillRect(-1, 1, 2, 8);
    }
    if (visual === 'armored') {
      ctx.strokeStyle = '#e4e6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r + 3, -r + 3);
      ctx.lineTo(0, -r + 5);
      ctx.lineTo(r - 3, -r + 3);
      ctx.stroke();
    }
    if (this.slowTime > 0) {
      ctx.strokeStyle = '#a9deea';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r + 3, 0, 7);
      ctx.stroke();
    }
    const w = Math.max(22, r * 2 + 4);
    ctx.fillStyle = '#202a22';
    ctx.fillRect(-w / 2, -r - 10, w, 4);
    ctx.fillStyle = this.config.isBoss ? '#d4a2bf' : '#c6d998';
    ctx.fillRect(-w / 2, -r - 10, (w * this.health) / this.maxHealth, 4);
    ctx.restore();
  }
}
