/**
 * Yellowstone Game Logic
 * Brings together the simulation math, UI elements, and scenarios.
 */
// Extract data from the globally loaded game-data object
const {
  INITIAL_VALUES,
  COMPONENT_LABELS,
  COMPONENT_IDS,
  RANGES,
  BASE_IMPACT_MATRIX,
  PLAYGROUND_COMPONENT_SCALE
} = window.EcosystemConfig;
const oneStepImpactOnly = window.oneStepImpactOnly;

// ---- Data Organization ----
const CATEGORIES = {
  predators: ['Wolves', 'Bears', 'Elk', 'Cattle'],
  small: ['Birds', 'Fish', 'Beaver', 'OtherAnimals'],
  flora: ['Grass', 'CottonWood', 'BerryTrees'],
  env: ['RiverQuality', 'Dam', 'LandFertility'],
  human: ['RangersRanchers', 'Visitors', 'ParkRevenue']
};

// ---- Game State ----
let gameState = { ...INITIAL_VALUES };
let currentMode = 'sandbox'; // 'sandbox', 'mission1', 'mission2'
let impactMatrix = BASE_IMPACT_MATRIX.map(row => [...row]);
let missionJustWon = false;
let missionProgress = 0; // highest completed mission number (0 = none)

const MISSION_PROGRESS_STORAGE_KEY = 'yellowstone-mission-progress';

function missionNumberFromMode(mode) {
  const m = /^mission(\d+)$/.exec(mode);
  return m ? parseInt(m[1], 10) : null;
}

function isMissionMode(mode) {
  return /^mission\d+$/.test(mode);
}

function loadMissionProgress() {
  try {
    const raw = localStorage.getItem(MISSION_PROGRESS_STORAGE_KEY);
    // Back-compat: older builds stored only a "mission 1 completed" boolean.
    const legacyMission1 = localStorage.getItem('yellowstone-mission1-completed') === '1';
    const n = raw == null ? (legacyMission1 ? 1 : 0) : parseInt(raw, 10);
    missionProgress = Number.isFinite(n) && n >= 0 ? n : 0;
  } catch (_) {
    missionProgress = 0;
  }
}

function storeMissionProgress() {
  try {
    localStorage.setItem(MISSION_PROGRESS_STORAGE_KEY, String(missionProgress));
  } catch (_) {}
}

function updateMissionLocksUI() {
  const unlockedUpTo = missionProgress + 1; // next mission becomes available
  for (let i = 1; i <= 6; i++) {
    const btn = document.getElementById(`btn-mode-mission${i}`);
    if (!btn) continue;
    const unlocked = i <= unlockedUpTo;
    btn.disabled = !unlocked;
    btn.title = unlocked ? `Mission ${i} unlocked!` : `Complete Mission ${i - 1} to unlock Mission ${i}.`;
  }
}

function triggerVictoryFeedback() {
  // Visual: small pop on the whole page + quick sparkle burst overlay
  document.body.classList.remove('victory-pop');
  // Force reflow so re-adding class restarts animation
  void document.body.offsetWidth;
  document.body.classList.add('victory-pop');

  // Party popper emoji
  const popper = document.createElement('div');
  popper.className = 'party-popper';
  popper.textContent = '🎉';
  document.body.appendChild(popper);
  popper.addEventListener('animationend', () => popper.remove(), { once: true });

  const burst = document.createElement('div');
  burst.className = 'victory-burst';
  document.body.appendChild(burst);
  burst.addEventListener('animationend', () => burst.remove(), { once: true });

  // Confetti (small burst of falling pieces)
  const colors = ['#FF9800', '#4CAF50', '#FFEB3B', '#2196F3', '#E91E63', '#9C27B0'];
  const pieces = 36;
  for (let i = 0; i < pieces; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    const startX = Math.random() * 100;
    const drift = (Math.random() * 26 - 13);
    c.style.left = `${startX}vw`;
    c.style.setProperty('--x0', '0vw');
    c.style.setProperty('--x1', `${drift}vw`);
    c.style.setProperty('--confetti-color', colors[i % colors.length]);
    c.style.animationDelay = `${Math.random() * 180}ms`;
    c.style.width = `${6 + Math.random() * 8}px`;
    c.style.height = `${8 + Math.random() * 10}px`;
    document.body.appendChild(c);
    c.addEventListener('animationend', () => c.remove(), { once: true });
  }

  // Sound: short victory “soundtrack” jingle (no external asset)
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.22, now + 0.015);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
    master.connect(ctx.destination);

    // Melody + harmony (C major, upbeat)
    const melody = [
      { t: 0.00, f: 659.25, d: 0.18 }, // E5
      { t: 0.18, f: 783.99, d: 0.18 }, // G5
      { t: 0.36, f: 880.00, d: 0.18 }, // A5
      { t: 0.54, f: 783.99, d: 0.18 }, // G5
      { t: 0.72, f: 1046.5, d: 0.24 }, // C6
      { t: 0.98, f: 987.77, d: 0.20 }, // B5
      { t: 1.18, f: 1046.5, d: 0.30 }, // C6
      { t: 1.52, f: 1318.51, d: 0.32 }, // E6
      { t: 1.88, f: 1046.5, d: 0.42 } // C6 resolve
    ];

    const playNote = (freq, start, dur, type, gainScale) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(gainScale, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(g);
      g.connect(master);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    };

    melody.forEach(n => {
      playNote(n.f, now + n.t, n.d, 'triangle', 0.9);
      // simple harmony a third below (soft)
      playNote(n.f / 1.2599, now + n.t, n.d, 'sine', 0.35);
    });

    // Little “sparkle” noise tick at the start
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    noise.connect(noiseGain);
    noiseGain.connect(master);
    noise.start(now);
    noise.stop(now + 0.09);

    // Close context shortly after sound completes to avoid leaks.
    setTimeout(() => ctx.close().catch(() => {}), 2800);
  } catch (_) {
    // If audio is blocked or unavailable, just skip sound.
  }
}

// ---- Scenarios Definitions ----
const SCENARIOS = {
  mission1: {
    title: "Mission 1: The Barren Land",
    goal: "The elk have eaten all the grass! Introduce Wolves to bring back the Grass to 60%.",
    setup: () => {
      // Setup the "problem"
      gameState = { ...INITIAL_VALUES };
      gameState.Wolves = RANGES.Wolves[0]; // Min wolves
      gameState.Elk = RANGES.Elk[1] * 0.9; // 90% Elk
      gameState.Grass = getValueFromPercentage(20, RANGES.Grass); // Start at 20% Grass
    },
    checkWin: () => {
      // Win condition: Grass is >= 60% of max
      const grassPct = getPercentage(gameState.Grass, RANGES.Grass);
      return grassPct >= 60;
    }
  },
  mission2: {
    title: "Mission 2: Bring Back the Fish",
    goal: "The river is dirty and the fish are gone! Increase Beavers and plant more Cottonwood so Beavers can build Dams and help the river recover.",
    setup: () => {
      gameState = { ...INITIAL_VALUES };
      gameState.Beaver = getValueFromPercentage(10, RANGES.Beaver); // Start at 10% Beaver
      gameState.CottonWood = getValueFromPercentage(20, RANGES.CottonWood); // Start at 20% Cottonwood
      gameState.Dam = RANGES.Dam[0];
      gameState.RiverQuality = RANGES.RiverQuality[0];
      gameState.Fish = RANGES.Fish[0];
    },
    checkWin: () => {
      const fishPct = getPercentage(gameState.Fish, RANGES.Fish);
      const damPct = getPercentage(gameState.Dam, RANGES.Dam);
      const beaverPct = getPercentage(gameState.Beaver, RANGES.Beaver);
      const cottonwoodPct = getPercentage(gameState.CottonWood, RANGES.CottonWood);
      return fishPct >= 40 && damPct >= 50 && beaverPct >= 30 && cottonwoodPct >= 40;
    }
  },
  mission3: {
    title: "Mission 3: Birdsong Returns",
    goal: "The skies are too quiet. Help Birds return by improving river health and growing Berry Trees.",
    setup: () => {
      gameState = { ...INITIAL_VALUES };
      gameState.Birds = getValueFromPercentage(20, RANGES.Birds);
      gameState.RiverQuality = getValueFromPercentage(40, RANGES.RiverQuality);
      gameState.BerryTrees = getValueFromPercentage(25, RANGES.BerryTrees);
    },
    checkWin: () => {
      const birdsPct = getPercentage(gameState.Birds, RANGES.Birds);
      const riverPct = getPercentage(gameState.RiverQuality, RANGES.RiverQuality);
      const berryPct = getPercentage(gameState.BerryTrees, RANGES.BerryTrees);
      return birdsPct >= 55 && riverPct >= 55 && berryPct >= 45;
    }
  },
  mission4: {
    title: "Mission 4: Healthy Soil, Healthy Park",
    goal: "The ground is worn out. Restore Land Fertility so plants can bounce back and the park stays healthy.",
    setup: () => {
      gameState = { ...INITIAL_VALUES };
      gameState.LandFertility = getValueFromPercentage(25, RANGES.LandFertility);
      gameState.Grass = getValueFromPercentage(40, RANGES.Grass);
      gameState.CottonWood = getValueFromPercentage(35, RANGES.CottonWood);
    },
    checkWin: () => {
      const landPct = getPercentage(gameState.LandFertility, RANGES.LandFertility);
      const grassPct = getPercentage(gameState.Grass, RANGES.Grass);
      const cottonwoodPct = getPercentage(gameState.CottonWood, RANGES.CottonWood);
      return landPct >= 60 && grassPct >= 60 && cottonwoodPct >= 50;
    }
  },
  mission5: {
    title: "Mission 5: Ranching vs. Rewilding",
    goal: "Wolves are being killed as human activity increases. Reduce human pressure (Rangers/Ranchers) so Wolves can recover.",
    setup: () => {
      gameState = { ...INITIAL_VALUES };
      // High ranching + human pressure, low wolves
      gameState.Wolves = getValueFromPercentage(15, RANGES.Wolves);
      gameState.RangersRanchers = getValueFromPercentage(80, RANGES.RangersRanchers);
      gameState.Grass = getValueFromPercentage(40, RANGES.Grass);
    },
    checkWin: () => {
      const wolvesPct = getPercentage(gameState.Wolves, RANGES.Wolves);
      const rangersPct = getPercentage(gameState.RangersRanchers, RANGES.RangersRanchers);
      return wolvesPct >= 30 && rangersPct <= 50;
    }
  },
  mission6: {
    title: "Mission 6: Tourism Boom, Park Balance",
    goal: "Visitor numbers are soaring. Keep the park funded while protecting nature with good stewardship.",
    setup: () => {
      gameState = { ...INITIAL_VALUES };
      gameState.Visitors = getValueFromPercentage(85, RANGES.Visitors);
      gameState.RiverQuality = getValueFromPercentage(50, RANGES.RiverQuality);
      gameState.ParkRevenue = getValueFromPercentage(65, RANGES.ParkRevenue);
      gameState.RangersRanchers = getValueFromPercentage(40, RANGES.RangersRanchers);
    },
    checkWin: () => {
      const visitorsPct = getPercentage(gameState.Visitors, RANGES.Visitors);
      const riverPct = getPercentage(gameState.RiverQuality, RANGES.RiverQuality);
      const revenuePct = getPercentage(gameState.ParkRevenue, RANGES.ParkRevenue);
      const rangersPct = getPercentage(gameState.RangersRanchers, RANGES.RangersRanchers);
      return revenuePct >= 60 && riverPct >= 55 && rangersPct >= 55 && visitorsPct <= 70;
    }
  }
};

// ---- Helper Functions ----
function getPercentage(value, range) {
  const [min, max] = range;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function getValueFromPercentage(pct, range) {
  const [min, max] = range;
  return min + (pct / 100) * (max - min);
}

function getEmojiForPercentage(pct) {
  if (pct < 15) return '💀'; // Dangerously low
  if (pct < 30) return '😟'; // Very low
  if (pct > 90) return '🤯'; // Overpopulated / Maxed
  if (pct > 75) return '😊'; // Thriving
  return '🙂'; // Balanced
}

function getStatusClassForPercentage(pct) {
  if (pct < 15 || pct > 95) return 'danger';
  if (pct < 30 || pct > 85) return 'warning';
  return 'normal';
}

// ---- UI Rendering ----
function initUI() {
  COMPONENT_IDS.forEach(id => {
    // Find category for this ID
    let catKey = Object.keys(CATEGORIES).find(key => CATEGORIES[key].includes(id));
    if (!catKey) catKey = 'small'; // Fallback
    
    const container = document.getElementById(`grid-${catKey}`);
    if (!container) return;

    const label = COMPONENT_LABELS[id];
    const pct = getPercentage(gameState[id], RANGES[id]);
    
    const card = document.createElement('div');
    card.className = 'actor-card';
    card.id = `card-${id}`;
    
    card.innerHTML = `
      <div class="actor-card-media">
        <img class="actor-card-img" src="assets/card-images/${id}.png" alt="${label}" 
             onerror="this.src='assets/card-images/${id}.jpg'; this.onerror=function(){this.style.display='none'; this.nextElementSibling.style.display='flex';};" />
        <span class="actor-card-placeholder" style="display:none;">${label.charAt(0)}</span>
      </div>
      <h3 class="actor-card-title">${label}</h3>
      <div class="card-status" id="status-${id}">${getEmojiForPercentage(pct)}</div>
      
      <div class="actor-card-slider-wrap">
        <div class="actor-card-track">
          <div class="actor-card-fill" id="fill-${id}" style="width: ${pct}%"></div>
        </div>
        <input type="range" id="slider-${id}" data-id="${id}" min="0" max="100" step="1" value="${Math.round(pct)}" />
      </div>
      <div class="actor-card-row">
        <span>Level</span>
        <span id="pct-${id}">${Math.round(pct)}%</span>
      </div>
    `;

    container.appendChild(card);

    // Event Listener for Slider
    const slider = card.querySelector(`#slider-${id}`);
    slider.addEventListener('input', (e) => handleSliderInput(e, id));
    // Optional: add a 'change' listener for when they let go of the drag
    slider.addEventListener('change', () => checkGameConditions());
  });

  // Buttons
  document.getElementById('btn-reset').addEventListener('click', () => {
    setMode(currentMode);
  });

  document.getElementById('btn-mode-sandbox').addEventListener('click', () => setMode('sandbox'));
  document.getElementById('btn-mode-mission1').addEventListener('click', () => setMode('mission1'));
  document.getElementById('btn-mode-mission2').addEventListener('click', () => setMode('mission2'));
  document.getElementById('btn-mode-mission3').addEventListener('click', () => setMode('mission3'));
  document.getElementById('btn-mode-mission4').addEventListener('click', () => setMode('mission4'));
  document.getElementById('btn-mode-mission5').addEventListener('click', () => setMode('mission5'));
  document.getElementById('btn-mode-mission6').addEventListener('click', () => setMode('mission6'));
}

function updateUI() {
  let ecosystemHealth = 0;
  let extremes = 0;

  COMPONENT_IDS.forEach(id => {
    const pct = getPercentage(gameState[id], RANGES[id]);
    const roundedPct = Math.round(pct);
    ecosystemHealth += pct;
    
    if (pct < 10 || pct > 90) extremes++;

    const slider = document.getElementById(`slider-${id}`);
    const fill = document.getElementById(`fill-${id}`);
    const pctLabel = document.getElementById(`pct-${id}`);
    const status = document.getElementById(`status-${id}`);
    const card = document.getElementById(`card-${id}`);

    if (slider && document.activeElement !== slider) {
      // Don't update the slider the user is currently holding
      slider.value = roundedPct;
    }
    
    if (fill) fill.style.width = `${pct}%`;
    if (pctLabel) pctLabel.textContent = `${roundedPct}%`;
    if (status) status.textContent = getEmojiForPercentage(pct);
    
    if (card) {
      card.className = `actor-card ${getStatusClassForPercentage(pct)}`;
    }
  });

  // Sandbox Alerts logic
  if (currentMode === 'sandbox') {
    const alertBanner = document.getElementById('alert-banner');
    const alertMsg = document.getElementById('alert-message');
    if (extremes > 3) {
      alertBanner.classList.remove('hidden');
      alertMsg.textContent = "The ecosystem is unbalanced! Several populations are at extreme limits.";
    } else {
      alertBanner.classList.add('hidden');
    }
  }
}

// ---- Core Logic ----
function handleSliderInput(event, sourceId) {
  const newPct = parseFloat(event.target.value);
  const newVal = getValueFromPercentage(newPct, RANGES[sourceId]);
  
  const currentVal = gameState[sourceId];
  const delta = newVal - currentVal;
  
  if (Math.abs(delta) < 0.001) return;

  const { nextState } = oneStepImpactOnly(
    gameState,
    sourceId,
    delta,
    COMPONENT_IDS,
    impactMatrix,
    RANGES,
    { scale: 1.0, perComponentScale: PLAYGROUND_COMPONENT_SCALE }
  );
  
  // Flash cards that changed significantly
  COMPONENT_IDS.forEach(id => {
     if (id !== sourceId && Math.abs(nextState[id] - gameState[id]) > 0.5) {
        const card = document.getElementById(`card-${id}`);
        if(card) {
          card.classList.remove('impact-flash');
          void card.offsetWidth; // trigger reflow
          card.classList.add('impact-flash');
        }
     }
  });

  gameState = nextState;
  updateUI();
}

function checkGameConditions() {
  if (currentMode !== 'sandbox' && SCENARIOS[currentMode]) {
    const isWin = SCENARIOS[currentMode].checkWin();
    const statusEl = document.getElementById('mission-status');
    if (isWin) {
      statusEl.textContent = "Mission Accomplished! 🎉";
      statusEl.classList.add('success');

      if (!missionJustWon) {
        missionJustWon = true;
        const n = missionNumberFromMode(currentMode);
        if (n != null && n > missionProgress) {
          missionProgress = n;
          storeMissionProgress();
          updateMissionLocksUI();
        }
        triggerVictoryFeedback();
      }
    } else {
      statusEl.textContent = "In Progress";
      statusEl.classList.remove('success');
      missionJustWon = false;
    }
  }
}

function setMode(mode) {
  // Gate: missions unlock sequentially (Mission n+1 after Mission n).
  if (isMissionMode(mode)) {
    const requested = missionNumberFromMode(mode) || 1;
    const unlockedUpTo = missionProgress + 1;
    if (requested > unlockedUpTo) {
      mode = `mission${Math.max(1, unlockedUpTo)}`;
    }
  }
  currentMode = mode;
  missionJustWon = false;
  
  // Update UI buttons
  document.querySelectorAll('.btn-mode').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`btn-mode-${mode}`).classList.add('active');

  const missionInfo = document.getElementById('mission-info');
  const alertBanner = document.getElementById('alert-banner');

  if (mode === 'sandbox') {
    gameState = { ...INITIAL_VALUES };
    missionInfo.classList.add('hidden');
    alertBanner.classList.add('hidden');
  } else {
    // Mission mode
    SCENARIOS[mode].setup();
    missionInfo.classList.remove('hidden');
    alertBanner.classList.add('hidden');
    
    document.getElementById('mission-title').textContent = SCENARIOS[mode].title;
    document.getElementById('mission-goal').textContent = SCENARIOS[mode].goal;
    
    const statusEl = document.getElementById('mission-status');
    statusEl.textContent = "In Progress";
    statusEl.classList.remove('success');
  }

  updateUI();
}


// ---- Initialization ----
document.addEventListener('DOMContentLoaded', () => {
  loadMissionProgress();
  initUI();
  updateMissionLocksUI();
  setMode('sandbox'); // Start in sandbox mode
});
