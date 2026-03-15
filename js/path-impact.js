/**
 * Path impact: one-step update with impacts only (no birth/death).
 * So causal direction matches the matrix: e.g. reduce Wolves → less negative impact on Elk → Elk increases.
 */

function clamp(id, value, ranges) {
  const [min, max] = ranges[id] ?? [0, 1];
  return Math.max(min, Math.min(max, value));
}

/**
 * Apply one time step: bump source by deltaAmount, apply impact matrix only (no birth/death).
 * Returns { nextState, destinationChange }.
 * Convention: impact[s][t] < 0 means source s hurts target t (e.g. Wolves hurt Elk). So fewer wolves → less negative effect on Elk → Elk goes up.
 */
export function oneStepImpactOnly(currentState, sourceId, destId, deltaAmount, componentIds, impactMatrix, ranges, options = {}) {
  const scale = options.scale ?? 0.1;
  const dt = options.dt ?? 0.1;

  const n = componentIds.length;
  const sourceIdx = componentIds.indexOf(sourceId);
  const destIdx = componentIds.indexOf(destId);
  if (sourceIdx < 0 || destIdx < 0) {
    return { nextState: { ...currentState }, destinationChange: 0 };
  }

  const stateAfterBump = { ...currentState };
  stateAfterBump[sourceId] = (stateAfterBump[sourceId] ?? 0) + deltaAmount;

  const deltas = new Array(n).fill(0);
  for (let s = 0; s < n; s++) {
    const sourceVal = stateAfterBump[componentIds[s]] ?? 0;
    if (sourceVal <= 0) continue;
    for (let t = 0; t < n; t++) {
      if (s === t) continue;
      const impact = (impactMatrix[s] && impactMatrix[s][t]) || 0;
      if (impact === 0) continue;
      deltas[t] += impact * sourceVal * scale * dt;
    }
  }

  const nextState = {};
  for (let i = 0; i < n; i++) {
    const id = componentIds[i];
    const v = (stateAfterBump[id] ?? 0) + deltas[i];
    nextState[id] = clamp(id, v, ranges);
  }

  // Keep source exactly at user-requested value (current + delta), not modified by impacts
  nextState[sourceId] = clamp(sourceId, stateAfterBump[sourceId] ?? 0, ranges);

  const destBefore = stateAfterBump[destId] ?? 0;
  const destAfter = nextState[destId] ?? 0;
  const destinationChange = destAfter - destBefore;

  return { nextState, destinationChange };
}
