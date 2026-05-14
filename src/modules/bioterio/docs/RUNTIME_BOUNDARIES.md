# Bioterio Operational Runtime Boundaries

This document defines the explicit boundaries, ownership rules, and orchestration limitations for the Bioterio Operational Runtime ecosystem. Its primary purpose is to prevent "God Runtime" syndrome, architecture explosion, and fake operational precision.

## Runtime Ownership & Boundaries

### 1. Event Runtime
- **Owns**: Immutable historical operational history.
- **Derives**: Nothing.
- **Consumes**: Raw user inputs / IoT verified data (future).
- **MUST NOT Mutate**: Past events (history is immutable). Corrections require compensating events.

### 2. Inventory Runtime
- **Owns**: Current discrete state of stock.
- **Derives**: Operational availability from the Event Runtime.
- **Consumes**: Event Runtime (additions, subdivisions, mortality).
- **MUST NOT Mutate**: Capability profiles or operational settings.

### 3. Operational Settings Runtime
- **Owns**: Operational behavior heuristics (growth, mortality, breeding models).
- **Derives**: Projection parameters.
- **Consumes**: Nothing. It is pure configuration.
- **MUST NOT Mutate**: Historical truth or live inventory counts.

### 4. Species Runtime
- **Owns**: Operational configuration metadata and capability modes.
- **Derives**: Available dashboard widgets based on capabilities.
- **Consumes**: Nothing.
- **MUST NOT Mutate**: Any other runtime.

## Operational Heuristic Guidelines
The platform models operational *heuristics*, NOT scientific biological truth. 
- **Estimation Bands**: Projections must never claim exact decimal precision (e.g., "143.2 Hopper available"). Use confidence bands (e.g., "120-150 Hopper").
- **Historical Immutability**: Changing settings, thresholds, or models MUST NOT rewrite historical operational states. It only alters future projections.

## Orchestration Rules
- **Recalculation Storm Prevention**: A single mortality event must not trigger redundant rebuilds. Projection recalculations must be batched and debounced.
- **Snapshot Ownership**: The Snapshot system caches projections. Runtimes must read from snapshots where possible rather than re-playing infinite events.

## AI Runtime Safety Constraints
AI must NEVER invent biological assumptions. It operates within a strict `AIOperationalContext`.
- AI may ONLY consume:
  - Approved Operational Settings
  - Thresholds
  - Projections (and their Confidence Bands)
  - Historical Events
- AI must explicitly communicate projection uncertainty (Low, Medium, High) and never present estimations as factual certainty.
