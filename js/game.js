import { TOWERS } from './config.js';
import { resolveLevel, CIRCLE_LEVEL } from './content/index.js';
import { campaignLevel, validCheckpoint, makeCheckpoint } from './campaign.js';
import { LEVELS } from './content/levels/index.js';
import { GameMap } from './map.js';
import { Tower } from './towers.js';
import { Enemy } from './enemies.js';
import { Projectile } from './projectiles.js';
import { Waves } from './waves.js';
import { Effects, AudioEffects, Storage } from './effects.js';
import { CHEAT_RULES } from './config/cheats.js';
export class Game {
  constructor(canvas, levelId) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.storage = new Storage();
    this.audio = new AudioEffects(this.storage);
    this.ui = null;
    this.reset(levelId);
    this.lastTime = 0;
    this.accumulator = 0;
    this.frame = this.frame.bind(this);
    this.bindInput();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing' && !this.paused) this.togglePause();
    });
  }

  reset(level = this.level) {
    this.campaign = null;
    this.level = resolveLevel(level);
    this.mode = this.level.mode ?? 'tower';
    this.peakPopulation = 0;
    this.lossReason = '';
    this.map = new GameMap(this.level.map);
    this.gold = this.level.rules.startingGold;
    this.lives = this.level.rules.startingLives;
    this.score = 0;
    this.stats = { defeated: 0, earned: 0, built: 0 };
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.effects = new Effects();
    this.waves = new Waves(this.level);
    this.state = 'start';
    this.paused = false;
    this.speed = 1;
    this.buildType = null;
    this.selected = null;
    this.mergeSource = null;
    this.mergeEnabled = CHEAT_RULES.mergeEnabled;
    this.strongEnabled = CHEAT_RULES.strongEnabled;
    this.hover = null;
    this.accumulator = 0;
    if (this.canvas) this.resize();
    this.ui?.clearToast?.();
    this.ui?.refresh(true);
  }

  play() {
    this.reset();
    this.state = 'playing';
    this.audio.unlock();
    this.ui?.refresh(true);
  }

  startCircle() {
    this.reset(CIRCLE_LEVEL.id);
    this.state = 'playing';
    this.audio.unlock();
    this.ui?.refresh(true);
  }

  get population() {
    return this.enemies.reduce((count, enemy) => count + (enemy.alive ? 1 : 0), 0);
  }

  recordProgress() {
    if (this.mode === 'circle') this.storage.recordCircle?.(this.score, this.waves.current);
    else this.storage.record(this.score, this.globalWave);
  }

  get globalWave() {
    return (this.campaign ? this.level.waveOffset : 0) + this.waves.current;
  }

  get nextCampaignMap() {
    return this.campaign ? (LEVELS[this.campaign.index + 1] ?? null) : null;
  }

  startCampaign(checkpoint = null) {
    if (checkpoint && !validCheckpoint(checkpoint)) return false;
    const index = checkpoint?.index ?? 0;
    this.reset(campaignLevel(index));
    if (checkpoint) {
      this.gold = checkpoint.gold;
      this.lives = checkpoint.lives;
      this.score = checkpoint.score;
      this.stats = { ...checkpoint.stats };
      this.mergeEnabled = checkpoint.cheats?.mergeEnabled ?? CHEAT_RULES.mergeEnabled;
      this.strongEnabled = checkpoint.cheats?.strongEnabled ?? CHEAT_RULES.strongEnabled;
    }
    this.campaign = { index, checkpoint: makeCheckpoint(this, index) };
    this.storage.saveCampaign?.(this.campaign.checkpoint);
    this.state = 'playing';
    this.audio.unlock();
    this.ui?.refresh(true);
    return true;
  }

  restartRun() {
    const flags = { mergeEnabled: this.mergeEnabled, strongEnabled: this.strongEnabled };
    if (this.campaign) this.startCampaign({ ...this.campaign.checkpoint, cheats: flags });
    else this.play();
    Object.assign(this, flags);
    this.ui?.refresh(true);
  }

  advanceCampaign() {
    if (!this.campaign || this.state !== 'victory' || !this.nextCampaignMap) return false;
    const index = this.campaign.index + 1;
    const checkpoint = makeCheckpoint(this, index);
    checkpoint.gold = Math.min(
      Number.MAX_SAFE_INTEGER,
      checkpoint.gold + this.towers.reduce((sum, tower) => sum + tower.spent, 0),
    );
    return this.startCampaign(checkpoint);
  }

  get interactive() {
    return (
      this.state === 'playing' && !this.paused && !this.orientationBlocked && !this.ui?.modalOpen
    );
  }

  resize() {
    const GRID = this.map.grid,
      dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(GRID.width * dpr);
    this.canvas.height = Math.round(GRID.height * dpr);
    this.canvas.style.aspectRatio = `${GRID.width} / ${GRID.height}`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.viewport?.fitCanvas();
  }

  bindInput() {
    const locate = (e) => {
      const r = this.canvas.getBoundingClientRect(),
        GRID = this.map.grid;
      return {
        col: Math.floor(((e.clientX - r.left) / r.width) * GRID.cols),
        row: Math.floor(((e.clientY - r.top) / r.height) * GRID.rows),
      };
    };
    this.canvas.addEventListener('pointermove', (e) => {
      this.hover = locate(e);
    });
    this.canvas.addEventListener('pointerleave', () => {
      this.hover = null;
    });
    let pointer = null;
    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      this.canvas.focus({ preventScroll: true });
      this.audio.unlock();
      this.hover = locate(e);
      pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    this.canvas.addEventListener('pointerup', (e) => {
      if (!pointer || e.pointerId !== pointer.id) return;
      const tap = Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) < 8;
      pointer = null;
      if (tap) {
        this.hover = locate(e);
        this.interact(this.hover.col, this.hover.row);
      }
    });
    this.canvas.addEventListener('pointercancel', () => {
      pointer = null;
    });
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input,textarea,select')) return;
      if (this.ui?.modalOpen || this.orientationBlocked) return;
      const key = e.key.toLowerCase();
      if (e.target.closest('button') && [' ', 'enter'].includes(key)) return;
      if (key === 'escape') {
        this.buildType = null;
        this.selected = null;
        this.mergeSource = null;
        this.ui?.refresh(true);
        return;
      }
      if (this.state !== 'playing') return;
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key))
        e.preventDefault();
      this.audio.unlock();
      if (key === 'p') this.togglePause();
      else if (key === 'f') this.toggleSpeed();
      else if (key === 'm') {
        this.audio.toggle();
        this.ui?.refresh();
      } else if (key === ' ') this.startWave();
      else if (/^[1-9]$/.test(key)) {
        const type = this.availableTowerTypes[Number(key) - 1];
        if (type) this.chooseTower(type);
      } else if (key === 'u') this.upgrade();
      else if (key === 'delete') this.sell();
      else if (key.startsWith('arrow')) {
        const GRID = this.map.grid;
        this.hover ??= { col: 0, row: 0 };
        this.hover.col = Math.max(
          0,
          Math.min(
            GRID.cols - 1,
            this.hover.col + (key === 'arrowright' ? 1 : key === 'arrowleft' ? -1 : 0),
          ),
        );
        this.hover.row = Math.max(
          0,
          Math.min(
            GRID.rows - 1,
            this.hover.row + (key === 'arrowdown' ? 1 : key === 'arrowup' ? -1 : 0),
          ),
        );
      } else if (key === 'enter' && this.hover && e.target === this.canvas)
        this.interact(this.hover.col, this.hover.row);
    });
  }

  chooseTower(type) {
    if (!this.interactive || !this.availableTowerTypes.includes(type)) return;
    this.buildType = this.buildType === type ? null : type;
    this.selected = null;
    this.mergeSource = null;
    this.hover ??= { col: 0, row: 0 };
    this.ui?.refresh(true);
  }

  interact(col, row) {
    if (!this.interactive) return;
    const existing = this.towers.find((t) => t.col === col && t.row === row);
    if (existing) {
      if (this.mergeSource) {
        this.mergeWith(existing);
        return;
      }
      this.selected = existing;
      this.buildType = null;
      this.ui?.refresh(true);
      return;
    }
    if (this.mergeSource) {
      this.mergeSource = null;
      this.selected = null;
      this.ui?.refresh(true);
      return;
    }
    if (this.buildType) {
      if (!this.map.buildable(col, row, this.towers)) {
        this.message('Choose an empty grass tile. The path must stay clear.');
        return;
      }
      const cost = TOWERS[this.buildType].cost;
      if (this.gold < cost) {
        this.message(`You need ${cost - this.gold} more gold for this tower.`);
        return;
      }
      const tower = new Tower(this.buildType, col, row, this.map.grid);
      this.gold -= cost;
      this.towers.push(tower);
      this.stats.built++;
      this.audio.play('build');
      this.effects.burst(tower.x, tower.y, TOWERS[tower.type].color, 24);
      this.ui?.refresh(true);
    } else {
      this.selected = null;
      this.ui?.refresh(true);
    }
  }

  upgrade() {
    if (!this.interactive || !this.selected) return;
    const cost = this.selected.upgradeCost;
    if (cost === null) return;
    if (this.gold < cost) {
      this.message(`You need ${cost - this.gold} more gold to upgrade.`);
      return;
    }
    this.gold -= cost;
    this.selected.upgrade();
    this.audio.play('build');
    this.effects.burst(this.selected.x, this.selected.y, '#d6e5a3', 35);
    this.ui?.refresh(true);
  }

  sell() {
    if (!this.interactive || !this.selected) return;
    const tower = this.selected;
    this.gold = Math.min(Number.MAX_SAFE_INTEGER, this.gold + tower.sellValue);
    this.towers = this.towers.filter((t) => t !== tower);
    this.selected = null;
    this.mergeSource = null;
    this.message(`Tower sold for ${tower.sellValue} gold.`);
    this.ui?.refresh(true);
  }

  startWave() {
    if (!this.interactive) return;
    if (this.waves.breakRemaining > 0) {
      this.message('A moment to regroup. The next wave will be ready shortly.');
      return;
    }
    if (this.waves.start()) {
      this.mergeSource = null;
      this.recordProgress();
      this.message(
        `${this.mode === 'circle' ? 'Stage' : 'Wave'} ${this.waves.current}${this.waves.hasBoss ? ` · ${this.waves.bossNames.join(', ')} incoming!` : ''}`,
      );
      this.ui?.refresh(true);
    }
  }

  togglePause() {
    if (this.state !== 'playing' || this.ui?.modalOpen) return;
    this.paused = !this.paused;
    this.accumulator = 0;
    this.ui?.refresh();
  }

  toggleSpeed() {
    if (this.state !== 'playing') return;
    this.speed = this.speed === 1 ? 2 : 1;
    this.ui?.refresh();
  }

  spawn(type, portalIndex = 0) {
    const enemy = new Enemy(type, this.waves.current, this.map, this.waves.definition ?? {});
    if (this.mode === 'circle') {
      const portal = this.map.portals[portalIndex];
      enemy.portalIndex = portalIndex;
      enemy.distance = portal.distance;
      Object.assign(enemy, this.map.position(enemy.distance));
    }
    this.enemies.push(enemy);
    if (this.mode === 'circle') {
      this.peakPopulation = Math.max(this.peakPopulation, this.population);
      if (this.population > this.level.rules.populationLimit) {
        this.lossReason = `Overcrowded: ${this.population} living mobs exceeded the ${this.level.rules.populationLimit} limit.`;
        this.finish(false);
      }
    }
  }

  shoot(tower, target, stats) {
    this.projectiles.push(new Projectile(tower, target, stats));
    this.audio.play('shot');
  }

  earn(amount) {
    this.gold = Math.min(Number.MAX_SAFE_INTEGER, this.gold + amount);
    this.stats.earned += amount;
  }

  get availableTowerTypes() {
    return Object.keys(TOWERS).filter(
      (type) =>
        !TOWERS[type].cheatUnlock || (TOWERS[type].cheatUnlock === 'strong' && this.strongEnabled),
    );
  }

  get canUseCheats() {
    return this.state === 'playing' && !this.orientationBlocked && !this.ui?.modalOpen;
  }

  setGold(value) {
    if (!this.canUseCheats || !Number.isSafeInteger(value) || value < 0) return false;
    this.gold = value;
    this.ui?.refresh(true);
    return true;
  }

  setCheat(key, enabled) {
    if (!this.canUseCheats || !['mergeEnabled', 'strongEnabled'].includes(key)) return false;
    this[key] = Boolean(enabled);
    if (key === 'mergeEnabled' && !enabled) this.mergeSource = null;
    if (key === 'strongEnabled' && !enabled && this.buildType && TOWERS[this.buildType].cheatUnlock)
      this.buildType = null;
    this.message(
      `${key === 'mergeEnabled' ? 'Tower fusion' : 'Titan Tower'} ${enabled ? 'enabled' : 'disabled'}.`,
    );
    this.ui?.refresh(true);
    return true;
  }

  beginMerge() {
    if (!this.interactive || !this.mergeEnabled || this.waves.active || !this.selected)
      return false;
    this.mergeSource = this.mergeSource ? null : this.selected;
    this.message(
      this.mergeSource
        ? 'Tap another tower of the same type and level to fuse.'
        : 'Fusion selection cancelled.',
    );
    this.ui?.refresh(true);
    return Boolean(this.mergeSource);
  }

  mergeWith(target) {
    const source = this.mergeSource;
    if (!this.interactive || !this.mergeEnabled || this.waves.active || !source) return false;
    if (target === source) {
      this.mergeSource = null;
      this.ui?.refresh(true);
      return false;
    }
    if (
      !this.towers.includes(source) ||
      !this.towers.includes(target) ||
      target.type !== source.type ||
      target.level !== source.level
    ) {
      this.message('Fusion needs matching tower types and levels.');
      return false;
    }
    source.mergedCount += target.mergedCount;
    source.spent += target.spent;
    this.towers = this.towers.filter((tower) => tower !== target);
    this.selected = source;
    this.mergeSource = null;
    this.effects.burst(source.x, source.y, TOWERS[source.type].color, 40);
    this.message(`Fused tower: ×${source.mergedCount} strength. Investment preserved.`);
    this.ui?.refresh(true);
    return true;
  }

  defeat(enemy) {
    this.stats.defeated++;
    this.waves.resolved++;
    this.earn(enemy.config.reward);
    this.score += enemy.config.score * this.globalWave;
    this.effects.burst(enemy.x, enemy.y, enemy.config.color, 22);
    this.effects.text(enemy.x, enemy.y - 12, `+${enemy.config.reward}`);
    this.recordProgress();
  }

  leak(enemy) {
    this.waves.resolved++;
    this.lives = Math.max(0, this.lives - enemy.config.lives);
    this.effects.text(
      this.map.base.x - 26,
      this.map.base.y - 26,
      `−${enemy.config.lives} ♥`,
      '#e6a28c',
    );
    this.audio.play('leak');
    if (this.lives <= 0) this.finish(false);
  }

  message(text) {
    this.ui?.toast(text);
  }

  finish(won) {
    if (this.state !== 'playing') return;
    this.state = won ? 'victory' : 'over';
    this.paused = false;
    this.buildType = null;
    this.selected = null;
    this.recordProgress();
    if (won && this.campaign) {
      if (this.nextCampaignMap) {
        const checkpoint = makeCheckpoint(this, this.campaign.index + 1);
        checkpoint.gold = Math.min(
          Number.MAX_SAFE_INTEGER,
          checkpoint.gold + this.towers.reduce((sum, tower) => sum + tower.spent, 0),
        );
        this.storage.saveCampaign?.(checkpoint);
      } else this.storage.saveCampaign?.(null);
    }
    this.ui?.refresh(true);
    this.ui?.showResult(won);
  }

  update(dt) {
    if (!this.interactive) return;
    this.waves.update(dt, this);
    if (this.state !== 'playing') return;
    for (const enemy of this.enemies) {
      enemy.update(dt, this);
      if (this.state !== 'playing') return;
    }
    for (const tower of this.towers) tower.update(dt, this);
    for (const projectile of this.projectiles) projectile.update(dt, this);
    this.enemies = this.enemies.filter((e) => e.alive);
    this.projectiles = this.projectiles.filter((p) => p.alive);
    this.effects.update(dt);
  }

  drawRange(tower, valid = true) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, tower.stats.range, 0, Math.PI * 2);
    ctx.fillStyle = valid ? '#d3e9b310' : '#e88c8018';
    ctx.fill();
    ctx.strokeStyle = valid ? '#d3e9b37a' : '#e88c80aa';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  draw() {
    const ctx = this.ctx,
      GRID = this.map.grid,
      cell = GRID.cell;
    ctx.clearRect(0, 0, GRID.width, GRID.height);
    this.map.draw(ctx);
    if (this.selected) {
      this.drawRange(this.selected);
      ctx.strokeStyle = '#d3e5a5';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        this.selected.col * cell + 3,
        this.selected.row * cell + 3,
        cell - 6,
        cell - 6,
      );
    }
    for (const t of this.towers) t.draw(ctx);
    for (const e of this.enemies) if (e.alive) e.draw(ctx);
    for (const p of this.projectiles) p.draw(ctx);
    this.effects.draw(ctx);
    if (this.buildType && this.hover && this.state === 'playing') {
      const { col, row } = this.hover,
        ghost = new Tower(this.buildType, col, row, GRID),
        valid =
          this.map.buildable(col, row, this.towers) && this.gold >= TOWERS[this.buildType].cost;
      this.drawRange(ghost, valid);
      ctx.fillStyle = valid ? '#cbe9a24a' : '#e0806b65';
      ctx.fillRect(col * cell + 1, row * cell + 1, cell - 2, cell - 2);
      ctx.strokeStyle = valid ? '#d0eba1' : '#f2a28e';
      ctx.lineWidth = 2;
      ctx.strokeRect(col * cell + 2, row * cell + 2, cell - 4, cell - 4);
      ghost.draw(ctx, true);
    } else if (this.hover && this.state === 'playing' && !this.paused) {
      ctx.strokeStyle = '#e0e5cb55';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.hover.col * cell + 2, this.hover.row * cell + 2, cell - 4, cell - 4);
    }
  }

  frame(time) {
    const dt = Math.min((time - this.lastTime) / 1000 || 0, 0.1);
    this.lastTime = time;
    if (this.interactive) {
      this.accumulator += dt * this.speed;
      while (this.accumulator >= 1 / 120) {
        this.update(1 / 120);
        this.accumulator -= 1 / 120;
        if (!this.interactive) {
          this.accumulator = 0;
          break;
        }
      }
    } else this.accumulator = 0;
    this.draw();
    this.ui?.refresh();
    requestAnimationFrame(this.frame);
  }

  run() {
    requestAnimationFrame(this.frame);
  }
}
