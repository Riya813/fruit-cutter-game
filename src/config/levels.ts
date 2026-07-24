export interface LevelConfig {
  id: number;
  name: string;
  /** ms between spawn events */
  spawnInterval: number;
  /** how many fruits per spawn event [min, max] */
  burst: [number, number];
  /** probability a spawned object is a bomb (-1 life) */
  bombChance: number;
  /** probability a spawned object is a spike orb (streak reset, no life lost) */
  spikeChance: number;
  /** number of rotating laser barriers that block the blade */
  barriers: number;
  /** launch speed multiplier applied to base fruit velocity */
  speedMul: number;
  /** constant horizontal wind acceleration (px/s^2), sign flips periodically */
  wind: number;
  /** level duration in seconds */
  timeLimit: number;
  /** score needed to clear the level */
  targetScore: number;
  /** score at/above which the run counts as "beat par" → 3 stars */
  parScore: number;
  /** weights for [small, medium, big] fruit sizes */
  sizeWeights: [number, number, number];
  /** boss level spawns periodic storm bursts */
  storm: boolean;
}

// Difficulty is spread gradually: each level nudges several axes a little
// instead of one axis a lot. Small fruit are worth more but harder to hit.
// Hazard tiers: bomb = -1 life · spike = streak broken · barrier = blade blocked.
export const LEVELS: LevelConfig[] = [
  { id: 1,  name: 'First Slice',   spawnInterval: 1500, burst: [1, 1], bombChance: 0.03, spikeChance: 0.00, barriers: 0, speedMul: 1.00, wind: 0,   timeLimit: 45, targetScore: 150,  parScore: 400,  sizeWeights: [0, 3, 7], storm: false },
  { id: 2,  name: 'Juice Break',   spawnInterval: 1350, burst: [1, 2], bombChance: 0.05, spikeChance: 0.04, barriers: 0, speedMul: 1.05, wind: 0,   timeLimit: 45, targetScore: 250,  parScore: 550,  sizeWeights: [1, 4, 6], storm: false },
  { id: 3,  name: 'Double Down',   spawnInterval: 1250, burst: [1, 2], bombChance: 0.07, spikeChance: 0.06, barriers: 0, speedMul: 1.10, wind: 0,   timeLimit: 50, targetScore: 380,  parScore: 800,  sizeWeights: [1, 5, 5], storm: false },
  { id: 4,  name: 'Breeze In',     spawnInterval: 1150, burst: [2, 2], bombChance: 0.09, spikeChance: 0.07, barriers: 1, speedMul: 1.15, wind: 40,  timeLimit: 50, targetScore: 550,  parScore: 1100, sizeWeights: [2, 5, 4], storm: false },
  { id: 5,  name: 'Neon Rush',     spawnInterval: 1050, burst: [2, 3], bombChance: 0.11, spikeChance: 0.08, barriers: 1, speedMul: 1.22, wind: 55,  timeLimit: 55, targetScore: 750,  parScore: 1450, sizeWeights: [2, 5, 4], storm: false },
  { id: 6,  name: 'Bomb Alley',    spawnInterval: 1000, burst: [2, 3], bombChance: 0.14, spikeChance: 0.09, barriers: 1, speedMul: 1.28, wind: 65,  timeLimit: 55, targetScore: 950,  parScore: 1800, sizeWeights: [3, 5, 3], storm: false },
  { id: 7,  name: 'Small Fry',     spawnInterval: 950,  burst: [2, 4], bombChance: 0.16, spikeChance: 0.10, barriers: 2, speedMul: 1.35, wind: 80,  timeLimit: 60, targetScore: 1200, parScore: 2250, sizeWeights: [4, 4, 3], storm: false },
  { id: 8,  name: 'Crosswind',     spawnInterval: 900,  burst: [3, 4], bombChance: 0.18, spikeChance: 0.11, barriers: 2, speedMul: 1.42, wind: 100, timeLimit: 60, targetScore: 1500, parScore: 2750, sizeWeights: [4, 4, 2], storm: false },
  { id: 9,  name: 'Blade Fever',   spawnInterval: 850,  burst: [3, 5], bombChance: 0.20, spikeChance: 0.12, barriers: 2, speedMul: 1.50, wind: 120, timeLimit: 65, targetScore: 1850, parScore: 3300, sizeWeights: [5, 4, 2], storm: false },
  { id: 10, name: 'Fruit Storm',   spawnInterval: 800,  burst: [3, 5], bombChance: 0.22, spikeChance: 0.12, barriers: 3, speedMul: 1.58, wind: 140, timeLimit: 70, targetScore: 2300, parScore: 4000, sizeWeights: [5, 3, 2], storm: true },
];

/** Endless mode: difficulty interpolated from elapsed seconds, no timer, no target. */
export function endlessTune(t: number): LevelConfig {
  return {
    id: 0, name: 'Endless',
    spawnInterval: Math.max(500, 1400 - t * 10),
    burst: [Math.min(3, 1 + Math.floor(t / 45)), Math.min(5, 2 + Math.floor(t / 30))],
    bombChance: Math.min(0.24, 0.05 + t * 0.0018),
    spikeChance: Math.min(0.12, 0.03 + t * 0.0012),
    barriers: t > 200 ? 3 : t > 120 ? 2 : t > 50 ? 1 : 0,
    speedMul: Math.min(1.85, 1 + t * 0.007),
    wind: Math.min(150, t * 1.2),
    timeLimit: 0,
    targetScore: 0,
    parScore: 0,
    sizeWeights: [Math.min(5, 1 + t / 40), 4, Math.max(1, 6 - t / 30)],
    storm: false,
  };
}

/** Daily challenge: one fixed mid-hard minute, spawns seeded by the date. */
export const DAILY_CFG: LevelConfig = {
  id: -1, name: 'Daily Challenge',
  spawnInterval: 950, burst: [2, 3], bombChance: 0.12, spikeChance: 0.08,
  barriers: 1, speedMul: 1.3, wind: 70, timeLimit: 60,
  targetScore: 0, parScore: 0, sizeWeights: [3, 4, 3], storm: false,
};

// ---------------------------------------------------------------- worlds 2–4

export const WORLD_NAMES = ['Twilight Orchard', 'Windward Grove', 'Ion Tempest', 'Aurora Summit'];

const GEN_NAMES = [
  // World 2 (11–20): wind theme
  'Zephyr Rise', 'Twin Gust', 'Petal Drift', 'Beam Dance', 'Slipstream',
  'Gale Lines', 'Crosscut', 'Updraft', 'Whirl Edge', 'Gale Tempest',
  // World 3 (21–30): storm/electric theme
  'Static Bloom', 'Ion Drizzle', 'Pulse Field', 'Arc Light', 'Surge Row',
  'Volt Orchard', 'Flux Gate', 'Storm Chase', 'Thunder Ripe', 'Storm Apex',
  // World 4 (31–40): aurora theme
  'Aurora Gate', 'Polar Bloom', 'Halo Rush', 'Prism Wind', 'Radiant Tide',
  'Corona Cut', 'Zenith Drift', 'Nova Grove', 'Dawn Cascade', 'Aurora Cataclysm',
];

/**
 * Levels 11–40 continue the hand-tuned curve by formula. Growth slows as
 * parameters approach their caps; longer timers carry the higher targets.
 * Every 10th level is a storm boss.
 */
function genLevel(n: number): LevelConfig {
  const k = n - 10; // 1..30
  const target = Math.round((2300 + k * 90) / 50) * 50;
  return {
    id: n,
    name: GEN_NAMES[n - 11],
    spawnInterval: Math.max(450, 800 - k * 12),
    burst: [n >= 25 ? 4 : 3, n >= 20 ? 6 : 5],
    bombChance: Math.min(0.26, 0.22 + k * 0.0015),
    spikeChance: Math.min(0.14, 0.12 + k * 0.001),
    barriers: n >= 14 ? 3 : 2,
    speedMul: Math.min(1.75, 1.58 + k * 0.006),
    wind: Math.min(170, 140 + k),
    timeLimit: Math.round(70 + k * 0.7),
    targetScore: target,
    parScore: Math.round(target * 1.75 / 50) * 50,
    sizeWeights: [n > 25 ? 6 : 5, 3, 2],
    storm: n % 10 === 0,
  };
}

for (let n = 11; n <= 40; n++) LEVELS.push(genLevel(n));
