# Editing the game

Start with this table when you want to change something. All source files use two-space indentation, and unit specs have one property per line.

| Change                                                                     | File                                           |
| -------------------------------------------------------------------------- | ---------------------------------------------- |
| Page structure, buttons, canvas, and sidebar containers                    | `index.html`                                   |
| Colors, spacing, responsive layout, and button styles                      | `css/style.css`                                |
| Tower prices, damage, range, attack rate, upgrades, and effects            | `js/config/towers.js`                          |
| Enemy health, speed, armor, rewards, and escape damage                     | `js/config/enemies.js`                         |
| Shared upgrade multipliers, manual sell refund, default starting resources | `js/config/rules.js`                           |
| Difficulty growth across campaign maps                                     | `js/config/campaign.js`                        |
| One map's path, grid, blocked tiles, and scenery                           | `js/content/maps/<map-name>.js`                |
| One level's resources, waves, and introduction rules                       | `js/content/levels/<level-name>.js`            |
| Register maps or reorder campaign stages                                   | The `index.js` in the maps or levels folder    |
| Default wave generation                                                    | `js/content/waves/classic.js`                  |
| Shop markup, inspection panel, field guide, and menus                      | `js/ui.js`                                     |
| Custom tower or enemy artwork                                              | `js/towers.js` or `js/enemies.js`, in `draw()` |
| New combat mechanics                                                       | Tower, enemy, or projectile entity modules     |

`index.html` is the page shell. Its comments point to the content files. Keep its element IDs when rearranging the page: `js/ui.js` uses those IDs to fill in the shop, stats, and dialogs. You do not need to add a button to the HTML when adding a tower or level.

## Mobile presentation and developer controls

- Edit `css/mobile.css` for the fixed landscape screen, independent shop/inspection scrolling, rotate screen, cheat popover, and compact menus. The main desktop styles remain in `css/style.css`.
- `js/viewport.js` blocks portrait input/simulation, restores dialogs on rotation, sizes the canvas without changing logical coordinates, doubles it for touch panning, and toggles fullscreen with WebKit fallbacks. Portrait media queries and compact landscape thresholds live there. Keep CSS layout bounds and canvas sizing in sync.
- `js/config/cheats.js` defines default button visibility and fusion/Titan unlock flags. `js/cheat-sequence.js` implements the consecutive 5 title / 1 Score / 1 title toggle; `js/cheats.js` binds it to the Circle header and panel.
- Titan's specs are an ordinary entry in `js/config/towers.js` with `cheatUnlock: 'strong'`. It stays out of the normal shop and number-key ordering until unlocked. Placed Titans keep working after locking the option.
- Fusion logic is in `Game.beginMerge()` and `Game.mergeWith()`. `Tower.mergedCount` scales damage and upgrade costs; `Tower.spent` carries combined investment into sales and map packing. The same type and level are required, and fusion is blocked during active waves. Existing fused towers keep their strength if fusion is switched off.

The gold cheat sets a safe integer balance without marking it as earned. Cheats are developer features; the ordinary paid campaign and Circle balance tests run with them off. Fullscreen is user-initiated. Where an orientation lock is unsupported, the rotate overlay still enforces landscape play.

## Circle Defense files and matchups

- `js/config/circle.js` controls the population cap, warning threshold, starting gold, stage counts, scaling, and regeneration suppression time.
- `js/content/maps/circle-labyrinth.js` defines the larger closed maze. `loop: true` means every path point is inside the grid and the last point repeats the first. Its three `portals` reference distinct path-point indices, with a name and color each. There is no base or exit.
- `js/content/waves/circle.js` creates ordered stage queues. The shared wave runner distributes entries evenly across the three portals. Each default stage contains more than 100 total spawns, while defeat depends only on simultaneously living mobs.
- `js/circle-ui.js` contains the initial defense-mode choice, Circle setup/results, live population HUD, stage briefing, targeting controls, and weakness table.

Circle is separate from the Tower Defense campaign registry, so it does not become a fifth campaign map. Starting it preserves the campaign checkpoint. Its personal bests are saved independently; its active run is not saved.

Tower specs now support `damageType`: `arrow`, `explosive`, `cold`, `precision`, or `rapid`. Enemy specs support a `damageMultipliers` object, such as `{ rapid: 1.6, cold: 1.3, precision: 0.9 }`. Values greater than 1 are weaknesses; values less than 1 are resistances; omitted entries use 1. These bonuses apply only in Circle Defense. Damage is `base damage × type multiplier × (1 − armor × (1 − armorPierce))`. Change display labels in `js/config/matchups.js`.

Frost attacks also stop regeneration for the duration in `CIRCLE_BALANCE.regenSuppression`. Targets can be selected by distance travelled since spawning (oldest), current health (strongest), or lowest current health (weakest). Artwork and damage type remain independent, so a new unit can reuse any existing visual while defining its own counters.

## Add or change a tower

Open `js/config/towers.js`. Copy an existing entry inside `TOWERS`, give it a unique key, and change its specs. For example, add this beside `archer`, `cannon`, and the other entries:

```js
ranger: {
  visual: 'archer',
  name: 'Ranger Tower',
  role: 'Longer-range arrows',
  cost: 80,
  damage: 22,
  range: 170,
  rate: 1.3,
  projectileSpeed: 450,
  color: '#a6c885',
  icon: 'R',
  upgrades: [80, 140, 220],
  description: 'Slower arrows with extra reach and damage.',
},
```

The object key (`ranger`) is its internal unit ID. The shop includes it automatically; entries 1–9 get number-key shortcuts in definition order. Additional entries can still be selected with the mouse. Select it and place it like any existing tower.

| Tower spec                            | Meaning                                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| `visual`                              | Reuse `archer`, `cannon`, `frost`, `sniper`, or `machine` artwork; defaults to `archer` |
| `name`, `role`, `description`         | Display text; update descriptions when changing mechanics                               |
| `cost`                                | Initial price in gold                                                                   |
| `damage`                              | Damage per projectile before armor reduction                                            |
| `range`                               | Attack radius in logical canvas pixels; a standard tile is 48 pixels                    |
| `rate`                                | Shots per second; 2 means one shot every 0.5 seconds                                    |
| `projectileSpeed`                     | Projectile travel speed in logical pixels per second                                    |
| `color`, `icon`                       | Tower/projectile color and shop symbol                                                  |
| `upgrades`                            | Gold price for each additional level; `[80, 140]` gives two upgrades, reaching level 3  |
| `splash` (optional)                   | Explosion radius in pixels; damages all enemies in that area                            |
| `slow` (optional)                     | Remaining movement-speed fraction; `0.48` makes a target move at 48% speed              |
| `slowDuration` (required with `slow`) | Slow duration in seconds, increased by upgrades                                         |
| `armorPierce` (optional)              | Fraction of armor ignored; `0.75` ignores 75% of resistance                             |

The `visual` chooses artwork only. A cannon visual without `splash` has no explosion mechanic. An archer visual with `splash: 60` fires explosive arrows. For a slowing tower, use `slow` and `slowDuration`. For armor penetration, use `armorPierce`.

`upgrades` is the source of truth for a unit's maximum level; use `[]` for a tower that cannot be upgraded. Upgrade stat multipliers live in `js/config/rules.js`. The UI reads the current refund percentage and each tower's maximum level automatically.

For entirely new artwork, extend the rendering code and the supported visual list in `js/config/validate.js`. For entirely new mechanics such as poison or chain lightning, extend combat logic as well as the specs. Adding variants of existing mechanics only needs a new definition.

## Add or change an enemy

Open `js/config/enemies.js`. Copy a definition inside `ENEMIES`, give it a unique key, and edit its fields:

```js
scout: {
  visual: 'fast',
  name: 'Scout',
  health: 55,
  speed: 80,
  reward: 12,
  score: 18,
  armor: 0.15,
  color: '#d1b46f',
  radius: 9,
  lives: 1,
},
```

| Enemy spec          | Meaning                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `visual`            | Reuse `basic`, `fast`, `armored`, `tank`, `regen`, or `boss` artwork; defaults to `basic` |
| `health`            | Base health before the wave's health multiplier                                           |
| `speed`             | Base pixels per second before the wave's speed multiplier                                 |
| `reward`            | Gold earned when defeated                                                                 |
| `score`             | Base score multiplied by the current local/campaign wave                                  |
| `armor`             | Fraction of incoming damage resisted; `0.5` resists 50%; required even if zero            |
| `regen` (optional)  | Fraction of maximum health regenerated per second; `0.025` means 2.5%                     |
| `radius`            | Body radius in logical pixels                                                             |
| `lives`             | Lives removed if this enemy escapes                                                       |
| `isBoss` (optional) | Set `true` for boss alerts, field-guide scheduling, and boss health-bar coloring          |

An enemy appears only after you add its ID to a wave. In a hand-authored wave, use `enemies: ['basic', 'scout', 'scout']`. For generated levels, add an introduction rule in that level's `waveSettings`:

```js
{ type: 'scout', from: 4, every: 5, offset: 1 }
```

This replaces positions 1, 6, 11, and so on (counted from zero) with scouts, starting at wave 4. Later introduction rules take priority when several match the same position. See existing level files for complete `waveSettings` examples.

For a custom boss, set `isBoss: true` on its enemy definition and use its ID in an explicit wave, or set `bossType: 'your-boss-id'` in the preset settings. `bossEvery` controls its frequency. `basicType` changes the default filler enemy. Artwork and combat specs are independent: the `boss` visual does not automatically grant more health or escape damage.

## Add maps and levels

See [Adding maps and levels](ADDING_LEVELS.md) for complete map definitions and registry instructions. Keep the same `waveSettings` object in both the level definition and `createClassicWaves(waveSettings)`, so practice and campaign both use your enemy-introduction choices.

Campaign resource transfers, saved checkpoints, and rising difficulty remain handled by `js/campaign.js` and `js/game.js`. Reordering the level registry changes the campaign route, so keep existing stage IDs and order if you want to preserve checkpoint compatibility.

## Keep files readable

Install the formatter once:

```sh
npm install
```

Then format files or check formatting:

```sh
npm run format
npm run format:check
```

The `.prettierrc.json` and `.editorconfig` files define the project's formatting. VS Code is configured to format supported source files on save after you install its recommended **Prettier – Code formatter** extension. No formatter is needed to run or play the game.

After changing gameplay specs, run `npm test` and play the affected map. Unit definitions are checked on startup; invalid specs identify the affected unit and property. A passing test suite protects existing behavior, but new unit balance still needs playtesting.
