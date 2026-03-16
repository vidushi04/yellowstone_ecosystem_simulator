/**
 * Ecosystem playground — standalone app
 * - No main simulation, only impact-only playground.
 * - Drag any card's slider to apply one impact step that updates all components.
 * - Optional dev impact matrix that affects only this playground.
 */

import {
  INITIAL_VALUES,
  COMPONENT_LABELS,
  COMPONENT_IDS,
  RANGES,
  BASE_IMPACT_MATRIX,
  PLAYGROUND_COMPONENT_SCALE
} from '../data/ecosystem-config-playground.js';
import { oneStepImpactOnly } from '../js/path-impact-playground.js';

const el = {
  cards: document.getElementById('playground-cards'),
  resetBtn: document.getElementById('playground-reset'),
  devToggle: document.getElementById('playground-dev-toggle'),
  devPanel: document.getElementById('playground-dev-panel'),
  impactGrid: document.getElementById('playground-impact-grid'),
  exportImpact: document.getElementById('playground-export-impact')
};

let playgroundState = { ...INITIAL_VALUES };
let impactMatrix = BASE_IMPACT_MATRIX.map(row => [...row]);

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

async function loadImpactMatrixPlayground() {
  // try {
  //   const res = await fetch('../data/impact-matrix-playground.json');
  //   if (res.ok) {
  //     const data = await res.json();
  //     if (Array.isArray(data.matrix) && data.matrix.length === COMPONENT_IDS.length) {
  //       impactMatrix = data.matrix.map(row => [...row]);
  //       return;
  //     }
  //   }
  // } catch (_) {
  //   // ignore, fall back to BASE_IMPACT_MATRIX
  // }
  impactMatrix = BASE_IMPACT_MATRIX.map(row => [...row]);
}

function renderCards() {
  if (!el.cards) return;
  el.cards.innerHTML = '';

  COMPONENT_IDS.forEach(id => {
    const value = playgroundState[id] ?? 0;
    const [min, max] = RANGES[id];
    const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
    const pctInt = Math.round(pct);
    const label = COMPONENT_LABELS[id];

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
          <input type="range" data-id="${id}" min="0" max="100" step="1"
                 value="${pctInt}" class="actor-card-slider"
                 aria-label="Playground population scale for ${label}" />
        </div>
      </div>
    `;

    const slider = card.querySelector('input[type="range"]');
    slider.addEventListener('input', () => {
      const currentVal = playgroundState[id] ?? 0;
      const [min, max] = RANGES[id];
      const newPct = Math.max(0, Math.min(100, parseFloat(slider.value) || 0));
      const newVal = min + (newPct / 100) * (max - min);
      const delta = newVal - currentVal;
      if (!delta) return;

      const { nextState } = oneStepImpactOnly(
        playgroundState,
        id,          // sourceId
        delta,
        COMPONENT_IDS,
        impactMatrix,
        RANGES,
        { scale: 1.0, perComponentScale: PLAYGROUND_COMPONENT_SCALE }
      );
      playgroundState = nextState;
      updateCardsFromState();
    });

    const img = card.querySelector('.actor-card-img');
    const placeholder = card.querySelector('.actor-card-placeholder');
    if (img && placeholder) {
      const base = `../assets/card-images/${id}`;
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

    el.cards.appendChild(card);
  });
}

function updateCardsFromState() {
  if (!el.cards) return;
  COMPONENT_IDS.forEach(id => {
    const value = playgroundState[id] ?? 0;
    const [min, max] = RANGES[id];
    const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
    const pctInt = Math.round(pct);

    const pctEl = el.cards.querySelector(`.actor-card-pct[data-id="${id}"]`);
    const fillEl = el.cards.querySelector(`.actor-card-fill[data-id="${id}"]`);
    const sliderEl = el.cards.querySelector(`input.actor-card-slider[data-id="${id}"]`);

    if (pctEl) pctEl.textContent = `${pctInt}%`;
    if (fillEl) fillEl.style.width = `${pct}%`;
    if (sliderEl) sliderEl.value = pctInt;
  });
}

function renderImpactGrid() {
  if (!el.impactGrid) return;
  const n = COMPONENT_IDS.length;
  el.impactGrid.innerHTML = '';

  const headerRow = document.createElement('div');
  headerRow.className = 'impact-row';
  const corner = document.createElement('div');
  corner.className = 'impact-cell header';
  headerRow.appendChild(corner);
  COMPONENT_IDS.forEach(id => {
    const c = document.createElement('div');
    c.className = 'impact-cell header';
    c.textContent = id.slice(0, 3);
    c.title = COMPONENT_LABELS[id];
    headerRow.appendChild(c);
  });
  el.impactGrid.appendChild(headerRow);

  for (let i = 0; i < n; i++) {
    const row = document.createElement('div');
    row.className = 'impact-row';
    const srcLabel = document.createElement('div');
    srcLabel.className = 'impact-cell header';
    srcLabel.textContent = COMPONENT_IDS[i].slice(0, 3);
    srcLabel.title = COMPONENT_LABELS[COMPONENT_IDS[i]];
    row.appendChild(srcLabel);
    for (let j = 0; j < n; j++) {
      const cell = document.createElement('div');
      cell.className = 'impact-cell' + (impactMatrix[i][j] === 0 ? ' zero' : '');
      const input = document.createElement('input');
      input.type = 'number';
      input.step = 0.01;
      input.value = impactMatrix[i][j];
      input.title = `${COMPONENT_LABELS[COMPONENT_IDS[i]]} → ${COMPONENT_LABELS[COMPONENT_IDS[j]]}`;
      input.addEventListener('change', () => {
        const v = parseFloat(input.value) || 0;
        impactMatrix[i][j] = v;
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

if (el.devToggle && el.devPanel) {
  el.devToggle.addEventListener('change', () => {
    const show = el.devToggle.checked;
    el.devPanel.classList.toggle('hidden', !show);
    if (show) renderImpactGrid();
  });
}

if (el.exportImpact) {
  el.exportImpact.addEventListener('click', () => {
    const data = {
      description: 'Playground impact matrix (rows = sources, columns = targets).',
      componentIds: COMPONENT_IDS,
      matrix: impactMatrix
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'impact-matrix-playground.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

if (el.resetBtn) {
  el.resetBtn.addEventListener('click', () => {
    playgroundState = { ...INITIAL_VALUES };
    renderCards();
    updateCardsFromState();
  });
}

(async () => {
  await loadImpactMatrixPlayground();
  renderCards();
  updateCardsFromState();
})();

