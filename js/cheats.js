import { CHEAT_RULES } from './config/cheats.js';
import { CheatSequence } from './cheat-sequence.js';

export class Cheats {
  constructor(game) {
    this.game = game;
    this.visible = CHEAT_RULES.visible;
    this.sequence = new CheatSequence();
    this.host = document.getElementById('cheats');
    this.button = document.getElementById('toggle-cheats');
    this.form = document.getElementById('cheat-form');
    this.amount = document.getElementById('cheat-gold');
    this.merge = document.getElementById('cheat-merge');
    this.strong = document.getElementById('cheat-strong');
    this.host.hidden = !this.visible;
    const scoreCard = document.getElementById('score-card');
    scoreCard.addEventListener('keydown', (event) => {
      if (['Enter', ' '].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        scoreCard.click();
      }
    });
    document.addEventListener('click', (event) => {
      if (game.mode !== 'circle' || game.orientationBlocked || game.ui.modalOpen) {
        this.sequence.step = 0;
        return;
      }
      const path = event.composedPath();
      const target = path.includes(document.getElementById('game-title'))
        ? 'title'
        : path.includes(document.getElementById('score-card'))
          ? 'score'
          : 'other';
      if (this.sequence.press(target)) {
        this.visible = !this.visible;
        this.host.hidden = !this.visible;
        if (!this.visible) this.close();
        game.message(this.visible ? 'Developer controls unlocked.' : 'Developer controls hidden.');
      }
    });
    this.button.addEventListener('click', () => {
      if (this.form.hidden) {
        this.form.hidden = false;
        this.button.setAttribute('aria-expanded', 'true');
        this.amount.value = String(game.gold);
        this.sync();
      } else this.close();
    });
    document.getElementById('close-cheats').addEventListener('click', () => this.close());
    this.amount.addEventListener('input', () => this.amount.setCustomValidity(''));
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = Number(this.amount.value);
      if (!this.amount.value.trim() || !Number.isSafeInteger(value) || value < 0) {
        this.amount.setCustomValidity('Enter a whole number from 0 to 9007199254740991.');
        this.amount.reportValidity();
        return;
      }
      if (this.visible && game.setGold(value))
        game.message(`Gold balance set to ${value.toLocaleString()}.`);
    });
    this.merge.addEventListener('change', () => {
      if (this.visible) game.setCheat('mergeEnabled', this.merge.checked);
    });
    this.strong.addEventListener('change', () => {
      if (this.visible) game.setCheat('strongEnabled', this.strong.checked);
    });
  }

  close() {
    this.form.hidden = true;
    this.button.setAttribute('aria-expanded', 'false');
  }
  sync() {
    this.merge.checked = this.game.mergeEnabled;
    this.strong.checked = this.game.strongEnabled;
    const disabled =
      this.game.state !== 'playing' || this.game.orientationBlocked || this.game.ui.modalOpen;
    this.form.querySelectorAll('input,button[type="submit"]').forEach((element) => {
      element.disabled = disabled;
    });
  }
}
