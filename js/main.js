import { Game } from './game.js';
import { UI } from './ui.js';
import { Viewport } from './viewport.js';
import { Cheats } from './cheats.js';
const game = new Game(document.getElementById('game'));
new UI(game);
game.cheats = new Cheats(game);
new Viewport(game);
game.run();
