# Yellowstone Ecosystem — Wolf Reintroduction Simulator

An interactive, gamified system that models the Yellowstone National Park ecosystem and the impact of wolf reintroduction. Each component (wolves, elk, vegetation, river, beavers, etc.) influences others via a configurable impact matrix. The simulation uses birth/death probabilities and predator–prey hunt success so the system can reach equilibrium instead of maxing out.

## How to run

ES modules are used, so open the app via a local HTTP server (not `file://`).

```bash
# From project root
npx serve .
# or
python3 -m http.server 8000
```

Then open `http://localhost:3000` (or `http://localhost:8000`) in your browser.

## Features

- **Run / Pause / Reset** — Start the simulation, pause it, or reset to initial values.
- **Adjust any component** — Use sliders to set wolves, elk, grass, river quality, etc. The rest of the ecosystem responds over time.
- **Non-zero clipping** — Every component is clamped to a min–max range so values stay realistic and never go to zero (except e.g. cattle, which can be 0).
- **Equilibrium** — Birth and death rates plus carrying capacity prevent all components from maxing out; the system can stabilize.
- **Predator–prey** — When a predator (e.g. wolves) impacts prey (e.g. elk), the effect is applied only with a **hunt success probability** (configurable in `data/ecosystem-config.js`).
- **Developer panel** — Enable “Dev: impact factors” to:
  - Change the **global impact scale** (stronger/weaker coupling).
  - Edit individual **impact factors** (how much each row component affects each column component).
  - **Export live impact matrix** — download the current impact numbers as JSON.

## Live impact numbers (stored)

The **live** impact numbers are the 17×17 matrix (and global scale) the simulation actually uses. They are:

1. **Stored in the repo:** `data/live-impact-matrix.json` — component IDs, `matrix` (rows × columns), and `globalImpactScale`. The app loads this file on startup so the stored values are the default live values.
2. **Browser storage:** Editing a factor in the dev panel (or the global scale) saves the full matrix to `localStorage` so your edits persist across refreshes.
3. **Export:** Use “Export live impact matrix” in the dev panel to download the current live numbers as JSON. Save the file as `data/live-impact-matrix.json` to commit them to the repo.

## Config (developers)

- **Impact matrix, ranges, birth/death, hunt probabilities:** `data/ecosystem-config.js`
- **Initial values:** `INITIAL_VALUES` in the same file (tuned so the system can reach equilibrium).
- **Simulation step and scaling:** `createEngine({ timeStep, impactScale })` in `js/ecosystem-engine.js`.

## Data source

The impact matrix is derived from `Yellowstone Ecosystem System - Sheet1.csv`: row = source component, column = target component; positive = source helps target, negative = source hurts target (e.g. wolves → elk is negative).
