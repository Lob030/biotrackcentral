# Bioterio Lot Runtime System

## Overview

The **Lot Runtime System** is the core operational foundation for the Bioterio blueprint. It implements a **lot-centric** management model where animals are managed in groups rather than as individuals.

## Architecture

```
src/modules/bioterio/lots/runtime/
├── types.ts        # Core type definitions
├── operations.ts   # Business logic and operations
├── index.ts        # Public API exports
├── examples.ts     # Usage demonstrations
└── README.ts       # Architectural documentation
```

## Why Lot-Centric?

This system is designed around **LOTS** (groups of animals) rather than individual animals because:

1. **Scale**: Bioterios manage hundreds/thousands of small animals (mice, rats)
2. **Practicality**: Individual tagging is impractical for small species
3. **Operations**: Daily workflows (feeding, cleaning, health checks) happen at cage/lot level
4. **Lifecycle**: Many animals are short-term; they're born, raised, sold as groups
5. **Compliance**: Regulations require batch traceability, not individual tracking

## Core Concepts

### Lot Status
- `active` - Currently operational
- `subdivided` - Split into child lots
- `sold` - Transferred out/sold
- `retired` - Retired from breeding/production
- `deceased` - All animals deceased

### Source Types
- `internal_birth` - Born within facility
- `external_purchase` - Purchased from supplier
- `transfer` - Transferred from another lot/facility

### Key Operations

#### Create a Lot
```typescript
import { createLot } from '@/modules/bioterio/lots/runtime';

const lot = createLot({
  species: 'mouse',
  strain: 'C57BL/6',
  sex: 'mixed',
  quantity: 20,
  sourceType: 'internal_birth',
  birthDate: new Date(),
  location: 'Room-A-Cage-101',
});
```

#### Subdivide a Lot
```typescript
import { subdivideLot } from '@/modules/bioterio/lots/runtime';

const result = subdivideLot({
  lotId: lot.id,
  subdivisions: [
    { sex: 'male', quantity: 10, codeSuffix: '-M' },
    { sex: 'female', quantity: 10, codeSuffix: '-F' },
  ],
});

// Result:
// - Parent lot status -> 'subdivided'
// - Two child lots created with preserved lineage
```

#### Query Lots
```typescript
import { getActiveLots, queryLots } from '@/modules/bioterio/lots/runtime';

// Get all active lots
const active = getActiveLots();

// Filter by criteria
const femaleMice = queryLots({
  species: 'mouse',
  sex: 'female',
  status: 'active',
});
```

#### Get Lineage
```typescript
import { getLotLineage, getLotAncestors } from '@/modules/bioterio/lots/runtime';

const lineage = getLotLineage(lotId);
const ancestors = getLotAncestors(lotId);
```

## Lineage Preservation

Lineage is preserved through:

1. **Origin Tracking**: Each lot stores `originLotId` if from subdivision
2. **Ancestor Chain**: Complete ancestry array from oldest to immediate parent
3. **Generation Depth**: Tracks how many generations deep
4. **Subdivision Records**: Parents track all child lots created
5. **Lifecycle Events**: Full audit trail of all transformations

### Example Lineage Flow

```
Generation 0: ASF-001 (founders)
                 │
                 │── subdivision (sex separation)
                 │
Generation 1: ASF-001-M ──┬── offspring born
                          │
Generation 2: ASF-001-M-001 (offspring lot)
```

All descendants preserve the complete ancestor chain for full traceability.

## Subdivision Workflows

Subdivision is the primary mechanism for lot transformation:

### Sex Separation (Most Common)
```
Original: ASF-001 (mixed, 20 animals)
                │
                │── separate by sex
                │
Result: ASF-001-M (male, 10)   ASF-001-F (female, 10)
        Parent status -> 'subdivided'
```

### Weaning Separation
```
Original: BREED-001 (colony with offspring)
                │
                │── wean offspring
                │
Result: BREED-001 (adults)   WEAN-001-A   WEAN-001-B
```

## Difference from Pet/Veterinary Systems

| Aspect | Bioterio (Lot-Centric) | Pet/Vet (Individual-Centric) |
|--------|----------------------|----------------------------|
| Entity | Groups/Lots | Individual animals |
| ID | Lot codes (ASF-001) | Microchips, names |
| Medical | Lot-level health | Individual records |
| Lifecycle | Short-term, high turnover | Long-term relationships |
| Operations | Batch operations | Individual appointments |
| Traceability | Lot lineage | Individual pedigree |

## Future Extensions

The runtime is prepared for:

- **Analytics**: Breeding performance, mortality rates, growth analysis
- **AI Assistant**: Predictive recommendations, forecasting, anomaly detection
- **Cage Occupancy**: Location tracking, capacity management
- **Breeding Workflows**: Pair formation, pregnancy tracking, weaning
- **Database Integration**: Persistence layer, event sourcing

## API Reference

### Types
- `Lot` - Primary operational entity
- `LotStatus` - Operational state
- `LotSourceType` - Origin type
- `LotLineage` - Ancestry tracking
- `LotLifecycleEvent` - Audit events

### Functions
- `createLot(options)` - Create new lot
- `subdivideLot(options)` - Split into child lots
- `getLotLineage(id)` - Get lineage info
- `getLotAncestors(id)` - Get ancestor chain
- `getLotDescendants(id)` - Get all descendants
- `getLotLifecycle(id)` - Get event history
- `getActiveLots()` - Get active lots
- `queryLots(filters)` - Filter lots
- `updateLotStatus(id, status)` - Change status
- `addAnimalsToLot(id, qty)` - Add animals
- `removeAnimalsFromLot(id, qty)` - Remove animals
- `getLotStatistics()` - Population stats

## Testing

Run the examples to see the runtime in action:

```typescript
import { runAllExamples } from '@/modules/bioterio/lots/runtime/examples';

runAllExamples();
```

## Version

- **Version**: 1.0.0
- **Architecture**: Lot-centric
- **Module**: `@/modules/bioterio/lots/runtime`
