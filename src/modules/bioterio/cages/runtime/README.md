# Bioterio Cage Occupancy Runtime

## Overview

The Cage Occupancy Runtime System provides the spatial operational layer for the Bioterio blueprint. It manages cage capacity, lot assignments, movements, and facility occupancy tracking.

**Key Principle:** This system is **LOT-CENTRIC** and **SPACE-AWARE**. Lots exist inside cages, occupancy changes constantly, and movements are core workflows.

---

## Architecture

```
src/modules/bioterio/cages/runtime/
├── types.ts          # Type definitions (Cage, CageStatus, CageMovement, etc.)
├── operations.ts     # Business logic and operations
├── index.ts          # Public API exports
├── examples.ts       # Usage demonstrations
├── README.ts         # Architectural documentation (inline)
└── README.md         # This file (user documentation)
```

---

## Core Concepts

### 1. Derived Occupancy

**IMPORTANT:** Occupancy is NOT stored on the cage itself. It is COMPUTED at runtime from:
- Active lot assignments
- Current lot quantities (fetched from lot system)
- Movement history

**Why?**
- Lot quantities change (mortality, births, additions)
- Stored occupancy would drift from actual data
- Derived occupancy ensures consistency and real-time accuracy

### 2. Immutable Movement History

Every lot movement creates a `CageMovement` record that is **NEVER modified**:

```typescript
interface CageMovement {
  id: string;
  lotId: string;
  fromCageId?: string;    // Undefined if initial assignment
  toCageId: string;
  movementType: 'initial_assignment' | 'transfer' | 'relocation' | 'removal';
  timestamp: Date;
  quantityMoved?: number;
  reason?: string;
  performedBy?: string;
}
```

This enables:
- Complete audit trail
- Historical reconstruction ("Where was lot X on date Y?")
- Regulatory compliance

### 3. Event-Driven Operations

Operations create events, not just state changes:

| Operation | Events Created |
|-----------|---------------|
| `assignLotToCage()` | Assignment + Movement + Lifecycle |
| `moveLot()` | Movement (both cages) + Lifecycle (both cages) |
| `removeLotFromCage()` | Movement + Lifecycle |
| `startCleaning()` | Lifecycle (status change) |

---

## Types

### CageStatus

```typescript
type CageStatus =
  | 'available'    // Empty and ready for occupancy
  | 'occupied'     // Has active lot assignments
  | 'cleaning'     // Being cleaned/sanitized
  | 'maintenance'  // Under maintenance/repair
  | 'quarantine';  // Restricted use
```

### Cage

```typescript
interface Cage {
  id: string;
  code: string;             // e.g., "R1-A-01"
  roomId?: string;
  zoneId?: string;
  rackPosition?: string;
  capacity: CageCapacity;
  environment?: CageEnvironment;
  status: CageStatus;
  createdAt: Date;
  updatedAt: Date;
  lastCleanedAt?: Date;
  lastMaintenanceAt?: Date;
  isActive: boolean;
}
```

### CageOccupancy (Derived)

```typescript
interface CageOccupancy {
  cageId: string;
  totalAnimals: number;
  totalLots: number;
  assignments: LotAssignment[];
  utilizationPercent: number;
  isOverCapacity: boolean;
  lastUpdated: Date;
}
```

---

## Operations

### Creating Cages

```typescript
import { createCage } from './operations';

const cage = createCage({
  roomId: 'R1',
  zoneId: 'Rack-A',
  rackPosition: 'A1',
  capacity: {
    maxAnimals: 50,
    speciesCompatibility: ['mouse'],
    volumeLiters: 20,
  },
  tags: ['standard', 'breeding'],
});
```

### Assigning Lots to Cages

```typescript
import { assignLotToCage } from './operations';

const result = assignLotToCage({
  lotId: 'lot-123',
  cageId: 'cage-456',
  notes: 'Initial placement after weaning',
  performedBy: 'user-123',
});

console.log(result.cage);        // Updated cage
console.log(result.assignment);  // Assignment record
console.log(result.movement);    // Movement event
```

### Moving Lots Between Cages

```typescript
import { moveLot } from './operations';

const result = moveLot({
  lotId: 'lot-123',
  fromCageId: 'cage-456',
  toCageId: 'cage-789',
  reason: 'Relocating for breeding program',
  performedBy: 'user-123',
});

console.log(result.fromCage);    // Source cage (updated)
console.log(result.toCage);      // Destination cage (updated)
console.log(result.movement);    // Movement record
```

### Removing Lots (Sale/Transfer Out)

```typescript
import { removeLotFromCage } from './operations';

const result = removeLotFromCage({
  lotId: 'lot-123',
  cageId: 'cage-456',
  reason: 'Sold to research facility',
  performedBy: 'sales-team',
});
```

### Getting Occupancy

```typescript
import { getCageOccupancy } from './operations';

const occupancy = getCageOccupancy('cage-456');

console.log(`Total animals: ${occupancy.totalAnimals}`);
console.log(`Total lots: ${occupancy.totalLots}`);
console.log(`Utilization: ${occupancy.utilizationPercent.toFixed(1)}%`);
console.log(`Over capacity: ${occupancy.isOverCapacity}`);
```

### Cleaning Workflows

```typescript
import { startCleaning, completeCleaning } from './operations';

// Start cleaning (cage must be empty)
startCleaning(cageId, 'cleaning-staff-1');

// ... cleaning happens ...

// Complete cleaning (cage becomes available)
completeCleaning(cageId, 'cleaning-staff-1');
```

### Querying Cages

```typescript
import { queryCages, getAvailableCages } from './operations';

// Get available cages in a room
const available = getAvailableCages({
  roomId: 'R1',
  minCapacity: 30,
});

// Query by status
const occupied = queryCages({
  status: 'occupied',
  roomId: 'R1',
});
```

### Facility Statistics

```typescript
import { getFacilityStatistics } from './operations';

const stats = getFacilityStatistics();

console.log(`Total cages: ${stats.totalCages}`);
console.log(`Occupied: ${stats.occupiedCages}`);
console.log(`Total animals: ${stats.totalAnimals}`);
console.log(`Average utilization: ${stats.averageUtilization.toFixed(1)}%`);
console.log(`Over-capacity cages: ${stats.overCapacityCages}`);
```

---

## Subdivision Relocation Workflow

When a lot is subdivided (e.g., sex separation), child lots often need relocation:

```typescript
import { subdivideLot } from '../lots/runtime/operations';
import { relocateSubdividedLots } from './operations';

// 1. Subdivide parent lot
const subdivision = subdivideLot({
  lotId: parentLotId,
  subdivisions: [
    { sex: 'male', quantity: 20, codeSuffix: '-M' },
    { sex: 'female', quantity: 20, codeSuffix: '-F' },
  ],
});

// 2. Relocate child lots to separate cages
const results = relocateSubdividedLots({
  parentLotId: parentLotId,
  childLotIds: subdivision.childLots.map(c => c.id),
  targetCageAssignments: [
    { lotId: subdivision.childLots[0].id, cageId: maleCageId },
    { lotId: subdivision.childLots[1].id, cageId: femaleCageId },
  ],
  performedBy: 'user-123',
});
```

---

## Movement Traceability

Get complete movement history for a cage:

```typescript
import { getCageMovementHistory } from './operations';

const history = getCageMovementHistory('cage-456');

console.log(`Movements in: ${history.totalMovementsIn}`);
console.log(`Movements out: ${history.totalMovementsOut}`);
console.log(`Current assignments: ${history.currentAssignments.length}`);

// Full movement records
for (const movement of history.movements) {
  console.log(`${movement.timestamp}: ${movement.lotId} - ${movement.movementType}`);
}
```

---

## Integration with Lot System

The cage runtime integrates tightly with the lot runtime:

1. **Lot Creation** → Assign to cage
2. **Lot Subdivision** → Relocate child lots
3. **Lot Quantity Changes** → Automatically reflected in occupancy
4. **Lot Status Changes** → Affects cage availability

```typescript
// Example: Create lot and immediately assign to cage
import { createLot } from '../lots/runtime/operations';
import { createCage, assignLotToCage } from './operations';

const cage = createCage({ /* ... */ });

const lot = createLot({
  species: 'mouse',
  strain: 'C57BL/6',
  sex: 'mixed',
  quantity: 25,
  sourceType: 'internal_birth',
});

assignLotToCage({
  lotId: lot.id,
  cageId: cage.id,
});
```

---

## Future Extensions

### Analytics Support

The runtime provides foundation for:
- Occupancy trend analysis
- Movement pattern detection
- Capacity forecasting
- Utilization optimization

### AI Optimization

Future AI features can leverage:
- Movement history for path optimization
- Occupancy patterns for predictive placement
- Anomaly detection for unusual patterns
- Automated workflow suggestions

### Environmental Monitoring

The `CageEnvironment` type supports:
- Temperature tracking
- Humidity monitoring
- Light cycle management
- Environmental alerts

---

## Best Practices

1. **Always use operations**, never modify cage state directly
2. **Record reasons** for movements and status changes
3. **Track performedBy** for audit compliance
4. **Check cage status** before operations (cleaning/maintenance block assignments)
5. **Use derived occupancy** for displays, not stored values
6. **Preserve movement history** - it's immutable and auditable

---

## Differences from Pet/Veterinary Blueprints

| Aspect | Bioterio (Lot-Centric) | Pet/Vet (Individual-Centric) |
|--------|----------------------|----------------------------|
| Entity | Lots (groups) | Individual animals |
| Spatial | Cages with multiple lots | Kennels/cages per animal |
| Movement | Lot moves as group | Individual transfers |
| Occupancy | Derived from lots | Direct animal-cage link |
| Traceability | Lot lineage + cage history | Individual medical records |

---

## See Also

- [Lot Runtime Documentation](../lots/runtime/README.md)
- [Architectural Documentation](./README.ts)
- [Usage Examples](./examples.ts)
