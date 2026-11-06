export class Effects {
  constructor() {
    this.items = [];
  }

  spark(x, y, color) {
    this.items.push({ x, y, color, age: 0, life: 0.18, radius: 11, kind: 'ring' });
  }

  burst(x, y, color, radius = 24) {
    this.items.push({ x, y, color, age: 0, life: 0.35, radius, kind: 'ring' });
  }

  text(x, y, text, color = '#e6c077') {
    this.items.push({ x, y, text, color, age: 0, life: 0.85, kind: 'text' });
  }

  update(dt) {
    for (const p of this.items) p.age += dt;
    this.items = this.items.filter((p) => p.age < p.life);
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.items) {
      const t = p.age / p.life;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      if (p.kind === 'text') {
        ctx.font = 'bold 11px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText(p.text, p.x, p.y - t * 24);
      } else {
        ctx.lineWidth = 2 * (1 - t) + 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.radius * t), 0, 7);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
export class AudioEffects {
  constructor(storage) {
    this.storage = storage;
    this.enabled = storage.sound;
    this.context = null;
    this.lastShot = 0;
  }

  unlock() {
    if (!this.enabled) return;
    try {
      this.context ??= new (window.AudioContext || window.webkitAudioContext)();
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    } catch {
      this.enabled = false;
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    this.storage.sound = this.enabled;
    this.storage.save();
    this.unlock();
    if (this.enabled) this.play('build');
  }

  play(type) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    if (type === 'shot' && now - this.lastShot < 0.075) return;
    if (type === 'shot') this.lastShot = now;
    const osc = this.context.createOscillator(),
      gain = this.context.createGain();
    osc.connect(gain);
    gain.connect(this.context.destination);
    const f = { shot: 320, build: 540, death: 190, wave: 730, leak: 120 }[type] || 440;
    osc.type = type === 'shot' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.exponentialRampToValueAtTime(f * 0.55, now + 0.09);
    gain.gain.setValueAtTime(type === 'shot' ? 0.018 : 0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.start(now);
    osc.stop(now + 0.14);
  }
}
export class Storage {
  loadCampaign() {
    try {
      return JSON.parse(localStorage.getItem('woodland-campaign') || 'null');
    } catch {
      return null;
    }
  }

  saveCampaign(checkpoint) {
    try {
      if (checkpoint) localStorage.setItem('woodland-campaign', JSON.stringify(checkpoint));
      else localStorage.removeItem('woodland-campaign');
    } catch {}
  }

  constructor() {
    this.bestScore = 0;
    this.bestWave = 0;
    this.bestCircleScore = 0;
    this.bestCircleStage = 0;
    this.sound = false;
    try {
      const d = JSON.parse(localStorage.getItem('woodland-defense') || '{}');
      this.bestScore = Number(d.bestScore) || 0;
      this.bestWave = Number(d.bestWave) || 0;
      this.bestCircleScore = Number(d.bestCircleScore) || 0;
      this.bestCircleStage = Number(d.bestCircleStage) || 0;
      this.sound = d.sound === true;
    } catch {}
  }

  save() {
    try {
      localStorage.setItem(
        'woodland-defense',
        JSON.stringify({
          bestScore: this.bestScore,
          bestWave: this.bestWave,
          sound: this.sound,
          bestCircleScore: this.bestCircleScore,
          bestCircleStage: this.bestCircleStage,
        }),
      );
    } catch {}
  }

  record(score, wave) {
    if (score > this.bestScore || wave > this.bestWave) {
      this.bestScore = Math.max(this.bestScore, score);
      this.bestWave = Math.max(this.bestWave, wave);
      this.save();
    }
  }

  recordCircle(score, stage) {
    if (score > this.bestCircleScore || stage > this.bestCircleStage) {
      this.bestCircleScore = Math.max(this.bestCircleScore, score);
      this.bestCircleStage = Math.max(this.bestCircleStage, stage);
      this.save();
    }
  }
}
