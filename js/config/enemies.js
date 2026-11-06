// EDIT ENEMY SPECS HERE. Add the object key to a wave to spawn that unit.
// visual: reuse basic, fast, armored, tank, regen, or boss artwork.
// isBoss: enables boss alerts and boss health-bar coloring.
// health: base HP before wave scaling; speed: pixels per second.
// reward: gold per kill; score: base score multiplied by the current wave.
// armor: damage reduction fraction (0.5 = 50%); regen: max HP per second.
// radius: logical pixels; lives: base damage when the unit escapes.
// damageMultipliers: Circle-only weaknesses (>1) or resistances (<1) by damageType.
// Artwork never grants armor, regeneration, or other combat mechanics.

export const ENEMIES = {
  basic: {
    visual: 'basic',
    damageMultipliers: { arrow: 1.25, rapid: 1.1 },
    name: 'Grunt',
    health: 43,
    speed: 49,
    reward: 8,
    score: 10,
    armor: 0,
    color: '#db8d72',
    radius: 10,
    lives: 1,
  },
  fast: {
    visual: 'fast',
    damageMultipliers: { rapid: 1.6, cold: 1.3, precision: 0.9 },
    name: 'Runner',
    health: 29,
    speed: 94,
    reward: 9,
    score: 15,
    armor: 0,
    color: '#e5ce7f',
    radius: 8,
    lives: 1,
  },
  armored: {
    visual: 'armored',
    damageMultipliers: { explosive: 1.6, precision: 1.3, arrow: 0.75, rapid: 0.65 },
    name: 'Armored',
    health: 110,
    speed: 39,
    reward: 16,
    score: 25,
    armor: 0.5,
    color: '#afbac3',
    radius: 12,
    lives: 1,
  },
  tank: {
    visual: 'tank',
    damageMultipliers: { precision: 1.5, explosive: 1.2, rapid: 0.7 },
    name: 'Tank',
    health: 340,
    speed: 29,
    reward: 28,
    score: 45,
    armor: 0.18,
    color: '#b7a18b',
    radius: 15,
    lives: 2,
  },
  regen: {
    visual: 'regen',
    damageMultipliers: { cold: 1.6, rapid: 1.2, arrow: 0.9 },
    name: 'Regenerator',
    health: 135,
    speed: 51,
    reward: 20,
    score: 30,
    armor: 0,
    regen: 0.025,
    color: '#c0cf87',
    radius: 11,
    lives: 1,
  },
  boss: {
    visual: 'boss',
    damageMultipliers: { precision: 1.35, rapid: 0.8, cold: 0.85 },
    isBoss: true,
    name: 'Warden',
    health: 1150,
    speed: 25,
    reward: 110,
    score: 250,
    armor: 0.25,
    color: '#c487a8',
    radius: 20,
    lives: 5,
  },
};
