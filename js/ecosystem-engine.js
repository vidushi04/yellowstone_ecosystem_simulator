/**
 * Yellowstone Ecosystem Simulation Engine
 * - Birth/death with carrying capacity
 * - Impact matrix with optional hunt success probability
 * - Clipping to non-zero ranges
 * - Developer-adjustable impact factors
 */

import {
  COMPONENT_IDS,
  BASE_IMPACT_MATRIX,
  RANGES,
  BIRTH_PROBABILITY,
  DEATH_PROBABILITY,
  HUNT_SUCCESS_PROBABILITY,
  CARRYING_CAPACITY_FRACTION,
  GLOBAL_IMPACT_SCALE,
  RATE_COUPLING_STRENGTH,
  RATE_COUPLING_STRENGTH_T2,
  OUTPUT_LIMITING_STRENGTH,
  RIVER_SCARCITY_THRESHOLD,
  RIVER_SCARCITY_STRENGTH,
  ENV_FLOOR_RECOVERY_RATE,
  ALLEE_THRESHOLD,
  ALLEE_STRENGTH,
  FLOOR_RECOVERY_SUPPORT,
  FLOOR_SUPPORT_THRESHOLD
} from '../data/ecosystem-config.js';

export function createEngine(options = {}) {
  const {
    impactScale = GLOBAL_IMPACT_SCALE,
    customImpactMatrix = null,
    timeStep = 0.1,
    rateCouplingStrength = RATE_COUPLING_STRENGTH,
    rateCouplingStrengthT2 = RATE_COUPLING_STRENGTH_T2,
    outputLimitingStrength = OUTPUT_LIMITING_STRENGTH
  } = options;

  let state = {};
  let impactMatrix = (customImpactMatrix || BASE_IMPACT_MATRIX).map(row => [...row]);
  const params = { scale: impactScale };
  const dt = timeStep;
  const rateStrength = rateCouplingStrength;
  const rateStrengthT2 = rateCouplingStrengthT2 ?? 0;
  const outLimitStrength = outputLimitingStrength ?? 0;

  // Rate tracking: previous tick and two ticks ago (for delayed propagation, e.g. Elk↑ at t → Cotton Wood↓ at t+1 → River↓ at t+2)
  let prevDeltas = COMPONENT_IDS.map(() => 0);
  let prevPrevDeltas = COMPONENT_IDS.map(() => 0);

  function clamp(id, value) {
    const [min, max] = RANGES[id];
    return Math.max(min, Math.min(max, value));
  }

  function getHuntProbability(sourceId, targetId) {
    const key = `${sourceId}_${targetId}`;
    return HUNT_SUCCESS_PROBABILITY[key] !== undefined ? HUNT_SUCCESS_PROBABILITY[key] : 1;
  }

  function applyImpacts(current) {
    const deltas = COMPONENT_IDS.map(() => 0);
    const n = COMPONENT_IDS.length;

    for (let s = 0; s < n; s++) {
      const sourceId = COMPONENT_IDS[s];
      const sourceVal = current[sourceId] ?? 0;
      if (sourceVal <= 0) continue;

      for (let t = 0; t < n; t++) {
        if (s === t) continue;
        const targetId = COMPONENT_IDS[t];
        const impact = impactMatrix[s][t] || 0;
        if (impact === 0) continue;

        let effectiveImpact = impact * sourceVal * params.scale * dt;
        // Predator–prey: negative impact (predator hurts prey) applied with hunt success probability
        if (impact < 0) {
          const prob = getHuntProbability(sourceId, targetId);
          effectiveImpact = Math.random() < prob ? effectiveImpact : 0;
        } else {
          // Saturation: positive impacts weaken as target approaches its max (avoids everything maxing out)
          const [, max] = RANGES[targetId];
          const targetVal = current[targetId] ?? 0;
          const headroom = 1 - targetVal / max;
          if (headroom < 0.3) effectiveImpact *= Math.max(0, headroom / 0.3);
        }
        deltas[t] += effectiveImpact;
      }
    }
    return deltas;
  }

  // Rate coupling: a component's change is driven by the *rates of its input nodes* (the components that impact its growth), not its own rate.
  // E.g. Wolves' growth is driven by Elk (and others that affect Wolves). So: Elk dropping → Wolves drop; Wolves dropping → Elk rise.
  // We use source s's rate (prevChanges[s]) and impact[s→t]; we never use the target's own rate (s !== t).
  function applyRateCoupling(prevChanges, strength = rateStrength) {
    const n = COMPONENT_IDS.length;
    const rateDeltas = COMPONENT_IDS.map(() => 0);
    if (strength <= 0) return rateDeltas;
    for (let t = 0; t < n; t++) {
      for (let s = 0; s < n; s++) {
        if (s === t) continue; // never use target's own rate for target's update
        const impact = impactMatrix[s][t] || 0; // how source s affects target t's growth
        if (impact === 0) continue;
        // Only input nodes' rates: prevChanges[s] is the rate of a component that impacts t's growth
        rateDeltas[t] += strength * impact * (prevChanges[s] ?? 0);
      }
    }
    return rateDeltas;
  }

  // Second-step rate coupling: source's change at t-2 also affects target at t (weaker). E.g. Elk↑ at t-2 → Cotton Wood↓ at t-1 → River↓ at t.
  function applyRateCouplingT2() {
    return applyRateCoupling(prevPrevDeltas, rateStrengthT2);
  }

  // Output-node dependence: component i's delta is limited by availability of j when i negatively affects j (i consumes j).
  // So e.g. Elk's growth is limited when Grass/Cotton Wood are low; Wolves limited when Elk is low (already via prey scarcity).
  function outputLimitingDelta(i, current) {
    if (outLimitStrength <= 0) return 0;
    const n = COMPONENT_IDS.length;
    let delta = 0;
    const levelI = current[COMPONENT_IDS[i]] ?? 0;
    if (levelI <= 0) return 0;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const impact = impactMatrix[i][j] || 0;
      if (impact >= 0) continue; // only negative impacts (i consumes or harms j)
      const [, maxJ] = RANGES[COMPONENT_IDS[j]];
      const K_j = maxJ * CARRYING_CAPACITY_FRACTION;
      const levelJ = current[COMPONENT_IDS[j]] ?? 0;
      const scarcity = 1 - Math.min(1, levelJ / K_j); // 0 when j abundant, 1 when j at 0
      if (scarcity <= 0) continue;
      delta -= outLimitStrength * Math.abs(impact) * levelI * scarcity * dt * 0.1; // limit growth when resources are scarce
    }
    return delta;
  }

  const RIVER_IDX = COMPONENT_IDS.indexOf('RiverQuality');

  // When River quality is low or decreasing, components that depend on River get a scarcity penalty (so low River affects the whole ecosystem).
  function riverScarcityDelta(targetIndex, current) {
    if (RIVER_IDX < 0 || RIVER_SCARCITY_STRENGTH <= 0) return 0;
    const impact = impactMatrix[RIVER_IDX][targetIndex] || 0;
    if (impact <= 0) return 0;
    const riverLevel = current.RiverQuality ?? 0;
    const [, riverMax] = (RANGES.RiverQuality ?? [0, 10]);
    const riverFrac = riverLevel / riverMax;
    if (riverFrac >= (RIVER_SCARCITY_THRESHOLD ?? 0.5)) return 0;
    const scarcity = 1 - riverFrac / (RIVER_SCARCITY_THRESHOLD ?? 0.5); // 0 when at threshold, 1 when River at 0
    const targetId = COMPONENT_IDS[targetIndex];
    const levelT = current[targetId] ?? 0;
    return -RIVER_SCARCITY_STRENGTH * impact * levelT * scarcity * dt * 0.15;
  }

  const FLOOR_RECOVERY_IDS = ['Grass', 'CottonWood', 'BerryTrees', 'Fish'];
  const ENV_FLOOR_IDS = ['RiverQuality', 'Dam']; // no birth/death; need recovery so they don't stick at min
  const FLOOR_RECOVERY_THRESHOLD = 0.2; // below this fraction of range span = near-min
  const FLOOR_RECOVERY_RATE = 0.02;    // extra growth per tick when near min
  const envFloorRate = ENV_FLOOR_RECOVERY_RATE ?? 0.015;

  // Allee effect: species that start very low grow slowly (so initial conditions lead to different equilibria)
  const ALLEE_IDS = ['Wolves', 'Elk', 'Bears', 'Beaver', 'Birds', 'OtherAnimals'];

  // Floor recovery and env floor: additive terms that are part of total delta (then constrained by birth/death for living).
  function otherDeltas(id, value, current) {
    const [min, max] = RANGES[id];
    let delta = 0;
    const span = max - min;
    const frac = span > 0 ? (value - min) / span : 0;
    if (FLOOR_RECOVERY_IDS.includes(id) && value > 0 && frac < FLOOR_RECOVERY_THRESHOLD) {
      let recoveryRate = FLOOR_RECOVERY_RATE * (1 - frac / FLOOR_RECOVERY_THRESHOLD) * dt;
      const supportId = FLOOR_RECOVERY_SUPPORT[id];
      if (supportId && RANGES[supportId]) {
        const supportVal = current[supportId] ?? 0;
        const [, supportMax] = RANGES[supportId];
        const supportFrac = supportVal / supportMax;
        if (supportFrac < FLOOR_SUPPORT_THRESHOLD)
          recoveryRate *= supportFrac / FLOOR_SUPPORT_THRESHOLD;
      }
      delta += span * recoveryRate;
    }
    if (ENV_FLOOR_IDS.includes(id) && value > 0 && frac < FLOOR_RECOVERY_THRESHOLD)
      delta += span * envFloorRate * (1 - frac / FLOOR_RECOVERY_THRESHOLD) * dt;
    return delta;
  }

  // Living: birth = surviving × birthProb × logistic; death = surviving × deathProb × (1 + crowding + prey scarcity).
  function birthsFromSurviving(id, surviving, current) {
    const birthProb = BIRTH_PROBABILITY[id] ?? 0;
    if (birthProb <= 0 || surviving <= 0) return 0;
    const [, max] = RANGES[id];
    const K = max * CARRYING_CAPACITY_FRACTION;
    let births = surviving * birthProb * Math.max(0, 1 - surviving / K) * dt;
    if (ALLEE_IDS.includes(id)) {
      const density = surviving / K;
      if (density < ALLEE_THRESHOLD)
        births *= ALLEE_STRENGTH + (1 - ALLEE_STRENGTH) * (density / ALLEE_THRESHOLD);
    }
    return births;
  }

  function deathsFromSurviving(id, surviving, current) {
    const deathProb = DEATH_PROBABILITY[id] ?? 0;
    if (deathProb <= 0 || surviving <= 0) return 0;
    const [, max] = RANGES[id];
    const K = max * CARRYING_CAPACITY_FRACTION;
    const crowding = surviving / K;
    let deathRate = deathProb * (1 + (crowding > 0.4 ? 0.8 * (crowding - 0.4) : 0));
    if (id === 'Wolves') {
      const elk = current.Elk ?? 0;
      const elkK = (RANGES.Elk[1] * CARRYING_CAPACITY_FRACTION);
      if (elk < elkK * 0.4) deathRate += 0.08 * (1 - elk / (elkK * 0.4));
    } else if (id === 'Bears') {
      const fish = current.Fish ?? 0;
      const fishK = (RANGES.Fish[1] * CARRYING_CAPACITY_FRACTION);
      if (fish < fishK * 0.45) deathRate += 0.06 * (1 - fish / (fishK * 0.45));
    }
    return surviving * deathRate * dt;
  }

  function isLiving(id) {
    return (BIRTH_PROBABILITY[id] ?? 0) > 0 || (DEATH_PROBABILITY[id] ?? 0) > 0;
  }

  // Tick: living = survive (from impacts) → birth (surviving × birthProb) → death (surviving × deathProb). Non-living = current + impact delta only.
  function tick(current) {
    const levelDeltas = applyImpacts(current);
    const rateDeltas = applyRateCoupling(prevDeltas);
    const rateDeltasT2 = applyRateCouplingT2();

    const next = {};
    COMPONENT_IDS.forEach((id, i) => {
      const v = current[id] ?? 0;
      const impactDelta = levelDeltas[i] + rateDeltas[i];
      // + rateDeltas[i] + rateDeltasT2[i] +
      //  riverScarcityDelta(i, current) + outputLimitingDelta(i, current) + otherDeltas(id, v, current);

      if (isLiving(id)) {
        const surviving = Math.max(0, v + impactDelta);
        const survivingClamped = clamp(id, surviving);
        const births = birthsFromSurviving(id, survivingClamped, current);
        const deaths = deathsFromSurviving(id, survivingClamped, current);
        next[id] = clamp(id, survivingClamped + births - deaths);
      } else {
        next[id] = clamp(id, v + impactDelta);
      }
    });

    prevPrevDeltas = [...prevDeltas];
    prevDeltas = COMPONENT_IDS.map((_, i) => (next[COMPONENT_IDS[i]] ?? 0) - (current[COMPONENT_IDS[i]] ?? 0));
    return next;
  }

  function setState(newState) {
    state = { ...state, ...newState };
    COMPONENT_IDS.forEach(id => {
      if (state[id] == null) return;
      state[id] = clamp(id, state[id]);
    });
    prevDeltas = COMPONENT_IDS.map(() => 0);
    prevPrevDeltas = COMPONENT_IDS.map(() => 0);
  }

  function getState() {
    return { ...state };
  }

  function setImpactFactor(sourceIndex, targetIndex, value) {
    if (impactMatrix[sourceIndex] && impactMatrix[sourceIndex][targetIndex] !== undefined) {
      impactMatrix[sourceIndex][targetIndex] = value;
    }
  }

  function setImpactMatrix(matrix) {
    if (!matrix || matrix.length !== COMPONENT_IDS.length) return;
    const n = COMPONENT_IDS.length;
    for (let i = 0; i < n; i++) {
      if (matrix[i] && matrix[i].length >= n) {
        for (let j = 0; j < n; j++) impactMatrix[i][j] = Number(matrix[i][j]) || 0;
      }
    }
  }

  function getImpactMatrix() {
    return impactMatrix.map(row => [...row]);
  }

  function setImpactScale(s) {
    params.scale = s;
  }

  return {
    tick,
    setState,
    getState,
    setImpactFactor,
    setImpactMatrix,
    getImpactMatrix,
    setImpactScale,
    get componentIds() { return [...COMPONENT_IDS]; },
    get ranges() { return { ...RANGES }; }
  };
}
