# Breadboard Battler — Circuit Engine v0.1

## Goal

The circuit engine should make wiring outcomes behave like a simplified real electrical circuit rather than a rule-based connectivity checker.

Design rule:

> Real circuit laws for the network, simplified game models inside devices.

The engine is intentionally smaller than SPICE but uses nodal circuit solving and transient energy storage.

## Solver

The engine solves node voltages using nodal analysis.

Supported network elements in v0.1:

- resistor;
- resistive game load;
- continuous source / CORE;
- battery with internal resistance and state of charge;
- capacitor with transient charge/discharge;
- diode with piecewise forward conduction;
- open/closed switch;
- current-limited power source.

Ideal breadboard holes and jumper wires should be merged into common electrical nodes by the board adapter before solving.

## CORE

CORE is modeled as a Thevenin-style source:

- nominal voltage;
- finite internal resistance;
- maximum source current;
- optional sink behavior.

When requested current exceeds the current limit, the source changes from constant-voltage mode to current-limit mode.

Example prototype CORE:

- 12 V;
- 0.02–0.03 ohm internal resistance;
- 2.5 A continuous current limit.

This means excessive parallel load naturally causes bus voltage droop.

## Loads

Weapons and support modules can use a simplified equivalent resistance derived from rated voltage and rated current.

Example machine gun:

- 12 V rated voltage;
- 1.5 A rated current;
- equivalent resistance ≈ 8 ohm.

Two identical guns in series therefore naturally divide a 12 V source to roughly 6 V each.

Two identical guns in parallel request roughly 3 A at 12 V. If CORE is limited to 2.5 A, bus voltage drops until the circuit current matches the source limit.

## Capacitors

Capacitors are transient elements.

The engine uses a backward-Euler companion model:

- capacitance;
- previous capacitor voltage;
- current timestep;
- leakage resistance;
- maximum voltage.

A capacitor connected across a bus is not owned by one weapon.

It supports the entire electrical node it is attached to.

Therefore:

- a pulse weapon can discharge it;
- a machine gun on the same bus can also benefit from it;
- other loads can also drain it;
- a large pulse can temporarily pull the shared bus voltage down.

Dedicated pulse energy storage requires electrical isolation or a separate branch.

## Batteries

Battery model:

- open-circuit voltage;
- internal resistance;
- maximum discharge current;
- maximum charge current;
- stored energy / state of charge.

Unlike CORE, a battery consumes board space and stores finite energy.

The battery can charge or discharge depending on terminal voltage and network state.

## Diodes and branch isolation

A diode is modeled with:

- forward voltage;
- low forward resistance;
- high reverse resistance.

This allows a pulse branch to charge from the main bus while reducing reverse discharge into unrelated branches.

This is useful for player-designed power domains.

## Pulse weapons

The engine supports pulse loads separately from ordinary continuous loads.

A pulse load can switch between:

- idle/off;
- active high-current pulse.

During the pulse, the solver calculates the contribution from:

- CORE;
- battery;
- capacitor;
- other connected energy storage.

There is no special rule saying a particular capacitor belongs to a particular pulse gun.

Electrical topology determines which storage devices can actually support the pulse.

## Current v0.1 sanity checks

Prototype numerical checks:

### Single machine gun

12 V CORE, 8 ohm equivalent gun:

- gun voltage ≈ 11.97 V;
- gun current ≈ 1.50 A.

### Two identical guns in series

- gun 1 ≈ 5.99 V;
- gun 2 ≈ 5.99 V;
- both classify as undervoltage for a 7 V minimum.

### Two identical guns in parallel

Combined load exceeds the 2.5 A CORE limit:

- CORE enters current-limit mode;
- bus ≈ 10.0 V;
- total load current ≈ 2.5 A.

### Shared capacitor + pulse

A charged 0.5 F capacitor on the same bus as a continuous gun and pulse gun:

- CORE remains limited to 2.5 A during the pulse;
- capacitor supplies additional instantaneous current;
- test pulse produced roughly 6.4 A capacitor discharge into the shared bus.

This confirms that shared storage influences all loads on the same bus.

## Game integration plan

The breadboard adapter should:

1. merge each internal five-hole strip into one electrical node;
2. merge jumper-connected nodes;
3. map each component terminal to the resulting node;
4. construct the circuit model;
5. solve node voltages and branch currents;
6. translate electrical results into game states.

Suggested component status UI:

- ON;
- LOW 6.0V;
- OVER 13.5V;
- REV;
- CHG 10.8V;
- DISCHARGE 4.2A;
- CURRENT LIMIT;
- SHORT.

Raw electrical values should be available in an inspect view while the default board view keeps only compact status badges.

## Next solver extensions

Likely next additions:

- constant-power or controlled-load device models;
- temperature and heat generation;
- component damage and fuse behavior;
- MOSFET / controlled switch abstraction;
- per-pulse firing schedule;
- regenerative loads if needed;
- persistent capacitor/battery state through combat ticks.
