// Landscape enforcement, mobile canvas sizing/zoom, and fullscreen fallbacks.
export class Viewport {
  constructor(game) {
    this.game = game;
    game.viewport = this;
    this.zoomed = false;
    this.app = document.querySelector('.app');
    this.wrap = document.querySelector('.canvas-wrap');
    this.screen = document.getElementById('screen');
    this.rotate = document.getElementById('orientation-screen');
    this.portrait = matchMedia(
      '(max-width: 900px) and (orientation: portrait), (pointer: coarse) and (orientation: portrait)',
    );
    this.compact = matchMedia(
      '(orientation: landscape) and (max-height: 650px) and (max-width: 1200px), (pointer: coarse) and (orientation: landscape) and (max-width: 1400px)',
    );
    this.button = document.getElementById('fullscreen');
    this.status = document.getElementById('fullscreen-status');
    this.button.addEventListener('click', () => this.toggleFullscreen());
    document.getElementById('zoom-map').addEventListener('click', () => {
      this.zoomed = !this.zoomed;
      this.fitCanvas();
    });
    this.portrait.addEventListener('change', () => this.sync());
    this.compact.addEventListener('change', () => this.sync());
    window.addEventListener('resize', () => this.sync());
    document.addEventListener('fullscreenchange', () => {
      this.fullscreenState();
      this.sync();
    });
    document.addEventListener('webkitfullscreenchange', () => {
      this.fullscreenState();
      this.sync();
    });
    this.observer = new ResizeObserver(() => this.fitCanvas());
    this.observer.observe(this.wrap);
    const root = document.documentElement;
    this.button.disabled =
      !(root.requestFullscreen || root.webkitRequestFullscreen) ||
      !(document.exitFullscreen || document.webkitExitFullscreen) ||
      document.fullscreenEnabled === false ||
      document.webkitFullscreenEnabled === false;
    if (this.button.disabled) this.button.title = 'Fullscreen is not available in this browser.';
    this.fullscreenState();
    this.sync();
  }

  sync() {
    const blocked = this.portrait.matches;
    this.game.orientationBlocked = blocked;
    this.app.inert = blocked;
    this.rotate.hidden = !blocked;
    document.body.classList.toggle('portrait-blocked', blocked);
    document.body.classList.toggle('mobile-landscape', this.compact.matches);
    if (blocked) {
      if (this.screen.open) {
        this.suspendedDialog = true;
        this.screen.close();
      }
      this.game.mergeSource = null;
      this.game.hover = null;
      this.game.cheats?.close();
    } else if (this.suspendedDialog) {
      this.suspendedDialog = false;
      if (this.game.ui.modalOpen && !this.screen.open) this.screen.showModal();
    }
    this.game.accumulator = 0;
    this.game.lastTime = performance.now();
    this.fitCanvas();
    this.game.ui.refresh(true);
  }

  fitCanvas() {
    const canvas = this.game.canvas;
    if (!this.compact.matches || this.portrait.matches) {
      canvas.style.width = '';
      canvas.style.height = '';
      this.wrap.classList.remove('zoomed');
      return;
    }
    const width = this.wrap.clientWidth - 4,
      height = this.wrap.clientHeight - 4;
    if (width <= 0 || height <= 0) return;
    const grid = this.game.map.grid,
      scale = Math.min(width / grid.width, height / grid.height) * (this.zoomed ? 2 : 1);
    const nextWidth = `${Math.floor(grid.width * scale)}px`,
      nextHeight = `${Math.floor(grid.height * scale)}px`;
    if (canvas.style.width !== nextWidth) canvas.style.width = nextWidth;
    if (canvas.style.height !== nextHeight) canvas.style.height = nextHeight;
    this.wrap.classList.toggle('zoomed', this.zoomed);
    const button = document.getElementById('zoom-map');
    button.textContent = this.zoomed ? 'Full field' : 'Larger tiles';
    button.setAttribute('aria-pressed', String(this.zoomed));
  }

  fullscreenState() {
    const active = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    this.button.textContent = active ? 'Exit fullscreen' : 'Fullscreen';
    this.button.setAttribute('aria-pressed', String(active));
    document.querySelectorAll('[data-fullscreen]').forEach((button) => {
      button.textContent = this.button.textContent;
      button.disabled = this.button.disabled;
      button.setAttribute('aria-pressed', String(active));
      button.title = this.button.title;
    });
  }

  async toggleFullscreen() {
    this.status.hidden = true;
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        await exit.call(document);
      } else {
        const root = document.documentElement,
          enter = root.requestFullscreen || root.webkitRequestFullscreen;
        await enter.call(root);
        try {
          await screen.orientation?.lock?.('landscape');
        } catch {}
      }
    } catch {
      this.status.textContent =
        'Fullscreen could not be changed. Try again or use your browser’s fullscreen controls.';
      this.status.hidden = false;
    }
    this.fullscreenState();
  }
}
