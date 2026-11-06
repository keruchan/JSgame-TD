import { TOWERS, RULES, ENEMIES } from './config.js';
import { LEVELS } from './content/index.js';
import { validCheckpoint, campaignWaveCount } from './campaign.js';
import {
  showModeChoice,
  showCircleStart,
  refreshModeHUD,
  circleTowerDetails,
  showCircleHelp,
  showCircleResult,
} from './circle-ui.js';
const $ = (id) => document.getElementById(id);
const number = (n) => Math.floor(n).toLocaleString();
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
export class UI {
  constructor(game) {
    this.game = game;
    this.modalOpen = false;
    this.inspectKey = '';
    this.toastTimer = null;
    game.ui = this;
    $('tower-shop').innerHTML = Object.entries(TOWERS)
      .map(
        ([key, t], i) => /* HTML */ `
          <button
            class="tower-card"
            data-tower="${key}"
            aria-pressed="false"
            title="${t.description}"
          >
            <span class="tower-icon" style="--tower-color:${t.color}">${t.icon}</span>
            <span>
              <span class="tower-name">${t.name}</span>
              <span class="tower-description">${t.role}</span>
            </span>
            <span class="tower-price">
              ${t.cost}
              <small>${i < 9 ? i + 1 : ''}</small>
            </span>
          </button>
        `,
      )
      .join('');
    document.querySelectorAll('[data-tower]').forEach((b) =>
      b.addEventListener('click', () => {
        game.audio.unlock();
        game.chooseTower(b.dataset.tower);
      }),
    );
    $('start-wave').addEventListener('click', () => {
      game.audio.unlock();
      game.startWave();
    });
    $('pause').addEventListener('click', () => game.togglePause());
    $('speed').addEventListener('click', () => game.toggleSpeed());
    $('sound').addEventListener('click', () => {
      game.audio.toggle();
      this.refresh();
    });
    $('restart').addEventListener('click', () => this.confirmRestart());
    $('help').addEventListener('click', () => this.showHelp());
    $('mobile-help').addEventListener('click', () => this.showHelp());
    $('screen').addEventListener('cancel', (e) => {
      e.preventDefault();
      if (this.dialogKind === 'help' && this.game.state === 'start') this.showStart();
      else if (this.dialogKind === 'help' || this.dialogKind === 'confirm') this.close();
    });
    const shortcuts = `KEYS 1-${Math.min(9, game.availableTowerTypes.length)}`;
    $('tower-shortcuts').textContent = shortcuts;
    $('game').setAttribute(
      'aria-label',
      `Tower defense battlefield. Select a tower with keys 1-${Math.min(9, game.availableTowerTypes.length)}, use arrow keys to move the placement cursor, and Enter to build or select.`,
    );
    this.refresh(true);
    showModeChoice(this);
  }

  toast(text) {
    $('toast').textContent = text;
    $('toast').classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3000);
  }

  clearToast() {
    clearTimeout(this.toastTimer);
    $('toast').classList.remove('visible');
    $('toast').textContent = '';
  }

  refresh(force = false) {
    const g = this.game,
      w = g.waves;
    const set = (id, text) => {
      if ($(id).textContent !== text) $(id).textContent = text;
    };
    set('wave', `${String(Math.max(1, w.current)).padStart(2, '0')} / ${w.count}`);
    set('lives', String(g.lives));
    set('gold', number(g.gold));
    set('score', number(g.score));
    set('best-score', number(g.storage.bestScore));
    set('best-wave', g.storage.bestWave ? String(g.storage.bestWave) : '—');
    set('map-name', g.level.map.name);
    set(
      'map-tag',
      g.campaign
        ? `MAP ${g.campaign.index + 1} / ${LEVELS.length} · WAVE ${g.level.waveOffset + Math.max(1, w.current)} / ${campaignWaveCount()}`
        : `${g.level.difficulty ?? 'Classic'} · ${w.count} WAVES`,
    );
    set('brand-subtitle', g.level.name.toUpperCase());
    document.title = `Tower Defense · ${g.level.name}`;
    set('sound', `♪ ${g.audio.enabled ? 'ON' : 'OFF'}`);
    $('sound').setAttribute('aria-label', g.audio.enabled ? 'Disable sound' : 'Enable sound');
    const playing = g.state === 'playing';
    set(
      'start-wave',
      w.active
        ? 'Wave in progress'
        : w.breakRemaining > 0
          ? `Regroup · ${Math.ceil(w.breakRemaining)}s`
          : w.current === w.count
            ? 'All waves cleared'
            : `Start wave ${w.current + 1}  →`,
    );
    $('start-wave').disabled = !playing || w.active || g.paused || w.breakRemaining > 0;
    set('pause', g.paused ? '▶ Resume' : 'Ⅱ Pause');
    $('pause').disabled = !playing;
    $('pause-banner').hidden = !g.paused;
    set('speed', `${g.speed}× Speed`);
    $('speed').disabled = !playing;
    set(
      'wave-status',
      g.state === 'victory'
        ? 'The base is safe. Well defended.'
        : g.state === 'over'
          ? 'The line has fallen.'
          : g.paused
            ? 'Paused · take your time'
            : w.active
              ? `Wave ${w.current} · ${w.hasBoss ? `${w.bossNames.join(' + ')} assault` : 'Defend the base'}`
              : w.current
                ? `Wave ${w.current} cleared · +${w.lastBonus} bonus gold`
                : 'Ready when you are',
    );
    set(
      'enemy-count',
      w.active ? `${w.total - w.resolved} enemies remaining` : 'Build, upgrade, and prepare',
    );
    $('wave-progress').style.width = `${w.total ? (w.resolved / w.total) * 100 : 0}%`;
    document.querySelectorAll('[data-tower]').forEach((b) => {
      b.hidden = !g.availableTowerTypes.includes(b.dataset.tower);
      const shortcut = b.querySelector('.tower-price small');
      if (shortcut)
        shortcut.textContent =
          g.availableTowerTypes.indexOf(b.dataset.tower) < 9
            ? String(g.availableTowerTypes.indexOf(b.dataset.tower) + 1)
            : '';
      b.classList.toggle('selected', g.buildType === b.dataset.tower);
      b.classList.toggle('unaffordable', g.gold < TOWERS[b.dataset.tower].cost);
      b.setAttribute('aria-pressed', String(g.buildType === b.dataset.tower));
      b.disabled = !playing || g.paused;
    });
    const key = g.selected
      ? `${g.selected.col},${g.selected.row},${g.selected.level}`
      : g.buildType || 'empty';
    if (force || key !== this.inspectKey) {
      this.inspectKey = key;
      this.inspection();
    }
    const upgrade = $('upgrade');
    if (upgrade) upgrade.disabled = !g.interactive || g.selected.upgradeCost === null;
    const sell = $('sell');
    if (sell) sell.disabled = !g.interactive;
    const priority = $('target-priority');
    if (priority) priority.disabled = !g.interactive;
    refreshModeHUD(this);
    $('tower-shortcuts').textContent = `KEYS 1-${Math.min(9, g.availableTowerTypes.length)}`;
    const merge = $('merge-tower');
    if (merge) merge.disabled = !g.interactive || g.waves.active;
    g.cheats?.sync();
  }

  inspection() {
    const g = this.game,
      t = g.selected,
      type = t?.type || g.buildType;
    if (!type) {
      $('inspection').innerHTML = /* HTML */ `
        <div class="empty-inspection">
          <div class="crosshair">⌖</div>
          <h2>A good defense starts here.</h2>
          <p>
            Click a tower on the field to view
            <br />
            its stats, upgrade, or sell.
          </p>
        </div>
      `;
      return;
    }
    const c = TOWERS[type],
      s = t?.stats || c,
      maxLevel = c.upgrades.length + 1;
    $('inspection').innerHTML = /* HTML */ `
      <div class="inspection-title">
        <span class="tower-icon" style="--tower-color:${c.color}">${c.icon}</span>
        <div>
          <h2>${c.name}</h2>
          <div class="level">
            ${t
              ? `Level ${t.level} / ${maxLevel}${t.level === maxLevel ? ' · MAX' : ''}`
              : 'Ready to build'}
          </div>
          ${t?.mergedCount > 1
            ? `<div class="fusion-strength">×${t.mergedCount} combined strength</div>`
            : ''}
        </div>
      </div>
      <div class="inspection-actions">
        ${t
          ? /* HTML */ `
              <button id="upgrade" class="primary">
                ${t.upgradeCost === null ? 'Fully upgraded' : `Upgrade · ${t.upgradeCost} gold ↑`}
              </button>
              <button id="sell" class="sell-button">
                Sell for ${t.sellValue} gold · ${Math.round(RULES.refund * 100)}% refund
              </button>
              ${g.mergeEnabled
                ? `<button id="merge-tower" class="secondary merge-button">${g.mergeSource ? 'Cancel fusion selection' : 'Fusion · choose a matching tower'}</button><p class="merge-hint">Same type and level. Between waves only. Damage and investment combine.</p>`
                : ''}
            `
          : '<p class="shop-tip">Green tile = ready to place<br>Red tile = unavailable</p>'}
      </div>
      <p class="muted">${c.description}</p>
      <dl class="stats-grid">
        <div>
          <dt>Damage${c.splash ? ' · area' : ''}</dt>
          <dd>${Math.round(s.damage)}</dd>
        </div>
        <div>
          <dt>Range</dt>
          <dd>${(s.range / g.map.grid.cell).toFixed(1)} tiles</dd>
        </div>
        <div>
          <dt>Fire rate</dt>
          <dd>${s.rate.toFixed(2)} / sec</dd>
        </div>
        <div>
          <dt>${t ? 'Invested' : 'Build cost'}</dt>
          <dd class="gold">${t ? t.spent : c.cost} gold</dd>
        </div>
      </dl>
      ${circleTowerDetails(this, t, type)}
    `;
    $('upgrade')?.addEventListener('click', () => g.upgrade());
    $('sell')?.addEventListener('click', () => g.sell());
    $('merge-tower')?.addEventListener('click', () => g.beginMerge());
    $('target-priority')?.addEventListener('change', (event) => {
      if (g.interactive && g.selected) g.selected.priority = event.target.value;
    });
  }

  open(kind, html) {
    this.dialogKind = kind;
    this.modalOpen = true;
    $('screen-content').innerHTML = html;
    const tools = document.createElement('div');
    tools.className = 'dialog-tools';
    const fullscreen = document.createElement('button');
    fullscreen.type = 'button';
    fullscreen.className = 'icon-button';
    fullscreen.dataset.fullscreen = '';
    fullscreen.textContent = 'Fullscreen';
    fullscreen.addEventListener('click', () => this.game.viewport?.toggleFullscreen());
    tools.append(fullscreen);
    $('screen-content').prepend(tools);
    this.game.viewport?.fullscreenState();
    $('screen-content').querySelector('h2')?.setAttribute('id', 'screen-title');
    if (!$('screen').open) $('screen').showModal();
  }

  close() {
    this.modalOpen = false;
    $('screen').close();
    this.game.accumulator = 0;
    this.game.canvas.focus({ preventScroll: true });
    this.refresh();
  }

  showStart() {
    if (this.selection === 'circle') {
      showCircleStart(this);
      return;
    }
    const g = this.game,
      l = g.level,
      practice = this.playMode === 'practice',
      saved = g.storage.loadCampaign?.(),
      canResume = validCheckpoint(saved);
    this.open(
      'start',
      /* HTML */ `
        <div class="dialog-emblem">♜</div>
        <span class="eyebrow">
          ${practice
            ? 'CHOOSE YOUR DEFENSE'
            : `${LEVELS.length} MAPS · ${campaignWaveCount()} WAVES`}
        </span>
        <h2>${practice ? escapeHtml(l.name) : 'One army.<br>A longer road.'}</h2>
        <label class="level-picker" for="mode-select">
          Game mode
          <select id="mode-select">
            <option value="campaign" ${!practice ? ' selected' : ''}>
              Campaign · resources carry across maps
            </option>
            <option value="practice" ${practice ? ' selected' : ''}>Practice · a single map</option>
          </select>
        </label>
        <label class="level-picker" for="level-select" ${practice ? '' : ' hidden'}>
          Practice map
          <select id="level-select">
            ${LEVELS.map(
              (level) => /* HTML */ `
                <option value="${escapeHtml(level.id)}" ${level.id === l.id ? ' selected' : ''}>
                  ${escapeHtml(level.name)} · ${level.waves.length} waves
                </option>
              `,
            ).join('')}
          </select>
        </label>
        <p>
          ${practice
            ? escapeHtml(l.description ?? 'Build your defenses and hold the line.')
            : `Defend ${LEVELS.map((level) => escapeHtml(level.name)).join(' → ')}. Gold, lives, score, and your full tower investment carry forward. Every wave grows stronger.`}
        </p>
        <p>
          <span class="gold">
            ${practice ? l.rules.startingGold : LEVELS[0].rules.startingGold} gold
          </span>
          to begin.
          <span class="rose">
            ${practice ? l.rules.startingLives : LEVELS[0].rules.startingLives} lives
          </span>
          to protect.${practice ? '' : ' Your campaign saves at the start of each map.'}
        </p>
        ${!practice && canResume
          ? /* HTML */ `
              <button id="resume-campaign" class="primary">
                Continue · map ${saved.index + 1}
                <span>→</span>
              </button>
            `
          : ''}
        <button id="play" class="${!practice && canResume ? 'secondary' : 'primary'}">
          ${practice ? 'Practice this map' : canResume ? 'New campaign' : 'Start campaign'}
          <span>→</span>
        </button>
        <button id="start-help" class="text-button">How to play</button>
        <button id="back-modes" class="text-button">← Choose defense mode</button>
      `,
    );
    $('mode-select').addEventListener('change', (e) => {
      this.playMode = e.target.value;
      if (this.playMode === 'campaign') g.reset(LEVELS[0].id);
      this.showStart();
    });
    $('level-select').addEventListener('change', (e) => {
      g.reset(e.target.value);
      this.showStart();
    });
    $('play').addEventListener('click', () => {
      this.close();
      if (practice) g.play();
      else g.startCampaign();
    });
    $('resume-campaign')?.addEventListener('click', () => {
      this.close();
      g.startCampaign(saved);
    });
    $('start-help').addEventListener('click', () => this.showHelp());
    $('back-modes').addEventListener('click', () => showModeChoice(this));
  }

  showHelp() {
    if (this.game.mode === 'circle') {
      showCircleHelp(this);
      return;
    }
    const fromStart = this.game.state === 'start',
      bossWaves = this.game.level.waves.flatMap((wave, index) =>
        wave.enemies.some((type) => ENEMIES[type]?.isBoss) ? [index + 1] : [],
      );
    this.open(
      'help',
      /* HTML */ `
        <span class="eyebrow">FIELD GUIDE</span>
        <h2>Make every shot count.</h2>
        <ol class="help-list">
          <li>
            <b>Build your line.</b>
            Select a tower, then click empty grass. Keep building until you press Escape. Click any
            placed tower to inspect it.
          </li>
          <li>
            <b>Use the bends.</b>
            Towers target enemies closest to the exit. Overlapping ranges keep enemies under fire
            for longer.
          </li>
          <li>
            <b>Mix your defenses.</b>
            Cannons punish groups; frost buys time; snipers pierce armor. Select a placed tower to
            inspect its available upgrades.
          </li>
          <li>
            <b>Stay ahead.</b>
            Defeats earn gold. Every cleared wave earns a bonus. Start the next wave when ready,
            after a short regroup.
          </li>
          <li>
            <b>Watch the bosses.</b>
            ${bossWaves.length
              ? `Bosses arrive on waves ${bossWaves.join(', ')} and can cost multiple lives if they escape.`
              : 'This level has no bosses.'}
            Protect your remaining lives at every bend.
          </li>
        </ol>
        <p>
          <kbd>1–${Math.min(9, this.game.availableTowerTypes.length)}</kbd>
          choose tower ·
          <kbd>ESC</kbd>
          cancel ·
          <kbd>U</kbd>
          upgrade
          <br />
          <kbd>SPACE</kbd>
          next wave ·
          <kbd>P</kbd>
          pause ·
          <kbd>F</kbd>
          speed ·
          <kbd>M</kbd>
          sound
          <br />
          On the canvas: arrow keys move the cursor, Enter places or selects.
        </p>
        <button id="help-close" class="primary">
          ${fromStart ? 'Back to the pass' : 'Back to game'} →
        </button>
      `,
    );
    $('help-close').addEventListener('click', () => (fromStart ? this.showStart() : this.close()));
  }

  confirmRestart() {
    if (this.game.state === 'start') {
      this.showStart();
      return;
    }
    this.open(
      'confirm',
      /* HTML */ `
        <span class="eyebrow">A FRESH STRATEGY</span>
        <h2>Restart this map?</h2>
        <p>
          ${this.game.campaign
            ? 'Return to this map’s starting checkpoint with the gold, lives, and score you brought into it.'
            : 'Your current run will end.'}
          Your personal records and sound preference are saved.
        </p>
        <div class="confirm-actions">
          <button id="cancel-restart" class="secondary">Keep defending</button>
          <button id="confirm-restart" class="primary">Restart map</button>
        </div>
      `,
    );
    $('cancel-restart').addEventListener('click', () => this.close());
    $('confirm-restart').addEventListener('click', () => {
      this.close();
      this.game.restartRun();
    });
  }

  showResult(won) {
    if (this.game.mode === 'circle') {
      showCircleResult(this, won);
      return;
    }
    const g = this.game,
      next = won ? g.nextCampaignMap : null,
      finished = won && g.campaign && !next;
    const packed = g.towers.reduce((sum, tower) => sum + tower.spent, 0);
    this.open(
      'result',
      /* HTML */ `
        <div class="dialog-emblem">${won ? '⚑' : '♜'}</div>
        <span class="eyebrow">
          ${finished
            ? 'CAMPAIGN COMPLETE'
            : won
              ? `ALL ${g.waves.count} WAVES DEFENDED`
              : 'THE BASE HAS FALLEN'}
        </span>
        <h2>
          ${finished ? 'The road is safe.' : won ? 'The defense holds.' : 'A new plan awaits.'}
        </h2>
        <p>
          ${next
            ? `Next: ${escapeHtml(next.name)}. Your ${number(g.gold)} gold plus ${number(packed)} gold in packed towers will fund your next defense. Lives and score carry forward.`
            : won
              ? `You protected ${escapeHtml(g.level.name)}${finished ? ' and completed every map' : ''}.`
              : 'Every defense teaches you something. Try overlapping ranges, frost support, and upgrades at the bends.'}
        </p>
        <div class="result-stats">
          <span>
            ${g.campaign ? 'Campaign score' : 'Final score'}
            <b>${number(g.score)}</b>
          </span>
          <span>
            ${g.campaign ? 'Campaign wave' : 'Highest wave reached'}
            <b>${g.globalWave} / ${g.campaign ? campaignWaveCount() : g.waves.count}</b>
          </span>
          <span>
            Enemies defeated
            <b>${number(g.stats.defeated)}</b>
          </span>
          <span>
            Total gold earned
            <b>${number(g.stats.earned)}</b>
          </span>
          <span>
            Towers built
            <b>${g.stats.built}</b>
          </span>
          <span>
            Lives remaining
            <b>${g.lives}</b>
          </span>
        </div>
        ${next
          ? /* HTML */ `
              <button id="next-map" class="primary">
                Next map · ${number(g.gold + packed)} gold
                <span>→</span>
              </button>
            `
          : ''}
        <button id="play-again" class="${next ? 'secondary' : 'primary'}">
          ${g.campaign ? 'Retry this map' : 'Defend again'}
          <span>↻</span>
        </button>
        <button id="choose-level" class="text-button">Main menu</button>
      `,
    );
    $('next-map')?.addEventListener('click', () => {
      this.close();
      g.advanceCampaign();
    });
    $('play-again').addEventListener('click', () => {
      this.close();
      g.restartRun();
    });
    $('choose-level').addEventListener('click', () => {
      showModeChoice(this);
    });
  }
}
