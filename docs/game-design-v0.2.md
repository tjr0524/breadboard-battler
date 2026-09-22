# Breadboard Battler — Game Design v0.2

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

### Core generator

The CORE is the vehicle's built-in generator/power supply.

- It exists outside the breadboard and does not consume board space.
- It supplies the default system voltage and continuous current limit.
- Example prototype value: 12 V / 2.5 A.
- CORE progression increases baseline supply capability.
- CORE HP may also represent the player's combat HP.

### Power rails

The breadboard should use real-breadboard-inspired vertical power rails rather than hiding power in ordinary rows.

Preferred layout:
- vertical + rail;
- vertical GND rail;
- optionally mirrored rails on both left and right sides;
- the central main breadboard remains dedicated to circuit construction.

The left-side rails can be powered by CORE by default.

The right-side rails may remain electrically isolated until the player bridges them with jumper wires. This creates a small but readable wiring puzzle and can later support board-tier differences.

Possible higher-tier board differences:
- continuous rails;
- rails split in the middle;
- extra rail pairs;
- larger board dimensions.

### Powered devices

Weapons and active support modules have explicit + and − terminals.

There should be no hidden "the other side is automatically ground" rule.

A device has:
- operating voltage range;
- required current/power;
- polarity where appropriate.

Possible behaviors:
- below operating voltage: reduced output or no operation;
- normal range: rated performance;
- modest overdrive: increased output and heat;
- excessive voltage/current/temperature: damage or failure.

### Battery

A battery is not the same thing as CORE.

CORE = continuous generation.
Battery = optional stored energy placed on the board.

Battery gameplay role:
- consume board space;
- buffer short or medium power deficits;
- provide additional discharge current;
- eventually track stored energy/capacity and state of charge;
- have explicit + and − terminals.

### Capacitor

A capacitor is primarily a short-duration power buffer.

Suggested player-facing properties:
- capacitance / stored energy representation;
- maximum voltage;
- maximum discharge capability;
- charge state.

Gameplay role:
- charge during low demand;
- provide high current for pulse weapons;
- absorb short power spikes;
- support burst shields.

Capacitors also use explicit + and − terminals when polarity matters.

## 7. Breadboard connectivity

The central breadboard should preserve the familiar breadboard topology:

- each horizontal five-hole group is internally connected;
- left and right groups are separated by the central trench;
- jumper wires connect otherwise separate nodes;
- electrically equivalent connectivity should behave equivalently regardless of visual shape.

Jumper wires are allowed to run diagonally.

Reason:
- the primary puzzle is circuit topology and spatial packing;
- forcing orthogonal routing would introduce a second routing puzzle;
- diagonal direct lines make endpoints easier to read.

Jumper wires should:
- clearly show both endpoints;
- be selectable;
- be draggable as a whole;
- allow each endpoint to be moved independently;
- be deletable.

## 8. Board camera / viewport

The breadboard should eventually be treated as a world larger than the visible screen, similar to a map viewport.

This is technically feasible and is likely necessary as board size grows.

Recommended mobile gesture model:

- drag empty board space → pan camera;
- drag a component → move component;
- drag a jumper endpoint → move that endpoint;
- drag a jumper body → move the whole jumper;
- two-finger pinch → zoom;
- optional double tap → recenter / fit board.

The UI outside the board remains fixed:
- battle status;
- shop/build controls;
- part tray;
- selected-object controls.

Camera behavior:
- smooth panning;
- bounded movement so the board cannot be lost off-screen;
- zoom range kept fairly conservative so holes remain tappable;
- optional "fit board" button;
- selected part remains selected while camera moves;
- drop previews and wiring overlays transform with the board world.

The camera system should be implemented before large board expansion so later content does not require rewriting the interaction model.

## 9. Board editing UX

Part tray behavior:
- tray opens/closes with a dedicated button;
- swiping the card/description area scrolls through parts;
- dragging the part icon starts installation;
- while dragging over the board, show the exact footprint that would be occupied;
- tray naturally collapses while dragging to expose more board area.

When the tray is closed:
- all placed parts can be dragged to new positions;
- jumper wires can be repositioned;
- the most recently moved/selected object remains selected.

Selected part controls should appear near the selected object:
- rotate;
- delete;
- later: inspect / details.

This avoids requiring a separate global rotate/delete mode.

## 10. Combat

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

Enemy archetypes can create different build pressures:
- high regeneration;
- heavy armor;
- rapidly recharging shield;
- burst attacker;
- sustained attacker;
- electronic interference.

## 11. Weapons / output devices

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

## 12. Support modules

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

## 13. Shop and run structure

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

## 14. Rewards and growth

Winning provides credits and/or parts.

Strong builds should naturally accelerate progress because they clear faster, take less damage, and waste fewer parts.

Long-term unlocks should favor new possibilities rather than only permanent percentage bonuses:
- new weapon types;
- new electronic parts;
- larger board types;
- new core tiers;
- new enemy types.

## 15. Spatial progression

Board size is itself a progression axis.

Early:
- simple, spacious circuits.

Mid game:
- multiple circuits compete for space.

Late game:
- optimization, shared branches and compact layouts become valuable.

Because board size can expand beyond one phone screen, camera panning/zoom is part of spatial progression rather than merely a convenience feature.

## 16. Key design principles

1. Weapons first. Electronics exists to make the weapons more interesting.
2. Easy baseline, deep optimization.
3. Topology matters more than template shape.
4. Space is a real resource.
5. Power is a real resource.
6. Better engineering should create gameplay advantage naturally.
7. Do not require transistor-level logic programming from ordinary players.
8. Simplify real physics whenever realism harms readability or fun.
9. Avoid hidden electrical assumptions: visible terminals and visible connectivity are preferred.
10. The board UI must remain editable and readable on mobile even as the board grows.

## 17. Open questions

- exact initial board dimensions;
- whether both left and right rails are present from the first board tier;
- whether power rails are continuous or split;
- exact camera zoom limits;
- circuit solver fidelity;
- permanent meta-progression;
- battles per run;
- shop size and reroll rules;
- part inventory limit;
- exact weapon roster;
- heat/component damage depth;
- enemy presentation and visual theme;
- portrait vs landscape UI.

## 18. Current prototype focus

The prototype should validate the build interaction before deeper combat simulation.

Current priorities:
1. mobile part tray;
2. drag-and-drop placement with footprint preview;
3. moving/rotating/deleting existing parts;
4. readable/editable jumper wires;
5. real breadboard five-hole connectivity;
6. explicit + / GND rails;
7. board camera pan/zoom;
8. simple automatic combat.

Key test:

> Is rearranging a working circuit inside limited space satisfying enough that the player wants to improve it after seeing the battle result?
