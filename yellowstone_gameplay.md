# Yellowstone Balance: The Ecosystem Simulator

## Game Overview
Yellowstone Balance is an interactive, educational simulation game built in JavaScript. Designed for kids around age 10, the game teaches players how different components of an ecosystem are interconnected. The core inspiration is the real-world reintroduction of wolves in Yellowstone National Park and how it rebalanced the ecosystem. By changing the population of one element, players will witness the cascading effects on the rest of the environment.

## The Actors
The game features multiple actors divided into living and non-living/human categories. 

| Category | Actors |
| :--- | :--- |
| **Predators & Large Mammals** | Wolves, Bears, Elk, Cattle |
| **Small Animals & Aquatic Life** | Birds, Fish, Beaver, Other small animals |
| **Flora (Plants)** | Grass, Cottonwood trees, Berry trees |
| **Environment & Infrastructure** | River quality, Dams, Land fertility |
| **Humans & Economics** | Rangers/Ranchers, Visitors, Park revenue |

## Core Gameplay Mechanics
* The game starts with a fixed baseline number for all actors in the ecosystem.
* The primary UI allows the player to interactively change the percentage or amount of a single actor.
* When a player adjusts an actor, the game calculates the cascading impact based on a predefined impact matrix.
* The player instantly sees how changing one actor impacts the ecosystem in general.

## Educational Impact Examples (Based on Matrix)
To make the matrix understandable and fun for kids, the game will visually highlight these key relationships:
* **The Wolf Effect:** Increasing Wolves thins out the Elk population (-0.5 impact).
* **The Green Recovery:** Having less Elk allows Grass and Trees to grow back!
* **The Builders:** More Cottonwood feeds Beavers, allowing them to stabilize rivers. 
* **Dam Construction:** Beavers directly build Dams (0.6 impact).
* **Aquatic Boom:** Dams dramatically improve river quality and fish populations.
* **Healthy Waters:** Clean rivers lead to booming fish and bird populations.
* **The Berry Buffet:** Berry trees provide food for both bears and birds.
* **Soil Health:** Good land fertility helps plants grow a bit more.
* **The Foundation:** Grass improves soil and feeds other animals.

## Game Modes

### Mode 1: Ecosystem Missions (Guided Play)
Players are given specific scenarios to solve, acting as the "Park Ranger."

Missions unlock in order. Each mission teaches a specific “cause → effect” story in the Yellowstone system.

#### Mission 1: The Barren Land (Unlocked by default)
- **Educational focus**: Predators indirectly help plants (trophic cascade).
- **Story**: The park has too many Elk, and the land is getting barren.
- **Starting conditions**:
  - Wolves start very low
  - Elk start very high
  - **Grass starts at 20%**
- **Goal (win condition)**: **Bring Grass back to 60%**.

#### Mission 2: Bring Back the Fish (Unlocked after Mission 1)
- **Educational focus**: Plants → Beavers → Dams → river health → fish.
- **Story**: The river is dirty and fish are struggling.
- **Starting conditions**:
  - **Beaver starts at 10%**
  - Cottonwood starts low (trees need to be replanted)
  - Dam, River Quality, and Fish start very low
- **Goals (win conditions)**:
  - **Fish ≥ 40%**
  - **Dam ≥ 50%**
  - **Beaver must increase**
  - **Cottonwood must increase**

#### Mission 3: Birdsong Returns (Unlocked after Mission 2)
- **Educational focus**: Clean rivers + healthy plants support birds.
- **Story**: Quiet skies—bird numbers are low.
- **Starting conditions**:
  - Birds start low
  - River Quality starts low-to-medium
  - Berry Trees start low
- **Goals (win conditions)**:
  - **Birds ≥ 55%**
  - **River Quality ≥ 55%**
  - **Berry Trees ≥ 45%**

#### Mission 4: Healthy Soil, Healthy Park (Unlocked after Mission 3)
- **Educational focus**: Land fertility boosts plant recovery and stabilizes the ecosystem.
- **Story**: The ground is worn out and plants can’t bounce back.
- **Starting conditions**:
  - Land Fertility starts low
  - Grass starts low-to-medium
  - Cottonwood starts low-to-medium
- **Goals (win conditions)**:
  - **Land Fertility ≥ 60%**
  - **Grass ≥ 60%**
  - **Cottonwood ≥ 50%**

#### Mission 5: Ranching vs. Rewilding (Unlocked after Mission 4) — Human Impact
- **Educational focus**: Ranching and human conflict can reduce wolf populations.
- **Story**: As ranching and human activity rise, wolves are getting killed.
- **Starting conditions**:
  - Wolves start at 15%
  - Rangers/Ranchers start high (high human pressure/conflict)
- **Goals (win conditions)**:
  - **Wolves ≥ 30%**
  - **Rangers/Ranchers ≤ 50%** (reduced human conflict / better stewardship)

#### Mission 6: Tourism Boom, Park Balance (Unlocked after Mission 5) — Human Impact
- **Educational focus**: People affect nature *and* money (Visitors ↔ Park Revenue ↔ ecosystem health).
- **Story**: Visitor numbers are soaring, but the ecosystem is being stressed.
- **Starting conditions**:
  - Visitors start high
  - River Quality starts medium
  - Park Revenue starts medium-to-high
  - Rangers/Ranchers start low-to-medium
- **Goals (win conditions)**:
  - **Park Revenue ≥ 60%** (park stays funded)
  - **River Quality ≥ 55%** (nature stays healthy)
  - **Rangers/Ranchers ≥ 55%** (good stewardship)
  - **Visitors ≤ 70%** (managed tourism)

### Mode 2: Sandbox Mode (Free Play)
Players have complete control over the sliders for all actors. 
* They can push the ecosystem to extreme limits (e.g., removing all Wolves or adding too many Cattle).
* Visual alerts pop up when an ecosystem is "Unbalanced" (e.g., Park Revenue drops, or Land Fertility hits zero).

## UI / UX Design for 10-Year-Olds
- **Big, friendly cards**: Each actor has a card with a clear title, a big image, and a simple slider.
- **Immediate feedback**: Slider changes instantly ripple through the ecosystem so kids can experiment and learn.
- **Bigger actor images (game mode)**: The actor images on the game cards are intentionally large for readability.
- **Mission completion celebration**: When a mission is completed, the game shows a **🎉 party popper + confetti** and plays a short **victory jingle**.
- **Simple language**: Mission goals use kid-friendly wording (e.g., “Bring Grass back to 60%”).