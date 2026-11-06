import { CIRCLE_RULES } from '../../config/circle.js';
import { createCircleStages } from '../waves/circle.js';

export const circleLabyrinthLevel = {
  id: 'circle-labyrinth',
  mode: 'circle',
  name: 'Circle Defense',
  mapId: 'circle-labyrinth',
  difficulty: 'Population control',
  description:
    'Three portals. One endless maze. Defeat the crowds before the living population exceeds 100.',
  rules: { ...CIRCLE_RULES },
  waves: createCircleStages(),
};
