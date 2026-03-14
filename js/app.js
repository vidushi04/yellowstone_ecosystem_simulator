/**
 * Yellowstone Ecosystem — interactive app
 * Connects UI (sliders, run/pause, dev panel) to the simulation engine.
 */

import { createEngine } from './ecosystem-engine.js';
import {
  INITIAL_VALUES,
  COMPONENT_LABELS,
  COMPONENT_IDS,
  RANGES,
  BASE_IMPACT_MATRIX
} from '../data/ecosystem-config.js';

// Abbreviations for dev grid
const SHORT_LABELS = {
  Wolves: 'Wlf', Elk: 'Elk', CottonWood: 'Cot', BerryTrees: 'Ber', Grass: 'Grs',
  Bears: 'Br', LandFertility: 'Lnd', Birds: 'Brd', RiverQuality: 'Riv', Beaver: 'Bvr',
  Dam: 'Dam', Fish: 'Fsh', OtherAnimals: 'Oth', Cattle: 'Cat', RangersRanchers: 'Rng',
  Visitors: 'Vst', ParkRevenue: 'Rev'
};

const LIVE_IMPACT_STORAGE_KEY = 'yellowstone-live-impact-matrix';

const engine = createEngine({ timeStep: 0.15 });
engine.setState(INITIAL_VALUES);

// Load stored live impact numbers: try data/live-impact-matrix.json first, then localStorage
async function loadStoredImpactMatrix() {
  try {
    const res = await fetch('data/live-impact-matrix.json');
    if (res.ok) {
      const data = await res.json();
      if (data.matrix && Array.isArray(data.matrix) && data.matrix.length === COMPONENT_IDS.length) {
        engine.setImpactMatrix(data.matrix);
        if (typeof data.globalImpactScale === 'number') {
          engine.setImpactScale(data.globalImpactScale);
          const scaleEl = document.getElementById('global-impact-scale');
          const valueEl = document.getElementById('global-scale-value');
          if (scaleEl) scaleEl.value = data.globalImpactScale;
          if (valueEl) valueEl.textContent = String(data.globalImpactScale);
        }
        return;
      }
    }
  } catch (_) {}
  try {
    const raw = localStorage.getItem(LIVE_IMPACT_STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.matrix && Array.isArray(data.matrix)) {
        engine.setImpactMatrix(data.matrix);
        if (typeof data.globalImpactScale === 'number') {
          engine.setImpactScale(data.globalImpactScale);
          const scaleEl = document.getElementById('global-impact-scale');
          const valueEl = document.getElementById('global-scale-value');
          if (scaleEl) scaleEl.value = data.globalImpactScale;
          if (valueEl) valueEl.textContent = String(data.globalImpactScale);
        }
      }
    }
  } catch (_) {}
}

function getLiveImpactNumbers() {
  return {
    description: 'Live impact matrix (current simulation values). Save as data/live-impact-matrix.json to store.',
    componentIds: [...COMPONENT_IDS],
    globalImpactScale: parseFloat(document.getElementById('global-impact-scale')?.value || '0.35'),
    matrix: engine.getImpactMatrix()
  };
}

function storeLiveImpactNumbers() {
  const data = getLiveImpactNumbers();
  try {
    localStorage.setItem(LIVE_IMPACT_STORAGE_KEY, JSON.stringify(data));
  } catch (_) {}
}

function exportLiveImpactMatrix() {
  const data = getLiveImpactNumbers();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'live-impact-matrix.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

let running = false;
let animationId = null;
let simTime = 0;

const el = {
  btnRun: document.getElementById('btn-run'),
  btnPause: document.getElementById('btn-pause'),
  btnReset: document.getElementById('btn-reset'),
  simTime: document.getElementById('sim-time'),
  componentCards: document.getElementById('component-cards'),
  devPanelToggle: document.getElementById('dev-panel-toggle'),
  devPanel: document.getElementById('dev-panel'),
  globalImpactScale: document.getElementById('global-impact-scale'),
  globalScaleValue: document.getElementById('global-scale-value'),
  impactGrid: document.getElementById('impact-grid'),
  rippleComponent: document.getElementById('ripple-component'),
  rippleAmount: document.getElementById('ripple-amount'),
  btnRippleApply: document.getElementById('btn-ripple-apply'),
  btnRippleApplyRun: document.getElementById('btn-ripple-apply-run')
};

function setupRippleControl() {
  if (!el.rippleComponent) return;
  el.rippleComponent.innerHTML = COMPONENT_IDS.map(id =>
    `<option value="${id}">${COMPONENT_LABELS[id]}</option>`
  ).join('');
  function applyRipple(startRun) {
    const id = el.rippleComponent?.value;
    const amount = parseFloat(el.rippleAmount?.value) || 0;
    if (!id || amount <= 0) return;
    const state = engine.getState();
    const ranges = engine.ranges;
    const [min, max] = ranges[id] ?? [0, 1];
    const current = state[id] ?? min;
    const next = Math.min(max, Math.max(min, current + amount));
    engine.setState({ ...state, [id]: next });
    COMPONENT_IDS.forEach(cid => updateCardValue(cid, (engine.getState())[cid]));
    const sliderEl = el.componentCards?.querySelector(`input[data-id="${id}"]`);
    if (sliderEl) sliderEl.value = next;
    if (startRun && !running) run();
  }
  el.btnRippleApply?.addEventListener('click', () => applyRipple(false));
  el.btnRippleApplyRun?.addEventListener('click', () => applyRipple(true));
}

function renderComponentCards() {
  const state = engine.getState();
  const ranges = engine.ranges;
  el.componentCards.innerHTML = '';

  COMPONENT_IDS.forEach(id => {
    const value = state[id] ?? 0;
    const [min, max] = ranges[id];
    const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
    const label = COMPONENT_LABELS[id];

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-header">
        <span class="card-title">${label}</span>
        <span class="card-value" data-id="${id}">${formatVal(value)}</span>
      </div>
      <div class="card-bar-wrap">
        <div class="card-bar" data-id="${id}" style="width: ${pct}%"></div>
      </div>
      <div class="card-meta">${formatVal(min)} – ${formatVal(max)}</div>
      <input type="range" data-id="${id}" min="${min}" max="${max}" step="${stepFor(min, max)}" value="${value}" />
    `;
    const slider = card.querySelector('input[type="range"]');
    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      engine.setState({ ...engine.getState(), [id]: v });
      updateCardValue(id, v);
    });
    el.componentCards.appendChild(card);
  });
}

function stepFor(min, max) {
  const range = max - min;
  if (range <= 10) return 0.5;
  if (range <= 100) return 1;
  if (range <= 500) return 5;
  return 10;
}

function formatVal(x) {
  if (Number.isInteger(x)) return String(x);
  return x.toFixed(2);
}

function updateCardValue(id, value) {
  const state = engine.getState();
  const ranges = engine.ranges;
  const [min, max] = ranges[id];
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  const valEl = el.componentCards.querySelector(`.card-value[data-id="${id}"]`);
  const barEl = el.componentCards.querySelector(`.card-bar[data-id="${id}"]`);
  const sliderEl = el.componentCards.querySelector(`input[data-id="${id}"]`);
  if (valEl) valEl.textContent = formatVal(value);
  if (barEl) barEl.style.width = `${pct}%`;
  if (sliderEl) sliderEl.value = value;
}

function tickAndRender() {
  const prev = engine.getState();
  const next = engine.tick(prev);
  engine.setState(next);
  simTime += 1;
  el.simTime.textContent = simTime;

  COMPONENT_IDS.forEach(id => {
    updateCardValue(id, next[id]);
  });

  if (running) {
    animationId = requestAnimationFrame(tickAndRender);
  }
}

function run() {
  if (running) return;
  running = true;
  el.btnRun.disabled = true;
  el.btnPause.disabled = false;
  tickAndRender();
}

function pause() {
  running = false;
  if (animationId) cancelAnimationFrame(animationId);
  el.btnRun.disabled = false;
  el.btnPause.disabled = true;
}

function reset() {
  pause();
  engine.setState(INITIAL_VALUES);
  simTime = 0;
  el.simTime.textContent = '0';
  renderComponentCards();
}

function renderDevPanel() {
  const matrix = engine.getImpactMatrix();
  el.impactGrid.innerHTML = '';
  const n = COMPONENT_IDS.length;

  // Header row: empty corner + target labels
  const headerRow = document.createElement('div');
  headerRow.className = 'impact-row';
  const corner = document.createElement('div');
  corner.className = 'impact-cell header';
  headerRow.appendChild(corner);
  COMPONENT_IDS.forEach(id => {
    const c = document.createElement('div');
    c.className = 'impact-cell header';
    c.textContent = SHORT_LABELS[id] || id.slice(0, 3);
    c.title = COMPONENT_LABELS[id];
    headerRow.appendChild(c);
  });
  el.impactGrid.appendChild(headerRow);

  // Data rows: source label + impacts
  for (let i = 0; i < n; i++) {
    const row = document.createElement('div');
    row.className = 'impact-row';
    const srcLabel = document.createElement('div');
    srcLabel.className = 'impact-cell header';
    srcLabel.textContent = SHORT_LABELS[COMPONENT_IDS[i]] || COMPONENT_IDS[i].slice(0, 3);
    srcLabel.title = COMPONENT_LABELS[COMPONENT_IDS[i]];
    row.appendChild(srcLabel);
    for (let j = 0; j < n; j++) {
      const cell = document.createElement('div');
      cell.className = 'impact-cell' + (matrix[i][j] === 0 ? ' zero' : '');
      const input = document.createElement('input');
      input.type = 'number';
      input.step = 0.01;
      input.value = matrix[i][j];
      input.title = `${COMPONENT_LABELS[COMPONENT_IDS[i]]} → ${COMPONENT_LABELS[COMPONENT_IDS[j]]}`;
      input.addEventListener('change', () => {
        const v = parseFloat(input.value) || 0;
        engine.setImpactFactor(i, j, v);
        storeLiveImpactNumbers();
      });
      cell.appendChild(input);
      row.appendChild(cell);
    }
    el.impactGrid.appendChild(row);
  }

  const cols = n + 1;
  el.impactGrid.style.gridTemplateColumns = `auto repeat(${n}, minmax(42px, 1fr))`;
  el.impactGrid.style.gridTemplateRows = `repeat(${cols}, auto)`;
}

el.btnRun.addEventListener('click', run);
el.btnPause.addEventListener('click', pause);
el.btnReset.addEventListener('click', reset);

el.devPanelToggle.addEventListener('change', () => {
  el.devPanel.classList.toggle('hidden', !el.devPanelToggle.checked);
  if (el.devPanelToggle.checked && !el.impactGrid.innerHTML) renderDevPanel();
});

el.globalImpactScale.addEventListener('input', () => {
  const v = parseFloat(el.globalImpactScale.value);
  engine.setImpactScale(v);
  el.globalScaleValue.textContent = v.toFixed(1);
  storeLiveImpactNumbers();
});

const btnExportImpact = document.getElementById('btn-export-impact');
if (btnExportImpact) btnExportImpact.addEventListener('click', exportLiveImpactMatrix);

// Load stored live impact matrix, then initial render
(async () => {
  await loadStoredImpactMatrix();
  renderComponentCards();
  setupRippleControl();
  el.globalScaleValue.textContent = el.globalImpactScale.value;
})();
