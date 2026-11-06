# Verification

Verified locally on November 6, 2026.

## Automated simulation

`npm test`: **47 tests passed**. Tests use the real game, campaign, Circle Defense, entity, wave, content, unit-spec, and cheat modules; browser-only rendering/audio/storage boundaries are stubbed.

The full-game test begins with 200 gold, buys four archers, adds a mix of all five tower types as gold becomes available, and upgrades within the available budget. It completes waves 1–20 with 20 lives and 12 towers, including the four boss waves. It never injects extra gold. This establishes a viable strategy, rather than claiming exhaustive balance across every placement.

A separate no-defense test confirms leaking enemies removes lives, causes defeat at zero, and resets correctly. Other tests cover duplicate death protection, armored damage reduction and penetration, slowing expiry, regeneration caps, projectile impacts, splash damage, path continuity, invalid placement, selecting existing towers during placement, upgrade limits, exact refunds, pause, overlapping wave prevention, and delayed final victory.

Content tests also load a registered fixture map with a 10 × 8 grid and 40-pixel cells, custom obstacles and colors, and a two-wave fixture level. They check a boss on wave 1, custom starting resources, health/speed multipliers, nonstandard bonuses, intermission, victory on wave 2, restarting the same level, switching back to the default, immutable spawn queues, and authoring validation. The playable catalog contains Woodland Pass, River Crossing, Ember Canyon, and Frostfall Pass, each with 20 waves.

Each new map passes a complete standalone 20-wave simulation with 20 lives remaining. The campaign test then completes all 80 waves with the normal starting 200 gold and 20 lives, paying for every purchase and upgrade, and transferring remaining gold plus full tower investment between maps. It finishes with 20 lives. This establishes at least one viable strategy; it does not establish that every tower placement is equally effective.

Campaign tests assert increasing health, speed, spawn pressure, and bonuses across every wave and map boundary. They also verify exact resource transfer, no duplicate packing refunds, cumulative score/statistics, checkpoint saving and resuming, retry without farming resources, final checkpoint removal, malformed checkpoint rejection, and graceful failure when localStorage is blocked.

All JavaScript modules and the local server also pass `node --check`.

Developer-control tests cover the exact unlock sequence and interrupted sequences, safe total-gold input, locked/unlocked Titan recruitment, preserving placed Titans after locking, combining two and three towers, combined upgrade costs and correct whole-gold sell refunds, rejecting incompatible or in-combat fusion, portrait simulation freezing without changing manual pause, and carrying unlock flags across campaign checkpoints/transitions/retries. The 80-wave and 20-stage balance runs keep cheats off.

Circle Defense tests cover the larger closed maze and three distinct portals, fair portal distribution, repeated looping without life loss or removal, increasing stage sizes above 100 total mobs, the exact safe-100/lose-101 boundary, excluding dead mobs from population, losing before a stage finishes spawning, pausing, weaknesses/resistances with armor, frost regeneration suppression, target priorities, stage-clear gating, restart, mode separation, and independent personal records. A paid mixed defense completes all 20 stages and defeats all 4,680 mobs with a peak population of 58. No gold or lives are injected into this balance run.

After source formatting, new unit tests verify that a tower variant can be purchased, upgraded to its configured cap, and attack using its specs without new engine code. An enemy variant uses its configured armor/regeneration and can act as a generated boss with its own displayed name. Invalid prices, rates, armor, or slow durations are checked at startup. `npm run format:check` checks all maintained source and documentation files.

## Browser checks

The latest mobile pass follows the Battalion reference's landscape requirement. Chrome touch emulation verified portrait blocking and menu restoration, automatic freeze/resume while preserving manual pause, fixed-screen layouts at 568 × 320, 667 × 375, 844 × 390, 932 × 430, and 1024 × 768, independently scrolling shop/details, exact touch placement, zoom/pan with no accidental builds, and no page overflow. Portrait sizes now intentionally show the rotate screen; the earlier portrait-layout observations below describe the prior UI.

The hidden 5-title/1-Score/1-title sequence was exercised through touch to show and hide controls. Gold changes, fusion and its ×2 investment badge, unlocking and placing Titan, preserving enabled settings after hiding controls, fullscreen entry/exit, and handling a rejected fullscreen request passed. The full 20-stage Circle browser run also passed after these changes, preserving the Tower checkpoint. No page errors occurred. Screenshots include `mobile-portrait.png`, `mobile-landscape.png`, `mobile-zoom.png`, `mobile-small-fresh.png`, and `mobile-titan.png`.

Mobile checks used Chrome's touch and viewport emulation. Physical Android/iOS devices and Safari were not tested; unsupported fullscreen or orientation locking is handled through capability checks and the rotate overlay.

Headless local Google Chrome, controlled with Playwright, verified the actual served application at desktop (1440 × 1100), tablet (768 × 1024), and narrow mobile (390 × 844) sizes.

- Start screen, field guide, Escape behavior, and Play.
- Invalid path placement with an informative message.
- Building, selecting an existing tower, upgrading, and selling with exact gold totals.
- Restart confirmation, cancel, and confirmed reset.
- Keyboard tower selection and placement cancellation.
- Wave 1 completion with four archers, 20 lives, and 86 gold after rewards and bonus.
- Pause banner and resume, 2× speed, and sound toggle.
- High score and sound preference surviving reload.
- Accurate canvas input after resizing to tablet width.
- No horizontal page overflow at tablet or mobile width.
- **No browser console errors or uncaught exceptions** during these checks.

After the content refactor, the same browser checks passed again. A second Chrome run supplied a test map and level through intercepted registry modules without changing the production catalog. It verified that the picker discovered the new level, the HUD and field guide used its two-wave schedule and boss timing, the canvas adapted to a 10 × 8 grid at device pixel ratio 2, blocked tiles rejected placement, custom bonuses were paid, victory occurred after wave 2, replay/restart retained the level, and choosing the original level restored its grid and resources. No console errors occurred.

Screenshots are saved in `artifacts/`: `desktop.png`, `desktop-paused.png`, `tablet.png`, and `mobile.png`.

The November 4 browser pass verified all three new maps through the actual UI: map selection, obstacles/path rejection, four affordable tower placements, moving enemies, pause/resume, and themed rendering. It also ran the full 80-wave campaign using accelerated fixed-step simulation in the browser and real game/UI code. Each map ended with 20 lives. Next-map buttons transferred the exact remaining gold plus tower investment, score persisted, reloading offered Continue with the same checkpoint resources, restarting restored that checkpoint, and the final result showed 80/80 with no further map. Tablet layout was checked at 768 pixels. No console errors or uncaught exceptions occurred. New screenshots include `river-crossing.png`, `ember-canyon.png`, `frostfall-pass.png`, `frostfall-tablet.png`, and `campaign-victory.png`.

The November 6 browser pass repeated the map and full 80-wave campaign checks after formatting. An additional run supplied a sixth tower and a new enemy through intercepted configuration modules, leaving the production unit catalog unchanged. The shop and key 6 discovered the new tower, reused artwork rendered, prices were deducted correctly, its two-upgrade limit appeared correctly in the inspection panel, and the new boss spawned with its own name in the wave alert. The field guide displayed six shortcuts. No page errors occurred; `artifacts/custom-unit.png` records this check.

Circle Defense browser checks verified the initial Tower/Circle choice, setup and weakness table, the three-portal loop, valid/invalid placement, target priority changes, upgrades, restart, pause and speed controls, defeat at exactly 101 living mobs, and a complete paid 20-stage run using accelerated fixed-step simulation in real game/UI code. The run finished with zero living mobs, peak population 58, and 5,431 remaining gold. Circle bests were saved independently and the pre-existing Tower campaign checkpoint was unchanged. Returning to Tower Defense restored the correct labels and resources. Tablet placement at 768 pixels and lack of horizontal page overflow at 390 pixels were checked. No console errors or uncaught exceptions occurred. Screenshots: `defense-mode-choice.png`, `circle-defense.png`, `circle-defeat.png`, `circle-victory.png`, and `circle-tablet.png`.

The source has no production dependencies. Browser automation used a temporary Playwright installation outside the project and the installed Chrome browser. Audio controls and Web Audio initialization were exercised; audible sound quality was not assessed in headless mode. Physical touch devices and browsers other than Chrome were not tested. Full runs were verified through deterministic and accelerated browser simulation, rather than playing all 80 waves in real time.
