import { DEFAULT_LEVEL } from './content/levels/index.js';
import { RULES } from './config/rules.js';
import { ENEMIES } from './config/enemies.js';

// Copy the list: spawning must never mutate the registered content.
export function wavePlan(wave, level = DEFAULT_LEVEL) {
  const definition = level.waves[wave - 1];
  if (!definition) throw new RangeError(`Wave ${wave} does not exist in level "${level.id}"`);
  return [...definition.enemies];
}

export class Waves {
  constructor(level = DEFAULT_LEVEL) {
    this.level = level;
    this.current = 0;
    this.active = false;
    this.queue = [];
    this.timer = 0;
    this.total = 0;
    this.resolved = 0;
    this.breakRemaining = 0;
    this.lastBonus = 0;
    this.spawned = 0;
  }

  get count() {
    return this.level.waves.length;
  }

  get definition() {
    return this.level.waves[this.current - 1] ?? null;
  }

  get hasBoss() {
    return this.definition?.enemies.some((type) => ENEMIES[type]?.isBoss) ?? false;
  }

  get bossNames() {
    return [
      ...new Set(
        (this.definition?.enemies ?? [])
          .filter((type) => ENEMIES[type]?.isBoss)
          .map((type) => ENEMIES[type].name),
      ),
    ];
  }

  start() {
    if (this.active || this.current >= this.count || this.breakRemaining > 0) return false;
    this.current++;
    this.queue = wavePlan(this.current, this.level);
    this.total = this.queue.length;
    this.resolved = 0;
    this.spawned = 0;
    this.active = true;
    this.timer = this.definition.startDelay ?? 0.3;
    return true;
  }

  update(dt, game) {
    this.breakRemaining = Math.max(0, this.breakRemaining - dt);
    if (!this.active) return;
    this.timer -= dt;
    while (this.queue.length && this.timer <= 0 && game.state === 'playing') {
      const portal = game.mode === 'circle' ? this.spawned % game.map.portals.length : 0;
      game.spawn(this.queue.shift(), portal);
      this.spawned++;
      this.timer += this.definition.spawnInterval;
    }
    if (game.state !== 'playing') return;
    if (!this.queue.length && !game.enemies.some((enemy) => enemy.alive)) {
      this.active = false;
      this.lastBonus = this.definition.bonus;
      game.earn(this.lastBonus);
      game.message(
        `${game.mode === 'circle' ? 'Stage' : 'Wave'} ${this.current} cleared! +${this.lastBonus} gold`,
      );
      game.audio.play('wave');
      if (this.current === this.count) game.finish(true);
      else this.breakRemaining = this.level.rules?.breakTime ?? RULES.breakTime;
    }
  }
}
