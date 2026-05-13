# Bioterio Operational Integration Validation Layer

## Overview

This validation layer provides comprehensive end-to-end operational validation for the Bioterio blueprint. It ensures synchronization integrity between workflows, events, projections, and dashboards.

## Critical Objective

**Validate and stabilize the FULL operational chain end-to-end:**

```
Workflow → Operational Event → Persistence → Projection Update → Dashboard Refresh → AI Context Refresh
```

## Design Principles

1. **Projections must be derivable from event history** - All materialized state can be rebuilt from immutable events
2. **Event-driven integrity must be maintained** - Events are immutable and preserve complete historical traceability
3. **Synchronization is critical** - Workflows, events, and projections must remain consistent
4. **Detect drift early** - Projection drift, stale state, and orphan records are detected and reported

## Module Structure

```
validation/
├── operational-integration.ts  # Core validation logic
├── index.ts                    # Module exports
└── README.md                   # This file
```

## Validation Capabilities

### 1. End-to-End Operational Chain Validation

#### `validateLotOperationalChain(lotId)`
Validates the complete operational chain for a lot:
- ✓ Lot exists in persistence
- ✓ Operational events generated
- ✓ Projection exists and is consistent
- ✓ Cage assignment validity
- ✓ Cage occupancy projection consistency

#### `validateCageOperationalChain(cageId)`
Validates the complete operational chain for a cage:
- ✓ Cage exists in persistence
- ✓ Movement records exist
- ✓ Assignments are consistent
- ✓ Occupancy projection is accurate
- ✓ Overcapacity detection

### 2. Projection Reconciliation Utilities

#### `rebuildProjectionFromEvents(entityType, entityId)`
Rebuilds and validates projections from event history:
- Computes expected state from events
- Compares with current projection
- Reports discrepancies
- Recommends rebuild when needed

**How Reconciliation Works:**

```typescript
// For Lots:
1. Fetch all lot_events for the lot
2. Compute expected state:
   - initial_quantity from creation event
   - Add animals_added events
   - Subtract mortality events
   - Track status changes
3. Compare computed state with current_lot_state projection
4. Report any discrepancies

// For Cages:
1. Fetch all cage_movements to this cage
2. Get active lot_assignments
3. Sum current quantities from assigned lots
4. Compare with current_cage_occupancy projection
5. Report any discrepancies
```

### 3. Operational Integrity Checks

#### `detectNegativeQuantities()`
Scans all lots for negative quantities (critical data corruption).

#### `detectInvalidSubdivisionTotals()`
Validates that child lots from subdivision don't exceed parent quantity.

#### `detectOrphanMovementRecords()`
Finds movement records referencing non-existent lots or cages.

#### `detectInvalidLineageReferences()`
Validates origin_lot_id references exist.

### 4. Debug Tooling

#### `getOperationalTimeline(entityType, entityId)`
Retrieves chronological operational events for debugging.

#### `getWorkflowExecutionTrace(workflowName)`
Traces workflow execution steps (requires implementation).

#### `runComprehensiveValidation()`
Runs all integrity checks and returns summary report.

## Usage Examples

### Validate a Specific Lot

```typescript
import { operationalValidation } from '@/modules/bioterio/validation';

const result = await operationalValidation.validateLotOperationalChain(lotId);

if (!result.success) {
  console.error('Validation failed:', result.errors);
}

console.log('Validation info:', result.info);
console.log('Warnings:', result.warnings);
```

### Run System-Wide Validation

```typescript
const report = await operationalValidation.runComprehensiveValidation();

console.log('Overall Success:', report.overallSuccess);
console.log('Total Errors:', report.summary.totalErrors);
console.log('Critical Issues:', report.summary.criticalIssues);

// Access individual results
if (!report.results.negativeQuantities.success) {
  // Handle negative quantity issues
}
```

### Rebuild Projection from Events

```typescript
const reconciliation = await operationalValidation.rebuildProjectionFromEvents(
  'lot',
  lotId
);

if (reconciliation.rebuildRecommended) {
  console.log('Discrepancies found:', reconciliation.discrepancies);
  // Trigger projection rebuild
  await persistenceServices.rebuildLotStateProjection(lotId);
}
```

## Validation Scenarios

### PHASE 1 — CREATE LOT VALIDATION

```
✓ Execute create lot workflow
✓ Verify operational event generated (lot_created)
✓ Verify persistence rows created (lots table)
✓ Verify projections updated (current_lot_state)
✓ Verify dashboard metrics updated
✓ Verify recent activity updated
✓ Verify AI operational context updated
```

### PHASE 2 — SUBDIVISION VALIDATION

```
✓ Execute subdivision workflow
✓ Verify parent lot state updated (status = subdivided)
✓ Verify child lots created correctly
✓ Verify lineage references preserved (origin_lot_id, ancestor_ids)
✓ Verify occupancy recalculated
✓ Verify dashboard updates
✓ Verify operational events generated
```

**Detection:**
- Quantity inconsistencies (children > parent)
- Lineage breaks (missing origin references)
- Projection drift

### PHASE 3 — CAGE MOVEMENT VALIDATION

```
✓ Move lot between cages
✓ Verify occupancy recalculation (source and destination)
✓ Verify movement events generated
✓ Verify projections updated
✓ Verify dashboard occupancy updates
✓ Verify alerts react correctly
```

**Detection:**
- Overcapacity inconsistencies
- Stale occupancy projections
- Orphan movement records

### PHASE 4 — MORTALITY VALIDATION

```
✓ Register mortality
✓ Verify lot quantity updates
✓ Verify operational events generated
✓ Verify mortality projections updated
✓ Verify dashboard metrics updated
✓ Verify AI context updated
```

**Detection:**
- Negative quantities
- Projection inconsistencies

### PHASE 5 — REPRODUCTION VALIDATION

```
✓ Create breeding group
✓ Register litter
✓ Register weaning
✓ Verify lot creation for weaned animals
✓ Verify lineage preservation
✓ Verify operational projections
✓ Verify dashboard updates
```

### PHASE 6 — AI WORKFLOW VALIDATION

```
✓ AI command parsing
✓ Intent resolution
✓ Validation layer
✓ Preview generation
✓ Workflow execution
✓ Event generation
✓ Projection refresh
✓ Dashboard refresh
```

**Critical:** AI actions must produce IDENTICAL operational state changes as manual workflows.

## Error Codes

| Code | Severity | Description | Repairable |
|------|----------|-------------|------------|
| `LOT_NOT_FOUND` | critical | Lot doesn't exist in persistence | No |
| `MISSING_PROJECTION` | error | Projection not materialized | Yes |
| `PROJECTION_MISMATCH` | error | Projection inconsistent with source | Yes |
| `ORPHAN_CAGE_REFERENCE` | critical | References non-existent cage | No |
| `CAGE_PROJECTION_INCONSISTENCY` | error | Lot not in cage projection | Yes |
| `NEGATIVE_QUANTITY` | critical | Lot has negative count | Yes |
| `INVALID_SUBDIVISION_TOTAL` | critical | Children exceed parent | No |
| `ORPHAN_MOVEMENT_RECORD` | critical | Movement references missing entity | No |
| `INVALID_LINEAGE_REFERENCE` | critical | Origin lot doesn't exist | No |
| `STALE_PROJECTION` | warning | Projection not recently updated | Yes |
| `OVER_CAPACITY` | warning | Cage exceeds max capacity | Manual |

## How Projections Are Validated

### Lot State Projection Validation

```typescript
// Source of truth: lots table
const lot = await supabase.from('lots').select('*').eq('id', lotId).single();

// Materialized projection: current_lot_state table
const projection = await supabase
  .from('current_lot_state')
  .select('*')
  .eq('lot_id', lotId)
  .single();

// Validation checks:
1. current_quantity matches
2. status matches
3. cage_id matches
4. Computed statistics (mortality, subdivisions) align with events
```

### Cage Occupancy Projection Validation

```typescript
// Source of truth: lot_assignments + lots
const assignments = await supabase
  .from('lot_assignments')
  .select('lot_id')
  .eq('cage_id', cageId)
  .eq('is_active', true);

const lots = await supabase
  .from('lots')
  .select('current_quantity')
  .in('id', assignmentLotIds);

const computedTotal = lots.reduce((sum, lot) => sum + lot.current_quantity, 0);

// Materialized projection: current_cage_occupancy
const projection = await supabase
  .from('current_cage_occupancy')
  .select('total_animals, total_lots')
  .eq('cage_id', cageId)
  .single();

// Validation:
computedTotal === projection.total_animals
```

## How Event-Driven Integrity Is Maintained

1. **Immutable Events**: Once created, events are never modified
2. **Dual Recording**: Changes recorded in both:
   - Materialized state (for fast queries)
   - Event stream (for audit and rebuild)
3. **Projection Rebuild**: Any projection can be reconstructed from events
4. **Hash Verification**: Events include SHA-256 hash for integrity
5. **Temporal Ordering**: Events ordered by timestamp for replay

## Production Readiness Checklist

- [ ] All workflows generate operational events
- [ ] All events persist to database
- [ ] All projections update after events
- [ ] Dashboard reflects projection state
- [ ] AI assistant sees operational context
- [ ] No negative quantities exist
- [ ] No orphan references exist
- [ ] All lineage chains valid
- [ ] Subdivision totals valid
- [ ] Cage occupancies accurate
- [ ] Comprehensive validation passes

## Next Steps

1. **Integrate validation into CI/CD** - Run on every deployment
2. **Add real-time monitoring** - Alert on validation failures
3. **Implement auto-repair** - Automatically rebuild stale projections
4. **Extend to other blueprints** - Apply pattern to veterinary, commerce, etc.

## Related Modules

- `/modules/bioterio/events/runtime/` - Event system
- `/modules/bioterio/lots/runtime/` - Lot operations
- `/modules/bioterio/cages/runtime/` - Cage operations
- `/modules/bioterio/workflows/` - Workflow definitions
- `/modules/bioterio/persistence/` - Persistence layer
- `/modules/bioterio/dashboard/` - Dashboard integration
