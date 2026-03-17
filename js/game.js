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

// ---- Scenarios Definitions ----
const SCENARIOS = {
  mission1: {
    title: "Mission 1: The Barren Land",
    goal: "The elk have eaten all the Cottonwood! Introduce Wolves to bring back the Cottonwood to 60%.",
    setup: () => {
      // Setup the "problem"
      gameState = { ...INITIAL_VALUES };
      gameState.Wolves = RANGES.Wolves[0]; // Min wolves
      gameState.Elk = RANGES.Elk[1] * 0.9; // 90% Elk
      gameState.CottonWood = RANGES.CottonWood[0]; // Min Cottonwood
    },
    checkWin: () => {
      // Win condition: Cottonwood is >= 60% of max
      const cwPct = getPercentage(gameState.CottonWood, RANGES.CottonWood);
      return cwPct >= 60;
    }
  },
  mission2: {
    title: "Mission 2: Bring Back the Fish",
    goal: "The river is dirty and the fish are gone! Bring back Beavers to build Dams and clean the river.",
    setup: () => {
      gameState = { ...INITIAL_VALUES };
      gameState.Beaver = RANGES.Beaver[0];
      gameState.Dam = RANGES.Dam[0];
      gameState.RiverQuality = RANGES.RiverQuality[0];
      gameState.Fish = RANGES.Fish[0];
    },
    checkWin: () => {
      const fishPct = getPercentage(gameState.Fish, RANGES.Fish);
      const damPct = getPercentage(gameState.Dam, RANGES.Dam);
      return fishPct >= 50 && damPct >= 40;
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
      
      // Add a visual pop effect
      document.body.style.animation = 'pop 0.5s';
      setTimeout(() => document.body.style.animation = '', 500);
    } else {
      statusEl.textContent = "In Progress";
      statusEl.classList.remove('success');
    }
  }
}

function setMode(mode) {
  currentMode = mode;
  
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
  initUI();
  setMode('sandbox'); // Start in sandbox mode
});
