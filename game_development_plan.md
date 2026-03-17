# Yellowstone Ecosystem Simulator: Game Development Plan

## 1. Game Overview
Yellowstone Balance is an interactive, educational simulation game designed for kids (~10 years old). It teaches players about ecosystem interconnectedness, inspired by the real-world reintroduction of wolves in Yellowstone National Park. Players change the population of one element and witness the cascading, rippling effects on the rest of the environment.

## 2. Core Gameplay Loop & Mechanics
- **Initial State:** The ecosystem begins with a fixed baseline of all actors (Predators, Small Animals, Flora, Environment, Humans/Economics).
- **Player Interaction:** Players use visual sliders (featuring actor icons) to manually adjust the population or level of a specific actor.
- **Ecosystem Ripple Effect:** When an actor's population is changed (e.g., adding Wolves), the game instantly calculates the impact on other connected components (e.g., fewer Elk, more Willow/Grass). 
- **Feedback:** Visual alerts and dynamic UI components immediately reflect the "new state" of the ecosystem, showing whether the system is balanced or in danger (e.g., land fertility dropping to zero).

## 3. Mathematical System (`oneStepImpactOnly` Logic)
The core simulation engine for this new game will operate strictly on an "impact-step" model, utilizing the previously developed `oneStepImpactOnly` logic:
- **Percentage-Based Ripple:** Instead of calculating complex birth/death rates over elapsed time, the system will instantly process the *percentage change* a player makes to an actor's population.
- **Matrix-Driven Impacts:** The ripple propagates using an `impactMatrix` (Source → Target impacts). For example, if Wolves are increased, it exerts a negative multiplier effect on the Elk population. 
- **Wavefront Propagation:** The algorithm processes the ripple in "generations" (up to 10 degrees of trophic separation). The delta (change) is scaled and passed to connected actors, which in turn pass their newly calculated changes to the next level of actors in the ecosystem loop.
- **Clamping:** All calculated values are mathematically constrained (clamped) within their defined ecological minimum and maximum limits.

## 4. Game Modes
- **Mode 1: Ecosystem Missions (Guided Play)**
  - Players act as the "Park Ranger" solving specific puzzle scenarios.
  - *Example:* "The Barren Land" – The park has too many Elk and no trees. Players must introduce Wolves to thin out the Elk, which allows the Cottonwood trees to recover.
  - *Example:* "Bring Back the Fish" – Boost Beavers to build dams and clean the rivers for fish.
- **Mode 2: Sandbox Mode (Free Play)**
  - Players have complete freedom to adjust the sliders to their furthest limits to observe extreme trophic cascades.
  - Alerts are triggered when the ecosystem becomes completely unbalanced.

## 5. UI/UX Design Strategy
- **Visual Engagement:** Use large, readable sliders with clear animal and nature imagery rather than abstract numbers. Let children connect with the visuals.
- **Real-Time Responsiveness:** The UI must update instantly via `oneStepImpactOnly` upon slider drag—without requiring "Next Turn" buttons or fast-forwarding. Instant feedback helps children internalize cause and effect.
- **Dynamic Feedback:** Provide immediate visual cues (e.g., color changes or happy/sad indicator icons) based on the overall health of the components.

## 6. Development Milestones
* **Phase 1: Engine & Data Structures**
  - Extract and adapt `oneStepImpactOnly` into the core game engine.
  - Define the `impactMatrix`, `RANGES`, and initial states for all game actors.
* **Phase 2: UI & Interaction Layer**
  - Build the interactive sliders and actor visual cards.
  - Wire UI events to trigger the `oneStepImpactOnly` calculations and state re-renders.
* **Phase 3: Game Modes Implementation**
  - Implement Mission objective logic (scenario validation to check if goals are met).
  - Add Sandbox event listeners for extreme unbalance alerts. 
* **Phase 4: Polish & Balance**
  - Add micro-animations, sounds, and finalized assets to make it engaging for kids.
  - Playtest and tweak the `impactMatrix` to ensure realistic, understandable ecosystem cascade behaviors.
