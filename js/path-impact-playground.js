/**
 * Path impact: one-step update with impacts only (no birth/death).
 * So causal direction matches the matrix: e.g. reduce Wolves → less negative impact on Elk → Elk increases.
 */

function clamp(id, value, ranges) {
  const [min, max] = ranges[id] ?? [0, 1];
  return Math.max(min, Math.min(max, value));
}

// Gemini 1.0
// export function oneStepImpactOnly(currentState, sourceId, deltaAmount, componentIds, impactMatrix, ranges, options = {}) {
//   // Use a scale of 1.0 since we are directly passing percentage deltas now
//   const scale = options.scale ?? 1.0; 
//   const n = componentIds.length;
//   const sourceIdx = componentIds.indexOf(sourceId);
//   if (sourceIdx < 0) return { nextState: { ...currentState } };

//   const stateAfterBump = { ...currentState };
//   stateAfterBump[sourceId] = (stateAfterBump[sourceId] ?? 0) + deltaAmount;

//   // 1. Get current absolute percentages
//   const percentages = new Array(n).fill(0);
//   for (let i = 0; i < n; i++) {
//     const id = componentIds[i];
//     const [min, max] = ranges[id] ?? [0, 1];
//     percentages[i] = Math.max(0, Math.min(100, ((stateAfterBump[id] ?? 0) - min) * 100 / (max - min)));
//   }

//   // 2. Calculate the DELTA percentage of the source movement
//   const [sourceMin, sourceMax] = ranges[sourceId] ?? [0, 1];
//   const sourceDeltaPct = (deltaAmount / (sourceMax - sourceMin)) * 100;

//   const maxDepth = 17;

//   // 3. Ripple the DELTA through the system, not the absolute value
//   function dfs(currentIdx, currentDeltaPct, depth, visited) {
//     if (depth > maxDepth) return;
//     if (Math.abs(currentDeltaPct) < 0.01) return; // Cutoff for micro-changes

//     for (let t = 0; t < n; t++) {
//       if (t === currentIdx) continue;
//       const impact = (impactMatrix[currentIdx] && impactMatrix[currentIdx][t]) || 0;
//       if (impact === 0) continue;
//       if (visited.has(t)) continue; // Avoid infinite cycles

//       // Target change = Source change * Impact factor
//       const targetDeltaPct = currentDeltaPct * impact * scale;
//       const newTargetPct = Math.max(0, Math.min(100, percentages[t] + targetDeltaPct));
      
//       // Calculate the actual applied delta in case we hit 0% or 100% bounds
//       const actualAppliedDelta = newTargetPct - percentages[t];
//       percentages[t] = newTargetPct;

//       // Pass the ripple forward
//       if (Math.abs(actualAppliedDelta) > 0) {
//         visited.add(t);
//         dfs(t, actualAppliedDelta, depth + 1, visited);
//         visited.delete(t);
//       }
//     }
//   }

//   dfs(sourceIdx, sourceDeltaPct, 1, new Set([sourceIdx]));

//   const nextState = {};
//   for (let i = 0; i < n; i++) {
//     const id = componentIds[i];
//     const [min, max] = ranges[id] ?? [0, 1];
//     const v = min + percentages[i] * (max - min) / 100;
//     // Optional: if you have a custom clamp, use it here instead
//     nextState[id] = Math.max(min, Math.min(max, v)); 
//   }
//   return { nextState };
// }


export function oneStepImpactOnly(currentState, sourceId, deltaAmount, componentIds, impactMatrix, ranges, options = {}) {
  const scale = options.scale ?? 1.0;
  const perComponentScale = options.perComponentScale || {};
  const n = componentIds.length;
  const sourceIdx = componentIds.indexOf(sourceId);
  if (sourceIdx < 0) return { nextState: { ...currentState } };

  // 1. Get current absolute percentages
  const percentages = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const id = componentIds[i];
    const [min, max] = ranges[id] ?? [0, 1];
    // Base it cleanly off currentState
    percentages[i] = Math.max(0, Math.min(100, ((currentState[id] ?? 0) - min) * 100 / (max - min)));
  }

  // 2. Calculate the DELTA percentage of the source movement
  const [sourceMin, sourceMax] = ranges[sourceId] ?? [0, 1];
  const sourceDeltaPct = (deltaAmount / (sourceMax - sourceMin)) * 100;

  // 3. Initialize the first wave of changes
  let currentWave = new Array(n).fill(0);
  currentWave[sourceIdx] = sourceDeltaPct;

  // Apply the source bump to the percentages array
  percentages[sourceIdx] = Math.max(0, Math.min(100, percentages[sourceIdx] + sourceDeltaPct));

  // 4. Propagate the ripples generation by generation (Wavefront)
  const maxSteps = 10; // 10 degrees of separation is plenty for trophic cascades
  
  for (let step = 0; step < maxSteps; step++) {
    let nextWave = new Array(n).fill(0);
    let hasChanges = false;

    // Sum up all incoming impacts for the next step
    for (let i = 0; i < n; i++) {
      if (Math.abs(currentWave[i]) < 0.01) continue; // Ignore microscopic ripples

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

    // Apply the summed wave to our percentages
    for (let j = 0; j < n; j++) {
      // IMPORTANT: Don't let the ecosystem push back and move the slider the user is holding!
      if (j === sourceIdx) {
         nextWave[j] = 0; 
         continue; 
      }
      
      const oldPct = percentages[j];
      percentages[j] = Math.max(0, Math.min(100, oldPct + nextWave[j]));
      
      // Pass only the *actual* applied change to the next wave (respecting 0% and 100% bounds)
      nextWave[j] = percentages[j] - oldPct;
    }

    // Advance to the next generation
    currentWave = nextWave;
  }

  // 5. Convert percentages back to actual values
  const nextState = {};
  for (let i = 0; i < n; i++) {
    const id = componentIds[i];
    const [min, max] = ranges[id] ?? [0, 1];
    nextState[id] = min + percentages[i] * (max - min) / 100;
  }
  
  return { nextState };
}



/**
 * Apply one time step: bump source by deltaAmount, apply impact matrix only (no birth/death).
 * Returns { nextState } for the whole system.
 * Convention: impact[s][t] < 0 means source s hurts target t (e.g. Wolves hurt Elk). So fewer wolves → less negative effect on Elk → Elk goes up.
 */
// export function oneStepImpactOnly(currentState, sourceId, deltaAmount, componentIds, impactMatrix, ranges, options = {}) {
//   const scale = options.scale ?? 0.1;
//   const dt = 1.0;//options.dt ?? 0.1;

//   const n = componentIds.length;
//   const sourceIdx = componentIds.indexOf(sourceId);
//   if (sourceIdx < 0) {
//     return { nextState: { ...currentState } };
//   }

//   const stateAfterBump = { ...currentState };
//   stateAfterBump[sourceId] = (stateAfterBump[sourceId] ?? 0) + deltaAmount;

//   const deltas = new Array(n).fill(0);
//   const percentages = new Array(n).fill(0);
//   // Get current percentages of all components
//   for (let i = 0; i < n; i++) {
//     const id = componentIds[i];
//     const [min, max] = ranges[id] ?? [0, 1];
//     percentages[i] = Math.max(0, Math.min(100, ((stateAfterBump[id] ?? 0) - min) * 100 / (max - min)));
//   }
//   const maxDepth = 17;

//   function dfs(currentIdx, sourcePercentage, depth, visited) {
//     if (depth > maxDepth) return;

//     for (let t = 0; t < n; t++) {
//       if (t === currentIdx) continue;
//       const impact = (impactMatrix[currentIdx] && impactMatrix[currentIdx][t]) || 0;
//       if (impact === 0) continue;
//       if (visited.has(t)) continue; // avoid cycles

//       const destPercentage = Math.max(0, Math.min(100, sourcePercentage * impact * scale + percentages[t]));
//       percentages[t] = destPercentage;

//       visited.add(t);
//       dfs(t, destPercentage, depth + 1, visited);
//       visited.delete(t);
//     }
//   }

//   const sourcePercentage = percentages[sourceIdx];
//   dfs(sourceIdx, sourcePercentage, 1, new Set([sourceIdx]));

//   const nextState = {};
//   for (let i = 0; i < n; i++) {
//     const id = componentIds[i];
//     const [min, max] = ranges[id] ?? [0, 1];
//     const v = min + percentages[i] * (max - min) / 100;
//     nextState[id] = clamp(id, v, ranges);
//   }
//   nextState[sourceId] = clamp(sourceId, stateAfterBump[sourceId] ?? 0, ranges);
//   return { nextState };
// }
