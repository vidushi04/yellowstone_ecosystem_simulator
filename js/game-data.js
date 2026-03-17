window.EcosystemConfig = (function() {
  const COMPONENT_IDS = [
    'Wolves', 'Elk', 'CottonWood', 'BerryTrees', 'Grass', 'Bears',
    'LandFertility', 'Birds', 'RiverQuality', 'Beaver', 'Dam', 'Fish',
    'OtherAnimals', 'Cattle', 'RangersRanchers', 'Visitors', 'ParkRevenue'
  ];

  const COMPONENT_LABELS = {
    Wolves: 'Wolves', Elk: 'Elk', CottonWood: 'Cotton Wood', BerryTrees: 'Berry Trees', Grass: 'Grass',
    Bears: 'Bears', LandFertility: 'Land (fertility)', Birds: 'Birds', RiverQuality: 'River (quality)',
    Beaver: 'Beaver', Dam: 'Dam', Fish: 'Fish', OtherAnimals: 'Other Animals', Cattle: 'Cattle',
    RangersRanchers: 'Rangers/Ranchers', Visitors: 'Visitors', ParkRevenue: 'Park Revenue'
  };

  const BASE_IMPACT_MATRIX = [
    [   0, -0.5,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0, -0.2, -0.1,    0,  0.2,    0 ], 
    [ 0.2,    0, -0.6, -0.5, -0.4,  0.2,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0 ], 
    [   0,  0.1,    0,    0,    0,    0,  0.2,  0.3,  0.3,  0.4,    0,    0,    0,    0,    0,    0,    0 ], 
    [   0,  0.1,    0,    0,    0,  0.3,  0.1,  0.3,  0.1,    0,    0,    0,    0,    0,    0,    0,    0 ], 
    [   0,  0.2,    0,    0,    0,    0,  0.2,    0,  0.2,    0,    0,    0,  0.2,  0.2,    0,    0,    0 ], 
    [   0, -0.1,    0, -0.1,    0,    0,    0,    0,    0,    0,    0, -0.3,    0,    0,    0,  0.1,    0 ], 
    [   0,    0,  0.2,  0.2,  0.3,    0,    0,    0,  0.1,    0,    0,    0,    0,    0,    0,    0,    0 ], 
    [   0,    0,    0,    0,    0,    0,  0.1,    0,    0,    0,    0,    0,    0,    0,    0,  0.1,    0 ],
    [   0,    0,    0,    0,    0,  0.1,    0,  0.2,    0,    0,    0,  0.5,    0,    0,    0,    0,    0 ], 
    [   0,    0,    0,    0,    0,    0,    0,    0,    0,    0,  0.6,    0,    0,    0,    0,    0,    0 ], 
    [   0,    0,    0,    0,    0,    0,  0.1,    0,  0.4,    0,    0,  0.3,    0,    0,    0,    0,    0 ], 
    [   0,    0,    0,    0,    0,  0.2,    0,  0.2,    0,    0,    0,    0,    0,    0,    0,    0,    0 ],
    [ 0.1,    0,    0,    0, -0.2,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0 ],
    [ 0.1,    0,    0,    0, -0.3,    0,    0,    0,    0,    0,    0,    0,    0,    0,  0.1,    0,    0 ],
    [-0.2,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0, -0.1 ],
    [   0,    0,    0,    0,    0,    0,    0,    0, -0.1,    0,    0,    0,    0,    0,    0,    0,  0.4 ],
    [   0,    0,    0,    0,    0,    0,  0.1,    0,    0,    0,    0,    0,    0,    0,  0.2,    0,    0 ]
  ];

  const RANGES = {
    Wolves: [1, 100], Elk: [1, 1000], CottonWood: [5, 500], BerryTrees: [5, 500], Grass: [50, 3000],
    Bears: [2, 50], LandFertility: [0.1, 10], Birds: [5, 800], RiverQuality: [0.1, 10], Beaver: [1, 80],
    Dam: [0.5, 20], Fish: [10, 500], OtherAnimals: [5, 400], Cattle: [0, 300], RangersRanchers: [1, 50],
    Visitors: [10, 500], ParkRevenue: [1, 100]
  };

  const PLAYGROUND_COMPONENT_SCALE = {
    Wolves: 2.0, Elk: 1.0, CottonWood: 1.0, BerryTrees: 1.0, Grass: 1.0, Bears: 1.2,
    LandFertility: 1.0, Birds: 1.0, RiverQuality: 1.0, Beaver: 1.5, Dam: 1.0, Fish: 1.0,
    OtherAnimals: 1.0, Cattle: 1.0, RangersRanchers: 1.5, Visitors: 1.5, ParkRevenue: 1.0
  };

  const INITIAL_VALUES = {
    Wolves: 50, Elk: 500, CottonWood: 250, BerryTrees: 250, Grass: 1500, Bears: 25,
    LandFertility: 5, Birds: 400, RiverQuality: 5, Beaver: 40, Dam: 10, Fish: 250,
    OtherAnimals: 200, Cattle: 150, RangersRanchers: 25, Visitors: 250, ParkRevenue: 50
  };

  return { COMPONENT_IDS, COMPONENT_LABELS, BASE_IMPACT_MATRIX, RANGES, PLAYGROUND_COMPONENT_SCALE, INITIAL_VALUES };
})();

window.oneStepImpactOnly = function(currentState, sourceId, deltaAmount, componentIds, impactMatrix, ranges, options = {}) {
  const scale = options.scale ?? 1.0;
  const perComponentScale = options.perComponentScale || {};
  const n = componentIds.length;
  const sourceIdx = componentIds.indexOf(sourceId);
  if (sourceIdx < 0) return { nextState: { ...currentState } };

  const percentages = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const id = componentIds[i];
    const [min, max] = ranges[id] ?? [0, 1];
    percentages[i] = Math.max(0, Math.min(100, ((currentState[id] ?? 0) - min) * 100 / (max - min)));
  }

  const [sourceMin, sourceMax] = ranges[sourceId] ?? [0, 1];
  const sourceDeltaPct = (deltaAmount / (sourceMax - sourceMin)) * 100;

  let currentWave = new Array(n).fill(0);
  currentWave[sourceIdx] = sourceDeltaPct;
  percentages[sourceIdx] = Math.max(0, Math.min(100, percentages[sourceIdx] + sourceDeltaPct));

  const maxSteps = 10; 
  for (let step = 0; step < maxSteps; step++) {
    let nextWave = new Array(n).fill(0);
    let hasChanges = false;

    for (let i = 0; i < n; i++) {
      if (Math.abs(currentWave[i]) < 0.01) continue; 
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const impact = impactMatrix[i][j] || 0;
        if (impact !== 0) {
          const srcId = componentIds[i];
          const srcScale = perComponentScale[srcId] ?? 1.0;
          nextWave[j] += currentWave[i] * impact * scale * srcScale;
          hasChanges = true;
        }
      }
    }

    if (!hasChanges) break;

    for (let j = 0; j < n; j++) {
      if (j === sourceIdx) {
         nextWave[j] = 0; 
         continue; 
      }
      const oldPct = percentages[j];
      percentages[j] = Math.max(0, Math.min(100, oldPct + nextWave[j]));
      nextWave[j] = percentages[j] - oldPct;
    }
    currentWave = nextWave;
  }

  const nextState = {};
  for (let i = 0; i < n; i++) {
    const id = componentIds[i];
    const [min, max] = ranges[id] ?? [0, 1];
    nextState[id] = min + percentages[i] * (max - min) / 100;
  }
  
  return { nextState };
};
