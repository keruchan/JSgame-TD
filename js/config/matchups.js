import { ENEMIES } from './enemies.js';

export const DAMAGE_TYPES = {
  arrow: 'Arrows',
  explosive: 'Explosives',
  cold: 'Frost',
  precision: 'Precision',
  rapid: 'Rapid fire',
};

// Weakness/resistance bonuses apply in Circle Defense. Classic balance is preserved.
export function damageMultiplier(enemy, damageType, mode) {
  return mode === 'circle' ? (enemy.damageMultipliers?.[damageType] ?? 1) : 1;
}

export function towerCounters(damageType) {
  return Object.values(ENEMIES)
    .filter((enemy) => (enemy.damageMultipliers?.[damageType] ?? 1) > 1)
    .map(
      (enemy) => `${enemy.name} +${Math.round((enemy.damageMultipliers[damageType] - 1) * 100)}%`,
    );
}
