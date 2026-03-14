/**
 * Yellowstone Ecosystem Configuration
 * Parsed from CSV impact matrix + component metadata.
 * Developers can adjust impact factors via the dev panel or this file.
 */

// Component keys (must match CSV row/column order after header)
export const COMPONENT_IDS = [
  'Wolves', 'Elk', 'CottonWood', 'BerryTrees', 'Grass', 'Bears',
  'LandFertility', 'Birds', 'RiverQuality', 'Beaver', 'Dam', 'Fish',
  'OtherAnimals', 'Cattle', 'RangersRanchers', 'Visitors', 'ParkRevenue'
];

// Display names
export const COMPONENT_LABELS = {
  Wolves: 'Wolves',
  Elk: 'Elk',
  CottonWood: 'Cotton Wood',
  BerryTrees: 'Berry Trees',
  Grass: 'Grass',
  Bears: 'Bears',
  LandFertility: 'Land (fertility)',
  Birds: 'Birds',
  RiverQuality: 'River (quality)',
  Beaver: 'Beaver',
  Dam: 'Dam',
  Fish: 'Fish',
  OtherAnimals: 'Other Animals',
  Cattle: 'Cattle',
  RangersRanchers: 'Rangers/Ranchers',
  Visitors: 'Visitors',
  ParkRevenue: 'Park Revenue'
};

// Impact matrix: impactMatrix[sourceIndex][targetIndex] = base impact factor (per time step, per unit of source)
// Source = row index, Target = column index. Positive = source helps target; Negative = source hurts target.
// Tuned so vegetation/fish can recover and wolves/bears don't always max out.
export const BASE_IMPACT_MATRIX = [
  [0, -0.7, 0, 0, 0, 0, 0.5, 0.1, 0, 0, 0, 0, -0.6, -0.25, 0, 2, 0],        // Wolves (stronger on Elk so they control it; weaker on Visitors)
  [1.8, 0, -0.04, -0.04, -0.5, 0.6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],      // Elk (weaker grazing so grass/trees survive; weaker boost to Wolves)
  [0, 10, 0, 0, 0, 0, -0.01, 10, 0.1, 0, 0, 0, 2, 0, 0, 0, 0],             // Cotton Wood
  [0, 10, 0, 0, 0, 0.1, -0.01, 10, 0, 0, 0, 0, 2, 0, 0, 0, 0],             // Berry Trees
  [0, 0.1, 0, 0, 0, 0, -0.001, 0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0],            // Grass
  [0, -0.8, 0, 0.2, 0, 0, 0.2, 0.1, 0, 0, 0, -2.2, -1.2, 0, 0, 0.6, 0],    // Bears (weaker on Fish so fish can recover; slightly weaker on Elk)
  [0, 0, 1, 1, 14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],                    // Land (stronger on Grass for recovery)
  [0, 0, 0, 0.01, 0, 0, 0.01, 0, 0, 0, 0, 0, 1, 0, 0, 0.1, 0],             // Birds
  [1, 0.1, 0.1, 0.1, 0, 1, 0.1, 1, 0, 5, 0, 26, 2, 0, 0, 0, 0],            // River (stronger on Fish so fish can offset bear predation)
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0.1, 0, 0, 0, 0],                   // Beaver
  [0, 0, 0, 0, 0, 0, 0.1, 1, 2, 0, 0, 5, 0, 0, 0, 0, 0],                   // Dam
  [0, 0, 0, 0, 0, 0.1, 0, 0.1, 0, 0, 0, 0, 0.5, 0, 0, 0, 0],               // Fish
  [0.5, 0, -0.02, -0.02, -0.25, 0.4, 0, 0.05, 0, 0, 0, -1.2, 0, 0, 0, 0, 0], // Other Animals (weaker grazing; weaker boost to Wolves/Bears)
  [0.7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.01, 0, 0],                // Cattle (weaker boost to Wolves)
  [-0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 0, 0, 0],                 // Rangers
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10],                    // Visitors
  [0.1, 0, 0, 0, 0, 0.05, 0, 0, 0.1, 0, 0, 0, 0, 0, 0, 0.01, 0]            // Park Revenue
];

// [min, max] for each component (non-zero min to avoid collapse; max to prevent blow-up)
export const RANGES = {
  Wolves: [1, 200],
  Elk: [10, 2000],
  CottonWood: [5, 500],
  BerryTrees: [5, 500],
  Grass: [50, 3000],
  Bears: [2, 150],
  LandFertility: [0.1, 10],
  Birds: [5, 800],
  RiverQuality: [0.1, 10],
  Beaver: [1, 80],
  Dam: [0.5, 20],
  Fish: [10, 500],
  OtherAnimals: [5, 400],
  Cattle: [0, 300],
  RangersRanchers: [1, 50],
  Visitors: [10, 500],
  ParkRevenue: [1, 100]
};

// Birth probability (per time step, base rate) — only for living populations; scaled by (1 - N/K) for carrying capacity
// Kept moderate so growth is limited by carrying capacity before hitting max
export const BIRTH_PROBABILITY = {
  Wolves: 0.05,
  Elk: 0.06,
  CottonWood: 0.018,
  BerryTrees: 0.018,
  Grass: 0.05,
  Bears: 0.035,
  Birds: 0.045,
  Beaver: 0.035,
  Fish: 0.05,
  OtherAnimals: 0.045,
  Cattle: 0.025,
  RangersRanchers: 0,
  Visitors: 0,
  ParkRevenue: 0,
  LandFertility: 0,
  RiverQuality: 0,
  Dam: 0
};

// Death probability (per time step, base rate); can increase with crowding
// Slightly higher base death helps prevent all components from maxing out
export const DEATH_PROBABILITY = {
  Wolves: 0.08,
  Elk: 0.055,
  CottonWood: 0.02,
  BerryTrees: 0.02,
  Grass: 0.04,
  Bears: 0.055,
  Birds: 0.065,
  Beaver: 0.045,
  Fish: 0.055,
  OtherAnimals: 0.065,
  Cattle: 0.03,
  RangersRanchers: 0.015,
  Visitors: 0.03,
  ParkRevenue: 0.015,
  LandFertility: 0,
  RiverQuality: 0,
  Dam: 0.025
};

// Carrying capacity multiplier (K = range_max * CARRYING_CAPACITY_FRACTION) for logistic growth
// Lower = equilibrium in the middle of range; higher = populations can grow closer to max
export const CARRYING_CAPACITY_FRACTION = 0.1;

// Predator–prey: when impact is negative (predator hurts prey), apply with this success probability
// Key: 'sourceId_targetId' -> probability (0..1). Higher wolf/elk success so wolves can regulate elk.
export const HUNT_SUCCESS_PROBABILITY = {
  'Wolves_Elk': 0.5,
  'Wolves_OtherAnimals': 0.45,
  'Wolves_Cattle': 0.2,
  'Elk_CottonWood': 1,
  'Elk_BerryTrees': 1,
  'Elk_Grass': 1,
  'Bears_Elk': 0.3,
  'Bears_Fish': 0.45,
  'OtherAnimals_CottonWood': 1,
  'OtherAnimals_BerryTrees': 1,
  'OtherAnimals_Grass': 1,
  'Birds_Grass': 1,
  'Beaver_CottonWood': 0,
  'Fish_OtherAnimals': 0
};

// Initial values (realistic starting point for equilibrium; not at max)
export const INITIAL_VALUES = {
  Wolves: 40,
  Elk: 600,
  CottonWood: 120,
  BerryTrees: 100,
  Grass: 800,
  Bears: 35,
  LandFertility: 4,
  Birds: 120,
  RiverQuality: 5,
  Beaver: 15,
  Dam: 8,
  Fish: 150,
  OtherAnimals: 80,
  Cattle: 50,
  RangersRanchers: 12,
  Visitors: 80,
  ParkRevenue: 25
};

// Optional: global multiplier for all impacts (developer knob)
// Kept below 1 to avoid positive feedback driving everything to max
export const GLOBAL_IMPACT_SCALE = 0.35;

// Allee effect: below this fraction of carrying capacity, birth rate is reduced so low populations
// struggle to grow. Makes initial conditions matter (e.g. very low Wolves → stay low; high start → different equilibrium).
export const ALLEE_THRESHOLD = 0.18;
export const ALLEE_STRENGTH = 0.25; // birth scaled to this at N→0 (so low pops grow slowly)

// Floor recovery only works well when "support" is present; otherwise low populations can stay low (path dependence).
export const FLOOR_RECOVERY_SUPPORT = {
  Grass: 'LandFertility',
  CottonWood: 'LandFertility',
  BerryTrees: 'LandFertility',
  Fish: 'RiverQuality'
};
export const FLOOR_SUPPORT_THRESHOLD = 0.35; // support must be above this fraction of its max for full floor recovery

// Rate-of-change coupling: a component's *rate of change* (increase/decrease) affects linked components.
// E.g. when Dam is decreasing, River quality is pulled down even if the level link Dam→River is positive.
// Strength in [0,1]; 0 = level-only (old behavior), higher = stronger propagation of rates.
export const RATE_COUPLING_STRENGTH = 0.35;
