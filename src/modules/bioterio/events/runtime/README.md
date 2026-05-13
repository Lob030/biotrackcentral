# Bioterio Operational Event Runtime

## Overview

The Operational Event Runtime is the **immutable historical foundation** of the Bioterio system. Every operational action generates an event that becomes part of the permanent audit trail.

## Core Principles

### 1. Events Are IMMUTABLE

Once an event is created, it **cannot be modified**. This ensures:
- Complete audit trail integrity
- Regulatory compliance readiness
- Trust in historical data
- Ability to replay operational history

### 2. Corrections Create New Events

When data needs correction:
- **DO NOT** modify the original event
- **DO** create a `data_correction` event that references the original
- The correction event contains the corrected data and reason

```typescript
// WRONG: Never do this
event.metadata.quantity = 5; // ❌ Mutating historical data

// RIGHT: Create a correction event
createCorrectionEvent({
  originalEventId: 'event_123',
  reason: 'Incorrect count recorded',
  correctedData: { quantity: 5 },
  actor: userActor,
}); // ✅ Creates new immutable record
```

### 3. Reversals Undo Actions

When an action needs to be undone:
- **DO NOT** delete the original event
- **DO** create an `event_reversal` event
- The reversal documents what was undone and why

### 4. State Is Derived From Events

Current operational state (occupancy, lot status, etc.) should be **computed from event history**, not stored independently. This ensures:
- Single source of truth
- Consistency across the system
- Ability to reconstruct state at any point in time

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Event Store (Immutable)                   │
├─────────────────────────────────────────────────────────────┤
│  OperationalEvent                                            │
│  ├─ id: string                                              │
│  ├─ eventType: EventType                                    │
│  ├─ category: EventCategory                                 │
│  ├─ timestamp: Date                                         │
│  ├─ actor: EventActor                                       │
│  ├─ lotIds: string[]                                        │
│  ├─ cageIds: string[]                                       │
│  ├─ metadata: EventMetadata                                 │
│  ├─ severity: EventSeverity                                 │
│  ├─ references: EventReference[]                            │
│  └─ isImmutable: true                                       │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Lot Events   │   │ Cage Events   │   │  System       │
│  - created    │   │ - movement    │   │  Events       │
│  - subdivided │   │ - occupancy   │   │  - alerts     │
│  - mortality  │   │ - cleaning    │   │  - corrections│
│  - sold       │   │ - maintenance │   │  - AI actions │
└───────────────┘   └───────────────┘   └───────────────┘
```

## Event Categories

| Category | Description | Example Events |
|----------|-------------|----------------|
| `lot` | Lot lifecycle events | `lot_created`, `lot_sold`, `lot_deceased` |
| `subdivision` | Subdivision workflows | `lot_subdivided`, `subdivision_child_created` |
| `cage_movement` | Cage transfers | `lot_assigned_to_cage`, `lot_moved_between_cages` |
| `occupancy` | Occupancy changes | `cage_occupied`, `capacity_exceeded` |
| `mortality` | Animal deaths | `mortality_recorded`, `mortality_threshold_exceeded` |
| `breeding` | Breeding operations | `breeding_pair_formed`, `litter_born` |
| `transfer` | External transfers | `lot_transferred_in`, `lot_sold_external` |
| `environmental` | Environmental monitoring | `environmental_alert`, `environmental_reading` |
| `maintenance` | Facility maintenance | `cage_cleaning_completed`, `equipment_maintenance` |
| `quarantine` | Quarantine protocols | `quarantine_initiated`, `quarantine_released` |
| `correction` | Data corrections | `data_correction`, `event_reversal` |

## Usage Examples

### Creating an Event

```typescript
import { createOperationalEvent } from './operations';

const event = createOperationalEvent({
  eventType: 'lot_assigned_to_cage',
  lotIds: ['lot_abc123'],
  cageIds: ['cage_r1_c01'],
  actor: {
    type: 'user',
    id: 'user_123',
    name: 'Dr. Maria Garcia',
    role: 'Bioterio Manager',
  },
  metadata: {
    lotCode: 'ASF-001',
    cageCode: 'R1-C01',
    quantity: 10,
  },
});
```

### Querying Lot History

```typescript
import { getLotEvents } from './operations';

// Get all events for a lot
const allEvents = getLotEvents('lot_abc123');

// Get only mortality events
const mortalityEvents = getLotEvents('lot_abc123', {
  eventType: ['mortality_recorded'],
});

// Get events from last week
const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const recentEvents = getLotEvents('lot_abc123', {
  startTime: oneWeekAgo,
  sortOrder: 'desc',
});
```

### Creating a Correction

```typescript
import { createCorrectionEvent } from './operations';

const correction = createCorrectionEvent({
  originalEventId: 'event_wrong_mortality',
  reason: 'Incorrect mortality count was recorded',
  correctedData: {
    quantity: 1, // Correct count
  },
  actor: {
    type: 'user',
    id: 'user_123',
    name: 'Dr. Maria Garcia',
  },
  relatedLotIds: ['lot_abc123'],
});
```

### Getting Activity Summary

```typescript
import { getActivitySummary } from './operations';

const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const summary = getActivitySummary(oneMonthAgo, new Date());

console.log(`Total events: ${summary.totalEvents}`);
console.log(`Alerts: ${summary.alertsCount}`);
console.log(`Affected lots: ${summary.affectedLots}`);
```

## Why Event-Driven?

### 1. Complete Historical Traceability

Every action is recorded with:
- Who performed it (actor)
- When it happened (timestamp)
- What entities were affected (lotIds, cageIds)
- Additional context (metadata)
- Relationships to other events (references)

### 2. Audit Compliance

Regulatory requirements demand:
- Immutable records ✅
- Complete audit trail ✅
- User attribution ✅
- Temporal accuracy ✅
- Correction tracking ✅

### 3. Analytics Foundation

Event streams naturally support:
- Trend analysis (mortality rates over time)
- Operational efficiency (movement patterns)
- Capacity planning (occupancy trends)
- Anomaly detection (unusual patterns)
- Predictive modeling (breeding outcomes)

### 4. AI Integration

AI systems consume events to:
- Learn operational patterns
- Make optimization recommendations
- Detect anomalies automatically
- Predict future states
- Generate insights

### 5. State Reconstruction

From events alone, you can:
- Reconstruct current state
- Replay historical states
- Debug operational issues
- Verify data integrity

## Movement Traceability

Movement history works through **immutable event chains**:

```
Event 1: lot_assigned_to_cage
  lot: ASF-001 → cage: R1-C01
  timestamp: 2025-01-01 10:00
  
Event 2: lot_moved_between_cages
  lot: ASF-001
  from: R1-C01 → to: R1-C05
  timestamp: 2025-01-05 14:30
  
Event 3: lot_moved_between_cages
  lot: ASF-001
  from: R1-C05 → to: R2-C10
  timestamp: 2025-01-10 09:15
```

To find where a lot has been:
1. Query all `cage_movement` events for the lot
2. Sort by timestamp
3. Read the chain of movements

To find current location:
1. Get the most recent movement event
2. Use the `toCageId` from that event

## Lot/Cage Relationships

The relationship between lots and cages operates through events:

```
┌──────────────┐                    ┌──────────────┐
│     LOT      │                    │     CAGE     │
│              │                    │              │
│ id: lot_123  │◄────events────►│ id: cage_456 │
│ code: ASF-001│   reference      │ code: R1-C01 │
└──────────────┘   both IDs       └──────────────┘
```

Events contain **both** lotIds and cageIds, creating the relationship:
- No foreign keys needed
- Relationships are temporal (can change over time)
- Full history preserved

## Future Capabilities

### Analytics

Event streams enable:
- Mortality rate calculations
- Breeding success metrics
- Cage utilization analysis
- Turnover rate tracking
- Cost per animal calculations

### AI Operations Assistant

AI agents can:
- Consume real-time event streams
- Learn optimal movement patterns
- Recommend cage assignments
- Predict capacity issues
- Automate routine decisions

### Anomaly Detection

Pattern recognition on events:
- Unusual mortality spikes
- Environmental deviations
- Movement pattern anomalies
- Breeding irregularities

### Operational Replay

Debug and analyze by:
- Replaying events from a specific date
- Simulating "what-if" scenarios
- Training new staff on historical cases

### Timeline Visualization

Visual representations:
- Lot lifecycle timelines
- Cage occupancy heatmaps
- Movement flow diagrams
- Activity feeds

## Integration with Other Systems

### Cage Occupancy Runtime

Cage movements generate events:
```typescript
// When moving a lot between cages
moveLot(options); // Creates cage movement event automatically
```

### Lot Lifecycle Runtime

Lot events are bridged to operational events:
```typescript
bridgeLotLifecycleEvent(lotEvent, actor);
```

This creates unified event history across all systems.

## Best Practices

1. **Always include actor information** - Even for system events
2. **Use meaningful metadata** - Include context for future analysis
3. **Link related events** - Use references to build event chains
4. **Choose appropriate severity** - Helps with filtering and alerts
5. **Query efficiently** - Use filters to limit result sets
6. **Never mutate events** - Always create corrections/reversals

## API Reference

See `types.ts` for complete type definitions and `operations.ts` for function signatures.

### Key Functions

| Function | Purpose |
|----------|---------|
| `createOperationalEvent()` | Create a new immutable event |
| `createCorrectionEvent()` | Create a correction for existing data |
| `createReversalEvent()` | Reverse/undo a previous action |
| `getLotEvents()` | Query events for a specific lot |
| `getCageEvents()` | Query events for a specific cage |
| `getOperationalTimeline()` | Get timeline for multiple entities |
| `getRecentActivity()` | Get recent system-wide activity |
| `getActivitySummary()` | Get aggregated activity statistics |
| `eventToTimelineEntry()` | Convert event for visualization |
| `getEventStreamFrom()` | Stream events from a position |
| `exportEvents()` | Export events for external use |
