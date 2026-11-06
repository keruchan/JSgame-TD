import { CIRCLE_LEVEL, LEVELS } from './content/index.js';
import { ENEMIES } from './config/enemies.js';
import { TOWERS } from './config/towers.js';
import { CIRCLE_RULES, CIRCLE_BALANCE } from './config/circle.js';
import { DAMAGE_TYPES, towerCounters } from './config/matchups.js';

const $ = (id) => document.getElementById(id);
const number = (value) => Math.floor(value).toLocaleString();
const text = (id, value) => {
  if ($(id).textContent !== String(value)) $(id).textContent = String(value);
};

export function showModeChoice(ui) {
  ui.selection = null;
  ui.game.reset(LEVELS[0].id);
  ui.open(
    'mode-choice',
    /* HTML */ `
      <span class="eyebrow">TWO WAYS TO HOLD THE LINE</span>
      <h2>
        Choose your
        <br />
        battlefield.
      </h2>
      <p>Build your defense. Find your strategy.</p>
      <div class="defense-modes">
        <button id="choose-tower-defense" class="mode-card">
          <span class="mode-symbol">♜</span>
          <strong>Tower Defense</strong>
          <span>
            Protect the base. Four maps, 80 campaign waves, and resources that travel with you.
          </span>
          <b>Guard the road →</b>
        </button>
        <button id="choose-circle-defense" class="mode-card circle-card">
          <span class="mode-symbol">◎</span>
          <strong>Circle Defense</strong>
          <span>
            Three portals. An endless looping maze. Clear ${CIRCLE_LEVEL.waves.length} stages
            without exceeding ${CIRCLE_LEVEL.rules.populationLimit} living mobs.
          </span>
          <b>Control the crowd →</b>
        </button>
      </div>
    `,
  );
  $('choose-tower-defense').addEventListener('click', () => {
    ui.selection = 'tower';
    ui.showStart();
  });
  $('choose-circle-defense').addEventListener('click', () => {
    ui.selection = 'circle';
    ui.game.reset(CIRCLE_LEVEL.id);
    ui.showStart();
  });
}

export function showCircleStart(ui) {
  ui.open(
    'start',
    /* HTML */ `
      <div class="dialog-emblem">◎</div>
      <span class="eyebrow">CIRCLE DEFENSE · ${CIRCLE_LEVEL.waves.length} STAGES</span>
      <h2>
        Keep the
        <br />
        crowd moving.
      </h2>
      <p>
        No castle. No finish line. Mobs enter through Amber, Azure, and Violet portals and keep
        circling the labyrinth until defeated.
      </p>
      <div class="circle-rules">
        <span>
          <b>${CIRCLE_RULES.populationLimit}</b>
          living mob limit
        </span>
        <span>
          <b>${CIRCLE_LEVEL.waves[0].enemies.length}–${CIRCLE_LEVEL.waves.at(-1).enemies.length}</b>
          spawns per stage
        </span>
        <span>
          <b>${CIRCLE_RULES.startingGold}</b>
          starting gold
        </span>
      </div>
      <p>
        Clear every mob to advance. Gold and towers stay between stages. Use enemy weaknesses,
        splash damage, and frost support to prevent a pileup.
      </p>
      <button id="play" class="primary">
        Enter the labyrinth
        <span>→</span>
      </button>
      <button id="start-help" class="text-button">Weaknesses & how to play</button>
      <button id="back-modes" class="text-button">← Choose defense mode</button>
    `,
  );
  $('play').addEventListener('click', () => {
    ui.close();
    ui.game.startCircle();
  });
  $('start-help').addEventListener('click', () => ui.showHelp());
  $('back-modes').addEventListener('click', () => showModeChoice(ui));
}

export function refreshModeHUD(ui) {
  const g = ui.game,
    w = g.waves,
    circle = g.mode === 'circle';
  document.body.classList.toggle('circle-mode', circle);
  $('circle-pressure').hidden = !circle;
  $('stage-intel').hidden = !circle;
  text('brand-title', circle ? 'CIRCLE DEFENSE' : 'TOWER DEFENSE');
  text('wave-label', circle ? 'STAGE' : 'WAVE');
  text('resource-label', circle ? 'MOBS' : 'LIVES');
  text('best-wave-label', circle ? 'Highest stage' : 'Highest wave');
  if (!circle) {
    ui.intelKey = '';
    $('lives').classList.remove('population-danger');
    text('field-tip', 'Place towers near bends to make every shot count.');
    return;
  }
  const alive = g.population,
    limit = g.level.rules.populationLimit;
  text('lives', `${alive} / ${limit}`);
  $('lives').classList.toggle('population-danger', alive >= CIRCLE_RULES.warningAt);
  text('best-score', number(g.storage.bestCircleScore ?? 0));
  text('best-wave', g.storage.bestCircleStage || '—');
  text('map-tag', `3 PORTALS · ${g.map.grid.cols} × ${g.map.grid.rows} MAZE`);
  document.title = `Circle Defense · ${g.level.map.name}`;
  text(
    'field-tip',
    'Keep all three portals covered. Frost interrupts regeneration; cannons control crowds.',
  );
  text(
    'pressure-label',
    alive >= CIRCLE_RULES.warningAt ? 'Overcrowding danger' : 'Living population',
  );
  text('pressure-count', `${alive} / ${limit} · ${w.queue.length} still to spawn`);
  $('population-fill').style.width = `${Math.min(100, (alive / limit) * 100)}%`;
  $('circle-pressure').classList.toggle('danger', alive >= CIRCLE_RULES.warningAt);
  text(
    'start-wave',
    w.active
      ? 'Stage in progress'
      : w.breakRemaining > 0
        ? `Regroup · ${Math.ceil(w.breakRemaining)}s`
        : w.current === w.count
          ? 'Labyrinth cleared'
          : `Start stage ${w.current + 1} →`,
  );
  text(
    'wave-status',
    g.state === 'over'
      ? 'The maze is overcrowded.'
      : g.state === 'victory'
        ? 'All stages cleared.'
        : g.paused
          ? 'Paused · take your time'
          : w.active
            ? `Stage ${w.current} · ${w.spawned} / ${w.total} spawned`
            : `${w.current ? `Stage ${w.current} cleared · +${w.lastBonus} gold` : 'Cover the three portals before starting'}`,
  );
  text(
    'enemy-count',
    w.active
      ? `${alive} alive · ${w.total - w.resolved} to defeat`
      : 'Population must stay at 100 or fewer',
  );
  const stageIndex = Math.min(w.count - 1, w.active ? w.current - 1 : w.current),
    definition = g.level.waves[stageIndex];
  const key = `${stageIndex}:${w.active}:${g.state}`;
  if (ui.intelKey !== key) {
    ui.intelKey = key;
    const counts = Object.fromEntries(
      Object.keys(ENEMIES).map((type) => [
        type,
        definition.enemies.filter((t) => t === type).length,
      ]),
    );
    $('stage-intel').innerHTML = /* HTML */ `
      <div class="section-heading">
        <h2>Stage ${stageIndex + 1} briefing</h2>
        <span>${definition.enemies.length} MOBS</span>
      </div>
      <p class="muted">
        ${g.map.portals
          .map(
            (portal, i) => `${portal.name}: ${Math.floor((definition.enemies.length + 2 - i) / 3)}`,
          )
          .join(' · ')}
      </p>
      <div class="enemy-roster">
        ${Object.entries(counts)
          .filter(([, count]) => count)
          .map(
            ([type, count]) =>
              `<span><i style="background:${ENEMIES[type].color}"></i>${ENEMIES[type].name}<b>${count}</b></span>`,
          )
          .join('')}
      </div>
      <p class="shop-tip">
        Use the field guide for weaknesses.
        <br />
        Frost stops regeneration for ${CIRCLE_BALANCE.regenSuppression} seconds.
      </p>
    `;
  }
}

export function circleTowerDetails(ui, tower, type) {
  if (ui.game.mode !== 'circle') return '';
  const spec = TOWERS[type],
    counters = towerCounters(spec.damageType);
  return /* HTML */ `
    <p class="counter-note">
      <b>${DAMAGE_TYPES[spec.damageType] ?? 'Standard'} damage</b>
      <br />
      ${counters.length
        ? `Strong against ${counters.join(', ')}.`
        : 'No special damage bonuses.'}${spec.slow ? ' Frost also interrupts regeneration.' : ''}
    </p>
    ${tower
      ? `<label class="target-control" for="target-priority">Target priority<select id="target-priority"><option value="first"${tower.priority === 'first' ? ' selected' : ''}>Oldest mob</option><option value="strongest"${tower.priority === 'strongest' ? ' selected' : ''}>Strongest mob</option><option value="weakest"${tower.priority === 'weakest' ? ' selected' : ''}>Weakest mob</option></select></label>`
      : ''}
  `;
}

export function showCircleHelp(ui) {
  const fromStart = ui.game.state === 'start';
  ui.open(
    'help',
    /* HTML */ `
      <span class="eyebrow">CIRCLE DEFENSE FIELD GUIDE</span>
      <h2>Break the buildup.</h2>
      <ol class="help-list">
        <li>
          Mobs enter evenly through three portals and loop forever. Completing a lap never removes a
          mob.
        </li>
        <li>
          Each stage spawns more than 100 mobs, but only living mobs count toward the limit. 100 is
          safe; 101 loses the run. Kill while the portals are spawning.
        </li>
        <li>
          Clear the entire stage to earn its bonus. Gold, towers, and upgrades remain for the next
          stage. Build and upgrade during combat too.
        </li>
        <li>
          Frost slows crowds and suppresses regeneration for ${CIRCLE_BALANCE.regenSuppression}
          seconds. Set towers to oldest, strongest, or weakest targets in their inspection panel.
        </li>
      </ol>
      <div class="weakness-table">
        <table>
          <caption>Circle damage multipliers · armor still applies</caption>
          <thead>
            <tr>
              <th>Mob</th>
              <th>Weak against</th>
              <th>Resists</th>
            </tr>
          </thead>
          <tbody>
            ${Object.values(ENEMIES)
              .map((enemy) => {
                const entries = Object.entries(enemy.damageMultipliers ?? {});
                const format = ([type, m]) => `${DAMAGE_TYPES[type] ?? type} ×${m}`;
                return `<tr><th>${enemy.name}</th><td>${
                  entries
                    .filter(([, m]) => m > 1)
                    .map(format)
                    .join(', ') || '—'
                }</td><td>${
                  entries
                    .filter(([, m]) => m < 1)
                    .map(format)
                    .join(', ') || '—'
                }</td></tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>
      <p>
        Keys 1–9 select available towers · Escape cancels · Space starts a stage · P pauses · F
        switches speed · U upgrades. Use arrows and Enter on the canvas for keyboard placement.
      </p>
      <button id="help-close" class="primary">
        ${fromStart ? 'Back to setup' : 'Back to game'} →
      </button>
    `,
  );
  $('help-close').addEventListener('click', () => (fromStart ? showCircleStart(ui) : ui.close()));
}

export function showCircleResult(ui, won) {
  const g = ui.game;
  ui.open(
    'result',
    /* HTML */ `
      <div class="dialog-emblem">◎</div>
      <span class="eyebrow">
        ${won ? `${g.waves.count} STAGES CLEARED` : 'POPULATION LIMIT EXCEEDED'}
      </span>
      <h2>${won ? 'The labyrinth is clear.' : 'The crowd took over.'}</h2>
      <p>
        ${won
          ? 'All three portals have fallen silent. Your defense held through every stage.'
          : g.lossReason}
        ${won
          ? ''
          : 'Try overlapping cannon ranges, frost support, and matching towers to enemy weaknesses.'}
      </p>
      <div class="result-stats">
        <span>
          Final score
          <b>${number(g.score)}</b>
        </span>
        <span>
          Stage reached
          <b>${g.waves.current} / ${g.waves.count}</b>
        </span>
        <span>
          Mobs defeated
          <b>${number(g.stats.defeated)}</b>
        </span>
        <span>
          Peak population
          <b>${g.peakPopulation} / ${g.level.rules.populationLimit}</b>
        </span>
        <span>
          Total gold earned
          <b>${number(g.stats.earned)}</b>
        </span>
        <span>
          Towers built
          <b>${g.stats.built}</b>
        </span>
      </div>
      <button id="play-again" class="primary">Defend the circle again ↻</button>
      <button id="choose-level" class="text-button">Choose defense mode</button>
    `,
  );
  $('play-again').addEventListener('click', () => {
    ui.close();
    g.startCircle();
  });
  $('choose-level').addEventListener('click', () => showModeChoice(ui));
}
