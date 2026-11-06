// Author-facing errors catch incomplete unit definitions before a wave starts.
// This validates data only; adding a unit does not require changing this file.
export function validateUnits(towers, enemies) {
  const requireSpec = (condition, label, message) => {
    if (!condition) throw new Error(`Invalid unit specs: ${label} ${message}`);
  };
  const positive = (value) => Number.isFinite(value) && value > 0;
  const fraction = (value) => Number.isFinite(value) && value >= 0 && value <= 1;
  const whole = (value) => Number.isInteger(value) && value >= 0;

  for (const [id, tower] of Object.entries(towers)) {
    const label = `tower "${id}"`;
    for (const key of ['name', 'role', 'description', 'icon', 'color']) {
      requireSpec(typeof tower[key] === 'string' && tower[key].length > 0, label, `needs ${key}`);
    }
    requireSpec(whole(tower.cost) && tower.cost > 0, label, 'needs a positive integer cost');
    requireSpec(
      Number.isFinite(tower.damage) && tower.damage >= 0,
      label,
      'needs nonnegative damage',
    );
    for (const key of ['range', 'rate', 'projectileSpeed']) {
      requireSpec(positive(tower[key]), label, `needs positive ${key}`);
    }
    requireSpec(
      Array.isArray(tower.upgrades) && tower.upgrades.every((cost) => whole(cost) && cost > 0),
      label,
      'needs an upgrades array of positive gold costs',
    );
    requireSpec(
      tower.visual === undefined ||
        ['archer', 'cannon', 'frost', 'sniper', 'machine'].includes(tower.visual),
      label,
      'has an unsupported visual',
    );
    if (tower.splash !== undefined)
      requireSpec(positive(tower.splash), label, 'needs positive splash');
    if (tower.slow !== undefined) {
      requireSpec(fraction(tower.slow) && tower.slow > 0, label, 'slow must be in (0, 1]');
      requireSpec(positive(tower.slowDuration), label, 'slowing needs a positive slowDuration');
    }
    if (tower.armorPierce !== undefined)
      requireSpec(fraction(tower.armorPierce), label, 'armorPierce must be in [0, 1]');
    if (tower.damageType !== undefined)
      requireSpec(
        typeof tower.damageType === 'string' && tower.damageType.length > 0,
        label,
        'needs a damageType string',
      );
    if (tower.cheatUnlock !== undefined)
      requireSpec(tower.cheatUnlock === 'strong', label, 'cheatUnlock must be strong');
  }

  for (const [id, enemy] of Object.entries(enemies)) {
    const label = `enemy "${id}"`;
    for (const key of ['name', 'color'])
      requireSpec(typeof enemy[key] === 'string' && enemy[key].length > 0, label, `needs ${key}`);
    for (const key of ['health', 'speed', 'radius'])
      requireSpec(positive(enemy[key]), label, `needs positive ${key}`);
    for (const key of ['reward', 'score', 'lives'])
      requireSpec(whole(enemy[key]), label, `needs nonnegative integer ${key}`);
    requireSpec(fraction(enemy.armor), label, 'armor must be in [0, 1]');
    if (enemy.regen !== undefined)
      requireSpec(fraction(enemy.regen), label, 'regen must be in [0, 1]');
    if (enemy.damageMultipliers !== undefined)
      requireSpec(
        enemy.damageMultipliers &&
          typeof enemy.damageMultipliers === 'object' &&
          !Array.isArray(enemy.damageMultipliers) &&
          Object.values(enemy.damageMultipliers).every(positive),
        label,
        'damageMultipliers must contain positive multipliers',
      );
    if (enemy.isBoss !== undefined)
      requireSpec(typeof enemy.isBoss === 'boolean', label, 'isBoss must be true or false');
    requireSpec(
      enemy.visual === undefined ||
        ['basic', 'fast', 'armored', 'tank', 'regen', 'boss'].includes(enemy.visual),
      label,
      'has an unsupported visual',
    );
  }
}
