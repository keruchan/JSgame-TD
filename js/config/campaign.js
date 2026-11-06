// Continuous difficulty across maps. Quadratic health growth avoids an
// exponential wall while still making every later wave stronger.
export const CAMPAIGN_BALANCE = {
  healthStep: 0.09,
  speedStep: 0.006,
  mapHealthStep: 0.05,
  spawnInterval: 0.9,
  intervalReduction: 0.006,
  minimumInterval: 0.34,
};
