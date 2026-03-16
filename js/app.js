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
import { oneStepImpactOnly } from './path-impact.js';

// Abbreviations for dev grid
const SHORT_LABELS = {
  Wolves: 'Wlf', Elk: 'Elk', CottonWood: 'Cot', BerryTrees: 'Ber', Grass: 'Grs',
  Bears: 'Br', LandFertility: 'Lnd', Birds: 'Brd', RiverQuality: 'Riv', Beaver: 'Bvr',
  Dam: 'Dam', Fish: 'Fsh', OtherAnimals: 'Oth', Cattle: 'Cat', RangersRanchers: 'Rng',
  Visitors: 'Vst', ParkRevenue: 'Rev'
};

const LIVE_IMPACT_STORAGE_KEY = 'yellowstone-live-impact-matrix';

let engine;

// Load live impact matrix from data/live-impact-matrix.json or localStorage. Used to overwrite impact at startup.
async function loadLiveImpactMatrix() {
  try {
    const res = await fetch('data/live-impact-matrix.json');
    if (res.ok) {
      const data = await res.json();
      if (data.matrix && Array.isArray(data.matrix) && data.matrix.length === COMPONENT_IDS.length) {
        return {
          matrix: data.matrix,
          globalImpactScale: typeof data.globalImpactScale === 'number' ? data.globalImpactScale : undefined
        };
      }
    }
  } catch (_) {}
  try {
    const raw = localStorage.getItem(LIVE_IMPACT_STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.matrix && Array.isArray(data.matrix) && data.matrix.length === COMPONENT_IDS.length) {
        return {
          matrix: data.matrix,
          globalImpactScale: typeof data.globalImpactScale === 'number' ? data.globalImpactScale : undefined
        };
      }
    }
  } catch (_) {}
  return {};
}

function getLiveImpactNumbers() {
  if (!engine) return { componentIds: COMPONENT_IDS, globalImpactScale: 0.35, matrix: [] };
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
  pathSource: document.getElementById('path-source'),
  pathDest: document.getElementById('path-dest'),
  pathDelta: document.getElementById('path-delta'),
  pathImpactBtn: document.getElementById('path-impact-btn'),
  pathImpactReset: document.getElementById('path-impact-reset'),
  pathImpactTableWrap: document.getElementById('path-impact-table-wrap'),
  pathImpactResult: document.getElementById('path-impact-result'),
  pathDestLabel: document.getElementById('path-dest-label'),
  pathDestBefore: document.getElementById('path-dest-before'),
  pathDestAfter: document.getElementById('path-dest-after'),
  pathDestDelta: document.getElementById('path-dest-delta')
};

let pathImpactState = {};

function setupPathImpact() {
  if (!el.pathSource || !el.pathDest) return;
  pathImpactState = { ...INITIAL_VALUES };
  COMPONENT_IDS.forEach(id => {
    el.pathSource.appendChild(new Option(COMPONENT_LABELS[id], id));
    el.pathDest.appendChild(new Option(COMPONENT_LABELS[id], id));
  });
  el.pathImpactBtn.addEventListener('click', runPathImpact);
  if (el.pathImpactReset) el.pathImpactReset.addEventListener('click', () => {
    pathImpactState = { ...INITIAL_VALUES };
    renderPathImpactTable();
    if (el.pathImpactResult) el.pathImpactResult.classList.add('hidden');
  });
  renderPathImpactTable();
}

function renderPathImpactTable() {
  if (!el.pathImpactTableWrap) return;
  let html = '<table class="path-impact-table"><thead><tr><th>Component</th><th>Value</th></tr></thead><tbody>';
  COMPONENT_IDS.forEach(id => {
    const v = pathImpactState[id] ?? 0;
    html += `<tr><td>${COMPONENT_LABELS[id]}</td><td>${Number(v).toFixed(2)}</td></tr>`;
  });
  html += '</tbody></table>';
  el.pathImpactTableWrap.innerHTML = html;
}

function runPathImpact() {
  const sourceId = el.pathSource?.value;
  const destId = el.pathDest?.value;
  const deltaAmount = parseFloat(el.pathDelta?.value) || 0;
  if (!sourceId || !destId) return;
  // One step from current state: add deltaAmount to source, apply impacts + birth/death, update table
  const destBefore = pathImpactState[destId] ?? 0;
  const matrix = engine ? engine.getImpactMatrix() : BASE_IMPACT_MATRIX;
  const result = oneStepImpactOnly(pathImpactState, sourceId, destId, deltaAmount, COMPONENT_IDS, matrix, RANGES, { scale: 0.35, dt: 0.15 });
  pathImpactState = result.nextState;
  const destAfter = result.nextState[destId] ?? 0;
  renderPathImpactTable();
  if (el.pathImpactResult) {
    const fmt = (x) => (x >= 0 ? '+' : '') + Number(x).toFixed(3);
    if (el.pathDestLabel) el.pathDestLabel.textContent = COMPONENT_LABELS[destId] || destId;
    if (el.pathDestBefore) el.pathDestBefore.textContent = Number(destBefore).toFixed(3);
    if (el.pathDestAfter) el.pathDestAfter.textContent = Number(destAfter).toFixed(3);
    if (el.pathDestDelta) el.pathDestDelta.textContent = fmt(result.destinationChange);
    el.pathImpactResult.classList.remove('hidden');
  }
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

    const pctInt = Math.round(pct);
    const card = document.createElement('div');
    card.className = 'actor-card';
    card.innerHTML = `
      <div class="actor-card-media" data-id="${id}">
        <img class="actor-card-img" data-id="${id}" alt="${label}" />
        <span class="actor-card-placeholder">${label.charAt(0)}</span>
      </div>
      <div class="actor-card-body">
        <h3 class="actor-card-title">${label}</h3>
        <div class="actor-card-row">
          <span class="actor-card-label">Maximum</span>
          <span class="actor-card-max">${formatVal(max)}</span>
        </div>
        <div class="actor-card-row actor-card-scale-row">
          <span class="actor-card-label">Population Scale</span>
          <span class="actor-card-pct" data-id="${id}">${pctInt}%</span>
        </div>
        <div class="actor-card-slider-wrap">
          <div class="actor-card-track" data-id="${id}">
            <div class="actor-card-fill" data-id="${id}" style="width: ${pct}%"></div>
          </div>
          <input type="range" data-id="${id}" min="${min}" max="${max}" step="${stepFor(min, max)}" value="${value}" class="actor-card-slider" aria-label="Population scale for ${label}" />
        </div>
      </div>
    `;
    const slider = card.querySelector('input[type="range"]');
    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      engine.setState({ ...engine.getState(), [id]: v });
      updateCardValue(id, v);
    });

    const img = card.querySelector('.actor-card-img');
    const placeholder = card.querySelector('.actor-card-placeholder');
    if (img && placeholder) {
      const base = `assets/card-images/${id}`;
      img.onload = () => {
        img.style.display = 'block';
        placeholder.style.display = 'none';
      };
      img.onerror = () => {
        img.src = `${base}.jpg`;
        img.onerror = () => {
          img.style.display = 'none';
          placeholder.style.display = 'flex';
        };
      };
      img.src = `${base}.png`;
    }

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

  const pctEl = el.componentCards.querySelector(`.actor-card-pct[data-id="${id}"]`);
  const fillEl = el.componentCards.querySelector(`.actor-card-fill[data-id="${id}"]`);
  const sliderEl = el.componentCards.querySelector(`input[data-id="${id}"]`);
  const pctInt = Math.round(pct);
  if (pctEl) pctEl.textContent = `${pctInt}%`;
  if (fillEl) fillEl.style.width = `${pct}%`;
  if (sliderEl) sliderEl.value = value;
}

const TICK_INTERVAL_MS = 220; // how often to advance simulation (ms) — higher = slower

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
    animationId = setTimeout(tickAndRender, TICK_INTERVAL_MS);
  }
}

function run() {
  if (!engine || running) return;
  running = true;
  el.btnRun.disabled = true;
  el.btnPause.disabled = false;
  tickAndRender();
}

function pause() {
  running = false;
  if (animationId) clearTimeout(animationId);
  el.btnRun.disabled = false;
  el.btnPause.disabled = true;
}

function reset() {
  if (!engine) return;
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

// Load live-impact-matrix when available and create engine with it (overwrites config impact); then initial render
(async () => {
  const loaded = await loadLiveImpactMatrix();
  engine = createEngine({
    timeStep: 0.06,
    customImpactMatrix: loaded.matrix || undefined,
    impactScale: loaded.globalImpactScale
  });
  engine.setState(INITIAL_VALUES);
  if (loaded.globalImpactScale != null) {
    const scaleEl = document.getElementById('global-impact-scale');
    const valueEl = document.getElementById('global-scale-value');
    if (scaleEl) scaleEl.value = loaded.globalImpactScale;
    if (valueEl) valueEl.textContent = String(loaded.globalImpactScale);
  }
  renderComponentCards();
  setupPathImpact();
  el.globalScaleValue.textContent = el.globalImpactScale.value;
})();
