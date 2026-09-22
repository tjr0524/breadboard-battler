# Breadboard Battler — Game Design v0.1

## 1. One-line concept

A mobile roguelite auto battler where the player packs weapons and electronic components onto a limited breadboard and builds a working combat circuit before each battle.

## 2. Design goal

This is not intended to be an electronics education game.

Real electrical ideas are simplified into intuitive game rules. A beginner should be able to progress using recommended circuits, while players who understand the system can improve space efficiency, power delivery and combat output.

## 3. Core loop

1. Inspect the next enemy.
2. Reconfigure the breadboard.
3. Start an automatic battle.
4. Observe damage, power, heat, shields and healing.
5. Win credits / parts.
6. Shop for weapons, components, power parts or board expansion.
7. Rebuild and continue the run.

## 4. Breadboard as the central puzzle

The breadboard is a limited 2D space.

Early weapons may need little more than a direct power connection. Higher-tier weapons require more supporting circuitry and therefore consume more board area.

Recommended circuit layouts are templates, not shape requirements.

If two layouts have the same electrical connectivity, they should work the same even when physically rearranged.

This allows players to:
- fold a recommended circuit into a smaller area;
- share power lines;
- use parallel branches;
- reuse supporting components;
- reorganize old circuits to make space for higher-tier weapons.

## 5. Beginner accessibility

Each weapon/module can provide:
- a recommended circuit;
- one-tap auto placement when enough space exists;
- highlighted compatible connection points;
- warnings before unsafe operation;
- simple role-based descriptions before advanced electrical values.

Progression:
- beginner: use recommended layout;
- regular player: swap component values;
- experienced player: modify parts of the circuit;
- advanced player: build from scratch.

## 6. Electrical model

### Powered devices

A weapon or module has an operating voltage range and power/current requirement.

Possible behaviors:
- below operating voltage: reduced output or failure;
- normal range: rated performance;
- modest overdrive: increased output and heat;
- excessive voltage/current/temperature: damage or failure.

### Core generator

The player's core provides a limited continuous power output.

Core progression can increase this limit over time.

### Battery

A battery stores comparatively large amounts of energy and can support the system for a meaningful duration.

Gameplay role:
- bridge sustained power deficits;
- support longer fights;
- trade board space for stored energy.

### Capacitor

A capacitor is primarily a short-duration power buffer.

Suggested player-facing properties:
- capacitance / stored charge representation;
- maximum voltage;
- maximum discharge capability;
- current charge state.

Gameplay role:
- charge during low demand;
- provide large current for pulse weapons;
- absorb short power spikes;
- power burst shields or similar systems.

## 7. Combat

Combat is mostly automatic.

Enemy and player combat systems can remain visually stationary rather than using a traditional tower-defense map.

Player combat stats may include:
- core HP;
- shield;
- repair / regeneration;
- continuous damage;
- burst damage;
- power draw;
- temperature.

Enemy archetypes can create different build pressures, for example:
- high regeneration;
- heavy armor;
- rapidly recharging shield;
- burst attacker;
- sustained attacker;
- electronic interference.

## 8. Weapons / output devices

Higher-tier weapons should not merely have larger numbers; they should require more interesting support circuitry.

Possible progression:

### Tier 1 — simple gun
Direct power. Small footprint. Low complexity.

### Tier 2 — laser
Stable continuous power. High sustained damage and heat.

### Tier 3 — pulse cannon
Requires energy storage. Strong burst damage. Capacitor-oriented.

### Tier 4 — advanced electrical weapon
Requires switching/control and stronger power infrastructure.

### Tier 5 — railgun / equivalent
Large energy storage and very high instantaneous power.

Exact weapons and tier ordering remain open.

## 9. Support modules

Possible support systems:
- shield generator;
- repair module;
- cooling;
- sensor;
- switching/control component;
- battery;
- capacitor bank;
- auxiliary generator.

Attack, defense and recovery compete for board space and power.

## 10. Shop and run structure

After each battle, a shop presents a limited selection.

Possible categories:
- weapons;
- resistors / capacitors / switching parts;
- batteries and power components;
- shield / repair / cooling;
- board expansion;
- core/power upgrades.

Unwanted parts should be sellable.

Controlled randomness should reduce cases where a beginner receives a weapon but cannot obtain necessary support parts.

## 11. Rewards and growth

Winning provides credits and/or parts.

Strong builds should naturally accelerate progress because they clear faster, take less damage, and waste fewer parts.

Long-term unlocks should favor new possibilities rather than only permanent percentage bonuses:
- new weapon types;
- new electronic parts;
- larger board types;
- new core tiers;
- new enemy types.

## 12. Spatial progression

Board size is itself a progression axis.

Early:
- simple, spacious circuits.

Mid game:
- multiple circuits compete for space.

Late game:
- optimization, shared branches and compact layouts become valuable.

## 13. Key design principles

1. Weapons first. Electronics exists to make the weapons more interesting.
2. Easy baseline, deep optimization.
3. Topology matters more than template shape.
4. Space is a real resource.
5. Power is a real resource.
6. Better engineering should create gameplay advantage naturally.
7. Do not require transistor-level logic programming from ordinary players.
8. Simplify real physics whenever realism harms readability or fun.

## 14. Open questions

- exact board dimensions and connection rules;
- real breadboard look vs simplified grid;
- circuit solver fidelity;
- permanent meta-progression;
- battles per run;
- shop size and reroll rules;
- part inventory limit;
- exact weapon roster;
- heat/component damage depth;
- enemy presentation and visual theme;
- portrait vs landscape UI.

## 15. First prototype target

The first prototype only needs to answer whether the core interaction is fun.

Suggested minimum:
- one small board;
- one DC power source;
- wire/connectivity;
- resistor;
- capacitor;
- battery;
- simple gun;
- pulse weapon;
- one defensive/repair module;
- one stationary enemy;
- automatic combat;
- one shop screen.

Key test:

> Is rearranging a working circuit inside limited space satisfying enough that the player wants to improve it after seeing the battle result?
