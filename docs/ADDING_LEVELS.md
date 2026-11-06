# Adding maps and levels

A **map** defines where the battle takes place: grid size, path, blocked tiles, scenery, and colors. A **level** chooses a map and defines starting resources and the waves to survive. Several levels can share one map.

Only files in `js/content/` need to change to add content. The existing Woodland Pass is the working reference.

## Folder layout

```text
js/
  config/                 Shared game balance
    rules.js              Upgrade/refund mechanics and resource defaults
    towers.js             Tower definitions
    enemies.js            Enemy definitions
    campaign.js           Continuous campaign difficulty
  config.js               Convenient shared configuration exports
  content/
    maps/
      index.js            Map registry
      woodland-pass.js    One map per file
    levels/
      index.js            Level registry and default level
      woodland-pass.js    One level per file
    waves/
      classic.js          Reusable wave generation preset
    index.js              Content validation and level resolution
    validate.js           Authoring checks
  map.js                  Generic map renderer and path traversal
  waves.js                Generic wave runner
  game.js                 Game state and simulation
  campaign.js             Campaign waves and resource checkpoints
  ...                     Combat entities, UI, effects, and entry point
```

## 1. Create a map

Create `js/content/maps/highland-road.js`:

```js
export const highlandRoad = {
  id: 'highland-road',
  name: 'Highland Road',
  grid: { cols: 14, rows: 10, cell: 48 },
  path: [
    [-1, 2], // Entrance: one cell outside the left edge.
    [4, 2],
    [4, 7],
    [10, 7],
    [10, 3],
    [14, 3], // Exit: one cell outside the right edge.
  ],
  blockedCells: [
    [1, 8],
    [2, 8],
  ],
  trees: [
    [35, 35],
    [600, 430],
  ],
  theme: {
    grass: '#445953',
    grassAlternate: '#4b615a',
    path: '#b8af95',
  },
};
```

Register it in `js/content/maps/index.js`:

```js
import { woodlandPass } from './woodland-pass.js';
import { highlandRoad } from './highland-road.js';

export const MAPS = {
  [woodlandPass.id]: woodlandPass,
  [highlandRoad.id]: highlandRoad,
};
export const DEFAULT_MAP = woodlandPass;
```

Map coordinates start at `[0, 0]` in the top left. `cols` and `rows` must be integers of at least 2; `cell` is the logical pixel size and must be at least 40. The canvas dimensions and input coordinates adapt automatically. Tower ranges, enemy sizes, and artwork use logical pixels; use 48-pixel cells to retain the original balance and proportions.

The first and last path points must be exactly one cell outside an edge. All intermediate points must be inside the grid. Consecutive points must differ on exactly one axis. Path cells automatically prevent building. Blocked cells must be inside the grid and cannot overlap the path; they render as rocks. Trees are decorative pixel positions and do not block building. Missing theme colors use the Woodland Pass palette; available keys are listed in its map file. Entrance and castle positions are derived from the path endpoints.

## 2. Create a level

Create `js/content/levels/highland-road.js`:

```js
import { createClassicWaves } from '../waves/classic.js';

export const highlandRoadLevel = {
  id: 'highland-road',
  name: 'Highland Road',
  mapId: 'highland-road',
  difficulty: 'Hard',
  description: 'Guard the highland road against a shorter, tougher assault.',
  rules: { startingGold: 250, startingLives: 15, breakTime: 3 },
  waves: createClassicWaves({
    count: 12,
    healthGrowth: 1.15,
    bossEvery: 4,
  }),
};
```

Register it in `js/content/levels/index.js`:

```js
import { woodlandPassLevel } from './woodland-pass.js';
import { highlandRoadLevel } from './highland-road.js';

export const LEVELS = [woodlandPassLevel, highlandRoadLevel];
export const DEFAULT_LEVEL = woodlandPassLevel;
```

Keep all existing registry imports and entries when adding the example above. The new level automatically appears in the practice picker and becomes a campaign stage. Registry order determines campaign progression; append new maps after the current four. The campaign starts with `LEVELS[0]`; `DEFAULT_LEVEL` controls the initial practice selection. `Game` also accepts a registered ID as its second constructor argument: `new Game(canvas, 'highland-road')`.

Level IDs must be unique. `mapId` must reference a registered map. Only `startingGold`, `startingLives`, and `breakTime` are level-specific rule overrides; omitted values use `js/config/rules.js`. Upgrade mechanics remain shared across levels.

To add a new challenge on an existing map, skip step 1 and use an existing `mapId` in the new level.

## 3. Customize waves

`createClassicWaves()` returns an ordinary array; its adjustable defaults live in `js/content/waves/classic.js`. You can change enemy count growth, spawn timing, health/speed growth, enemy introductions, boss frequency, and wave bonuses. Set `bossEvery: 0` to disable bosses. Supply a complete `introductions` array to replace the default introduction rules.

For complete control, define a level's `waves` directly:

```js
waves: [
  {
    enemies: ['basic', 'basic', 'fast'], // Ordered spawn queue.
    spawnInterval: 0.8,                // Simulation seconds between spawns.
    startDelay: 0.3,                   // Optional; defaults to 0.3 seconds.
    healthMultiplier: 1,
    speedMultiplier: 1,
    bonus: 30,
  },
  {
    enemies: ['armored', 'regen', 'boss'],
    spawnInterval: 1.1,
    healthMultiplier: 1.4,
    speedMultiplier: 1.05,
    bonus: 75,
  },
],
```

Valid enemy IDs are `basic`, `fast`, `armored`, `tank`, `regen`, and `boss`. Multipliers and spawn intervals must be positive; bonuses must be nonnegative integers. At least one wave and one enemy per wave are required. A boss can appear on any wave: boss alerts and the field guide read the actual schedule. The final entry determines when victory occurs. Wave counts and bonuses in the HUD, start screen, and results come from the selected level.

Wave queues are copied before spawning, so replaying a level never consumes its content definitions. In practice, restart resets the same map. In campaign mode, restart restores the current map-entry checkpoint. After a run, **Main menu** returns to mode selection. Personal bests remain global across all maps.

## Campaign progression

Each registered level is a campaign stage. Remaining gold, lives, score, and statistics carry forward. At a map transition, towers are packed at their full spent value and the new map starts empty; no fresh starting-resource grant is added. Checkpoints save at map entry and map completion. The implementation is in `js/campaign.js` and the transition methods of `js/game.js`.

For generated campaign waves, define a `waveSettings` object alongside `waves`, following the current map files:

```js
const waveSettings = { count: 20, bossEvery: 5 };
// Inside the exported level:
waveSettings,
waves: createClassicWaves(waveSettings),
```

The campaign uses those settings to continue enemy counts, introductions, bosses, and bonuses from the cumulative wave index. It applies the shared health/speed/spawn curve from `js/config/campaign.js`. Without `waveSettings`, it keeps your explicitly authored enemy queues and bonuses while applying that shared curve. Practice always uses the exact `waves` array. Adding a new stage requires balancing it against the budget and difficulty accumulated in earlier maps.

## 4. Verify

Run `npm test`. All registered content is validated as it loads, with errors naming the broken map, level, or wave. The suite includes a second map with a different grid size and a custom two-wave level, testing resources, obstacles, boss timing, enemy scaling, bonuses, victory, and restart.

Run `npm start`, select the new level, and check placement, entrance/exit artwork, enemy movement, difficulty, and the final result. Content validation checks structure; playtesting is still needed to balance new maps and levels.
