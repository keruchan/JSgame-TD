# Tower Defense — The Woodland Pass

A complete canvas game made with HTML, CSS, and vanilla JavaScript. Choose between an 80-wave **Tower Defense** campaign and a 20-stage **Circle Defense** labyrinth. No application dependencies, build step, external images, fonts, or account required.

## Launch

From this folder, run:

```sh
npm start
```

Open **http://localhost:8080**. Node.js 18 or newer is recommended. Set the `PORT` environment variable to change the port.

Alternatively, open `index.html` with **VS Code Live Server**, or run `python -m http.server 8080`. Use a local server: opening the HTML directly with `file://` does not support ES module loading consistently.

## Mobile, landscape, and fullscreen

Phone play requires **landscape orientation**, following the Battalion reference. Portrait shows **Rotate your device**, blocks input, and freezes the simulation without losing progress. Rotating back resumes play unless you had manually paused it. An open menu or field guide is restored after rotation.

Landscape phones use a fixed screen: the battlefield and wave controls stay on the left, with a separately scrolling tower shop and tower details on the right. Selecting towers or applying upgrades does not scroll the page. **Larger tiles** doubles the canvas size within its viewport; swipe to pan and tap to place or select. **Full field** returns to the fitted overview. Swiping never places a tower. Use the **?** header button for help and weaknesses.

Use **Fullscreen** in the header or an open menu to enter or exit fullscreen. The button follows the browser's actual fullscreen state. Unsupported browsers disable it; rejected requests show a short status message. Landscape orientation lock is requested when available, while the rotate screen handles browsers that cannot lock orientation. Desktop keeps its larger layout.

## Hidden developer controls

While playing **Circle Defense**, tap the **Circle Defense header title five times**, tap the **Score card once**, then tap the **Circle Defense title once more**. This shows the **Cheats** button. Repeat the exact sequence to hide it and close the panel. Any intervening click resets the sequence. The title is no longer a navigation link, so these taps do not reload the game. The sequence is available on desktop and touch screens.

The panel follows the Battalion reference:

- **Gold balance → Set gold** sets the total balance, rather than adding a reward. It accepts nonnegative safe integers, including zero. It does not increase earned-gold statistics.
- **Enable tower fusion** enables Fusion in a placed tower's details. Between waves/stages, select a tower, tap **Fusion**, then tap another tower of the **same type and level**. They combine into the first tile with a **×N** badge. Damage and invested gold add together; range and attack rate remain unchanged. Future upgrades cost the combined constituent upgrade prices. Manual selling refunds 70% of combined investment. Mismatches do not consume towers, and Escape or an empty tile cancels fusion selection.
- **Unlock Titan Tower** enables a player-only elite siege tower in the shop. It costs 1,200 gold, deals 300 precision damage at 1.2 shots/second, has 250-pixel range and 75-pixel splash, and pierces 80% of armor. It has three paid upgrades. It never appears in enemy waves.

Hiding developer controls does not undo gold, fusion, or unlock settings. Disabling fusion preserves existing fused strength; locking Titan removes it from recruitment but keeps placed Titans. Unlocks persist across stages, campaign map transfers, and **Restart map** retries. New campaigns or fresh Circle runs reset unlocks to `js/config/cheats.js` defaults. Button visibility lasts for the current page session and resets on reload. Campaign checkpoints carry their saved unlock flags.

## Play

Choose **Tower Defense** or **Circle Defense** on the opening screen. Both modes share the tower shop, upgrades, controls, and generated sound effects. The results screen returns to this mode chooser.

## Circle Defense

Choose **Circle Defense → Enter the labyrinth**. You start with **650 gold** on a **24 × 18** grid (1152 × 864 logical pixels), larger than the original 18 × 12 maps. There is **no base or exit**: mobs enter through Amber, Azure, and Violet portals and loop around a closed maze until killed. Completed laps do not remove mobs.

Survive **20 stages**, with **120 mobs in stage 1**, increasing by 12 per stage to **348 in stage 20**. Spawns are distributed evenly among the three portals; every fifth stage includes one boss from each portal. Health and spawn pressure increase with each stage.

The limit is **100 living mobs at any instant**, not 100 total stage spawns. Exactly 100 is safe; the 101st living mob ends the run immediately. Dead mobs and queued spawns do not count. A population bar warns at 80 living mobs. You can build, upgrade, and sell while portals spawn. Clear all queued and living mobs to finish a stage, collect a bonus, and prepare for the next. Your gold, towers, upgrades, score, and statistics remain between stages.

Circle Defense adds damage weaknesses and resistances. See **Weaknesses & how to play** for exact multipliers; each selected tower also lists its favorable matchups:

| Mob         | Useful counters                                                    |
| ----------- | ------------------------------------------------------------------ |
| Grunt       | Archer arrows deal 25% extra damage                                |
| Runner      | Machine Gun rapid fire deals 60% extra damage; frost slows runners |
| Armored     | Cannon explosives deal 60% extra damage; snipers pierce armor      |
| Tank        | Sniper precision deals 50% extra damage                            |
| Regenerator | Frost deals 60% extra damage and stops regeneration for 3 seconds  |
| Warden      | Sniper precision deals 35% extra damage                            |

Armor still applies after the damage multiplier. Some mobs resist certain damage types; for example, armor resists arrows and rapid fire, and Wardens resist frost and rapid fire. Tower artwork does not determine its damage type: this is configured independently in its specs.

Use the stage briefing for upcoming enemy counts and portal totals. Select a placed tower to choose **Oldest mob**, **Strongest mob**, or **Weakest mob** targeting. Oldest uses distance travelled since spawning, so later portals do not get an artificial priority. Mixed defenses, overlapping ranges, and frost support help prevent congestion.

Circle records are saved separately from Tower Defense records. Circle runs are not checkpointed; restart begins at stage 1. Starting Circle Defense does not overwrite the Tower Defense campaign checkpoint.

## Tower Defense

Choose **Tower Defense → Start campaign**. You begin with **200 gold and 20 lives**. Select a tower from the right panel and click an empty grass tile. You can keep placing that type until you press Escape or select an existing tower. The preview shows attack range; green means valid, red means blocked or unaffordable. On a tablet, select a tower and tap a grass tile.

| Map               | Waves | Terrain and strategy                                             |
| ----------------- | ----- | ---------------------------------------------------------------- |
| The Woodland Pass | 1–20  | Forest bends; establish a balanced defense                       |
| River Crossing    | 21–40 | Long switchback; overlap ranges across the road                  |
| Ember Canyon      | 41–60 | Tight turns and armored enemies; use splash and snipers          |
| Frostfall Pass    | 61–80 | Fast and regenerating enemies; concentrate fire at central bends |

After clearing a map, choose **Next map**. Remaining gold, lives, score, and statistics carry forward. Towers are packed up at **100% of their purchase and upgrade investment** and added to your next map's build budget. The new battlefield starts empty. Packing is a transfer of existing resources, so it does not count as newly earned gold. No extra starting gold or lives are awarded between maps. Manual selling during play still refunds 70%.

Campaign health, speed, enemy numbers, and spawn pressure grow across all 80 waves, including map transitions. Later maps continue the assault instead of returning to easy opening waves. Growth is centralized in `js/config/campaign.js`; the campaign uses quadratic health growth to keep the later maps beatable with the accumulated budget.

The campaign saves a checkpoint at the start of each map and when a map is cleared. **Continue** restores the next/current map with the resources at that checkpoint. **Restart map** and **Retry this map** restore the current map's entry checkpoint, including its original gold, lives, score, and statistics. Mid-map combat and purchases are not saved. Clearing the final map removes the completed checkpoint. Sound preferences and personal records remain saved.

Choose **Practice** in the main menu to play any map independently with 200 gold and 20 lives. Practice uses each map's own 20-wave schedule and does not overwrite the campaign checkpoint.

Enemies follow the sandy path from the left entrance to the castle. Towers automatically attack the enemy closest to escaping within their range. Start each wave when ready. There is a four-second regroup after a wave, followed by unlimited preparation time. The game never starts a wave automatically.

Click a placed tower to inspect its damage, range, rate, level, upgrade price, and sell value. Each tower supports **three upgrades**, reaching level 4. Selling returns **70% of the total spent**, rounded down. Defeats and wave bonuses earn gold; selling is a refund and is not counted as earned gold.

| Tower       | Cost | Best use                                                |
| ----------- | ---: | ------------------------------------------------------- |
| Archer      |   50 | Flexible early defense and steady damage                |
| Cannon      |  100 | Explosive area damage against clustered enemies         |
| Frost       |   90 | Slows enemies by 52%; pair with damage towers           |
| Sniper      |  150 | Long range, heavy hits, pierces 75% of armor resistance |
| Machine Gun |  175 | Rapid fire against runners and unarmored enemies        |

Grunts appear first; runners, armored enemies, tanks, and regenerators join as difficulty grows. In practice, introductions vary by map. **Wardens arrive on local waves 5, 10, 15, and 20 on every map**. Escaping enemies cost one life, tanks cost two, and Wardens cost five. Defend all four maps to win the campaign, or all 20 local waves to win a practice run.

Place towers beside bends to cover several stretches of path. Mix area damage, slowing, armor penetration, and rapid fire. Invest in upgrades as health scales up. Early waves can be defended with a few well-placed archers; later waves reward overlapping ranges and mixed defenses.

## Controls

| Action                       | Shortcut                   |
| ---------------------------- | -------------------------- |
| Select tower                 | 1–5                        |
| Cancel placement / selection | Escape                     |
| Next wave                    | Space                      |
| Pause / resume               | P                          |
| Toggle 1× / 2× speed         | F                          |
| Toggle sound                 | M                          |
| Upgrade selected tower       | U                          |
| Sell selected tower          | Delete                     |
| Move battlefield cursor      | Arrow keys                 |
| Build / select at cursor     | Enter, with canvas focused |

Pause freezes movement, spawning, attacks, projectiles, effects, and regroup time. The field guide and restart confirmation also freeze the simulation. Switching away from the tab automatically pauses. Restart asks for confirmation and resets the current map to its entry checkpoint in campaign mode, or to its starting resources in practice. Personal records and sound settings are retained.

Sound starts off. Enable it with the header button or M. Effects use Web Audio after a user gesture. Highest score, highest wave reached, and sound preference are saved in localStorage when available. The game remains playable when storage or audio is unavailable.

## Source

For an editing checklist, spec tables, and copyable tower/enemy examples, see [Editing the game](docs/MODIFYING_GAME.md). The source is formatted throughout; `index.html` has section comments, and the unit definitions list one spec per line.

- `js/content/maps/`: one data file per map, plus its registry.
- `js/content/levels/`: one data file per level, plus its registry and default level.
- `js/content/waves/`: reusable wave-generation presets.
- `js/config/`: shared rules, tower/enemy balance, and continuous campaign difficulty; `js/config.js` re-exports shared combat settings.
- `js/campaign.js`: campaign schedules, resource checkpoints, and checkpoint validation.
- `js/config/circle.js`: Circle population cap, starting gold, stage scaling, and frost suppression.
- `js/config/matchups.js`: damage-type labels and Circle matchup helpers.
- `js/content/maps/circle-labyrinth.js`: closed maze and three portal locations.
- `js/content/waves/circle.js`: Circle stage queues and progression.
- `js/circle-ui.js`: defense-mode chooser, Circle HUD, briefing, weaknesses, and result screens.
- `js/viewport.js`, `css/mobile.css`: landscape enforcement, mobile canvas sizing/zoom, and fullscreen.
- `js/cheats.js`, `js/cheat-sequence.js`, `js/config/cheats.js`: hidden controls and configuration.
- `js/map.js`: generic grid, path interpolation, and environment drawing.
- `js/towers.js`, `enemies.js`, `projectiles.js`: combat entities.
- `js/waves.js`: runs the selected level's schedule and progression.
- `js/effects.js`: effects, generated sound, and local persistence.
- `js/game.js`: state, controls, fixed-step simulation, and canvas rendering.
- `js/ui.js`: shop, inspection, HUD, dialogs, and controls.
- `js/main.js`: application entry point.
- `server.js`: optional dependency-free local HTTP server.

The main loop uses requestAnimationFrame with a 120 Hz fixed simulation step and bounded frame deltas. Speed scales simulation time consistently for all systems. Canvas backing resolution adapts to device pixel ratio; input coordinates use its current displayed bounds.

## Add a map or level

See [the map and level authoring guide](docs/ADDING_LEVELS.md) for complete examples.

1. Add a map file under `js/content/maps/` and register it in that folder's `index.js`.
2. Add a level file under `js/content/levels/`, referencing a registered map and supplying a wave array or `createClassicWaves()` preset.
3. Register the level in `js/content/levels/index.js`. It automatically appears in the practice picker and as the next campaign stage in registry order.

Maps and levels are independent: several levels can share a map. Grid sizes, paths, starting resources, wave counts, boss alerts, bonuses, and victory conditions are read from the selected content. Restart keeps the same map and restores its entry resources in campaign mode. The original Woodland Pass remains the first campaign map. Personal records remain global across maps.

## Verify

To maintain the formatting, run `npm install` once, then `npm run format` after editing or `npm run format:check` to check it. VS Code format-on-save is configured for the recommended Prettier extension. Prettier is a development dependency; running the game itself requires no installed packages.

```sh
npm test
```

Tests exercise paths, placement, spending, upgrades/refunds, combat, pause, wave scheduling, defeat, checkpoint saving/restoring, map transfers, rising campaign difficulty, and victory. All four maps are simulated independently, and a full 80-wave campaign is verified using only the normal starting budget, carried investments, and earned gold. See `TESTING.md` for browser checks and balance verification.

Circle tests also check repeated looping, fair portal distribution, the exact 100/101 boundary, weaknesses/resistances, regeneration suppression, target priorities, separate records, and a complete paid 20-stage victory.
