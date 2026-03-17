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
* **Mission 1: The Barren Land.** The park has too many Elk and no trees. *Goal: Introduce Wolves to restore the Cottonwood trees.*
* **Mission 2: Bring Back the Fish.** The river quality is terrible. *Goal: Boost the Beaver population to build dams and clean the rivers.*

### Mode 2: Sandbox Mode (Free Play)
Players have complete control over the sliders for all actors. 
* They can push the ecosystem to extreme limits (e.g., removing all Wolves or adding too many Cattle).
* Visual alerts pop up when an ecosystem is "Unbalanced" (e.g., Park Revenue drops, or Land Fertility hits zero).

## UI / UX Design for 10-Year-Olds
* **Visual Sliders:** Instead of boring numbers, use sliders with icons (e.g., a slider with a Wolf head).
* **