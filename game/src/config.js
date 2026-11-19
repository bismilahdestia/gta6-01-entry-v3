// Porto Alba — "Neon Tide" (gta6-01 entry v6).
// Central tuning, palette and mission data for the whole game.
// Every other module reads from here so the dusk look and the
// difficulty stay consistent in one place.
export const SHOT_SEED = 91;

export const CFG = {
  // Map: a 400 x 400 coastal city, roads on a 40-unit grid.
  // x = 0 IS a street (roads at -200, -160, ..., 0, ..., 200).
  mapSize: 400,
  halfMap: 200,
  roadStep: 40,
  roadWidth: 14,
  blockSize: 26,

  // Dusk "Neon Tide" palette.
  skyTop: 0x2a1650,      // deep purple overhead
  skyHorizon: 0xff7a3c,  // orange band at the horizon
  sunColor: 0xffb347,
  fogColor: 0x4a2a63,
  fogNear: 120,
  fogFar: 420,
  groundColor: 0x241d33,
  roadColor: 0x1c1826,
  kerbColor: 0x5a5470,
  buildingBase: 0x2e2a4a,
  windowWarm: 0xffb347,
  windowCool: 0x7fd4ff,
  windowDark: 0x14101f,
  waterColor: 0x1d3a5f,
  pierWood: 0x8a6a45,
  awningOrange: 0xff6a1a,
  playerCarColor: 0x14b8a6, // teal — the player's own car, never a steal target

  // Player.
  walkSpeed: 6,
  runSpeed: 10,
  playerHealth: 100,
  startMoney: 250,
  startAmmo: 12,
  reserveAmmo: 48,
  pistolDamage: 34,
  pistolRange: 70,
  reloadSeconds: 1.2,

  // Cars.
  carAccel: 26,
  carBrake: 40,
  carMaxSpeed: 42,      // ~150 km/h at the top end
  carReverseMax: 12,
  carTurn: 1.9,
  handbrakeTurn: 3.4,
  trafficCount: 14,
  trafficSpeedMin: 8,
  trafficSpeedMax: 14,
  parkedCount: 10,
  stealRange: 6,

  // Pedestrians.
  pedCount: 24,
  pedSpeedMin: 1.0,
  pedSpeedMax: 2.2,
  pedClearRadius: 5,

  // Wanted.
  heatDecay: 1.6,       // heat lost per second while quiet
  heatPerCrime: 22,     // heat added per crime (steal, shot, kill)
  heatPerStar: 25,      // heat needed per star — one crime is almost a star
  maxStars: 5,
  heliStars: 4,         // helicopter appears at 4 stars
  roadblockStars: 4,    // roadblocks appear at 4 stars
  policeTopSpeed: 38,
  policeAccel: 30,

  // Clock: the game starts at dusk, 17:45, and runs 1 game-minute
  // every 3 real seconds.
  clockStartMinutes: 17 * 60 + 45,
  clockSecondsPerMinute: 3,

  // Save.
  saveKey: 'porto-alba-save-v6',
};

// The story: Rook, a driver new to Porto Alba, runs jobs for Marisol.
// Each mission names a real place in the city, and the gold beacon
// marks it. The last mission is the 5-star escape to Marisol Pier.
export const MISSIONS = [
  {
    id: 1,
    name: 'First Light',
    briefing:
      'Marisol is waiting on the pier. Drive to Marisol Pier and meet her — no heat, no rush.',
    objective: 'Meet Marisol at Marisol Pier',
    place: 'pier',
    reward: 500,
    hint: 'Follow the promenade south — the pier lights are gold.',
  },
  {
    id: 2,
    name: 'Café Alba',
    briefing:
      'A package is waiting under the orange awning at Café Alba. Pick it up and bring it back clean.',
    objective: 'Pick up the package at Café Alba',
    place: 'cafe',
    reward: 750,
    hint: 'Café Alba — follow the orange awning.',
  },
  {
    id: 3,
    name: 'Warehouse Run',
    briefing:
      'The Alba Warehouse needs the package moved before the tide turns. Deliver it to the south door.',
    objective: 'Deliver the package to Alba Warehouse',
    place: 'warehouse',
    reward: 1200,
    hint: 'Low warehouse on the west side — gold door, south face.',
  },
  {
    id: 4,
    name: 'Neon Tide',
    briefing:
      'The whole city is after you now. Lose the tail and escape to Marisol Pier — 5 stars!',
    objective: 'Escape to Marisol Pier — 5 stars!',
    place: 'pier',
    reward: 2500,
    hint: 'Run the promenade. Do not stop for anyone.',
    forceStars: 5,
  },
];

// District labels drawn on the circular minimap.
export const DISTRICTS = [
  { name: 'DOWNTOWN', x: 0, z: -40 },
  { name: 'PORT', x: -140, z: 120 },
  { name: 'BEACH', x: 120, z: 140 },
];
