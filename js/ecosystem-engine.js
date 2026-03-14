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
  RATE_COUPLING_STRENGTH
} from '../data/ecosystem-config.js';

export function createEngine(options = {}) {
  const {
    impactScale = GLOBAL_IMPACT_SCALE,
    customImpactMatrix = null,
    timeStep = 0.1,
    rateCouplingStrength = RATE_COUPLING_STRENGTH
  } = options;

  let state = {};
  let impactMatrix = (customImpactMatrix || BASE_IMPACT_MATRIX).map(row => [...row]);
  const params = { scale: impactScale };
  const dt = timeStep;
  const rateStrength = rateCouplingStrength;

  // Previous tick's change per component (for rate-of-change coupling)
  let prevDeltas = COMPONENT_IDS.map(() => 0);

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

  // Rate-of-change coupling: when a source decreased last tick, targets it positively affects get a negative push (and vice versa).
  // So e.g. decreasing Dam implies decreasing River quality, even though level link Dam→River is positive.
  function applyRateCoupling(prevChanges) {
    const n = COMPONENT_IDS.length;
    const rateDeltas = COMPONENT_IDS.map(() => 0);
    if (rateStrength <= 0) return rateDeltas;
    for (let t = 0; t < n; t++) {
      for (let s = 0; s < n; s++) {
        if (s === t) continue;
        const impact = impactMatrix[s][t] || 0;
        if (impact === 0) continue;
        rateDeltas[t] += rateStrength * impact * (prevChanges[s] ?? 0);
      }
    }
    return rateDeltas;
  }

  const FLOOR_RECOVERY_IDS = ['Grass', 'CottonWood', 'BerryTrees', 'Fish'];
  const FLOOR_RECOVERY_THRESHOLD = 0.2; // below this fraction of range span = near-min
  const FLOOR_RECOVERY_RATE = 0.02;    // extra growth per tick when near min

  function birthDeathDelta(id, value, current) {
    const birthProb = BIRTH_PROBABILITY[id] ?? 0;
    const deathProb = DEATH_PROBABILITY[id] ?? 0;
    const [min, max] = RANGES[id];
    const K = max * CARRYING_CAPACITY_FRACTION;

    let delta = 0;
    if (birthProb > 0 && value > 0) {
      const logistic = 1 - value / K;
      const births = value * birthProb * Math.max(0, logistic) * dt;
      delta += births;
    }
    // Floor recovery: when vegetation/fish are near minimum, add small regeneration so they can rebound
    if (FLOOR_RECOVERY_IDS.includes(id) && value > 0) {
      const span = max - min;
      const frac = (value - min) / span;
      if (frac < FLOOR_RECOVERY_THRESHOLD)
        delta += span * FLOOR_RECOVERY_RATE * (1 - frac / FLOOR_RECOVERY_THRESHOLD) * dt;
    }
    if (deathProb > 0 && value > 0) {
      const crowding = value / K;
      const crowdingPenalty = crowding > 0.4 ? 0.8 * (crowding - 0.4) : 0;
      let deathRate = deathProb * (1 + crowdingPenalty);
      // Prey scarcity: wolves/bears take extra death when main prey is low so they don't max out while prey collapses
      if (id === 'Wolves') {
        const elk = current.Elk ?? 0;
        const elkK = (RANGES.Elk[1] * CARRYING_CAPACITY_FRACTION);
        if (elk < elkK * 0.35) deathRate += 0.04 * (1 - elk / (elkK * 0.35));
      } else if (id === 'Bears') {
        const fish = current.Fish ?? 0;
        const fishK = (RANGES.Fish[1] * CARRYING_CAPACITY_FRACTION);
        if (fish < fishK * 0.4) deathRate += 0.03 * (1 - fish / (fishK * 0.4));
      }
      delta -= value * deathRate * dt;
    }
    return delta;
  }

  function tick(current) {
    const levelDeltas = applyImpacts(current);
    const rateDeltas = applyRateCoupling(prevDeltas);

    const next = {};
    COMPONENT_IDS.forEach((id, i) => {
      let v = current[id] ?? 0;
      v += levelDeltas[i] + rateDeltas[i];
      v += birthDeathDelta(id, v, current);
      next[id] = clamp(id, v);
    });

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
