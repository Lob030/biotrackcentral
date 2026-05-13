# Bioterio Quick Operational Workflows

## Overview

This module provides **fast, operationally-optimized workflows** for daily bioterio operations. The design prioritizes **operational speed** and **daily usability** over administrative completeness.

## Design Principles

### 1. Minimal Clicks
Most common actions should require **1-3 interactions**:
- Select entity (lot/cage)
- Enter quantity
- Confirm

### 2. Minimal Typing
- Smart defaults everywhere
- Quick selectors instead of text input
- Numeric inputs with +/- buttons
- Pre-filled common values

### 3. Mobile-First
- Large touch targets (minimum 44x44px)
- Simple layouts that work on small screens
- Keyboard-efficient for desktop power users
- Thumb-friendly interaction zones

### 4. Event-Driven Integration
All workflows automatically:
- Create operational events
- Update projections
- Maintain audit history
- Trigger downstream updates

### 5. Built-in Safeguards
Validation happens without friction:
- Real-time capacity checks
- Quantity constraints
- Breeding compatibility
- Age-appropriate warnings

## Available Workflows

| Workflow | Purpose | Key Validations |
|----------|---------|-----------------|
| `createLot` | New lot creation | Species required, positive quantity |
| `subdivideLot` | Split lot into children | Total ≤ available, positive per subdivision |
| `moveLot` | Transfer between cages | Destination capacity, source contains lot |
| `assignLotToCage` | Initial cage assignment | Cage capacity |
| `registerMortality` | Log deaths | Cannot exceed current quantity |
| `createBreedingGroup` | Setup breeding pair/group | Male + female required, cage capacity |
| `registerLitter` | Record new litter | Live births ≤ litter size |
| `registerWeaning` | Wean litter into lots | Age warning, total ≤ litter size |

## Usage Example

```typescript
import { useWorkflowActions } from '@/modules/bioterio/workflows';

function MyComponent() {
  const { createLot, registerMortality, isLoading, lastError } = useWorkflowActions({
    workspaceId: 'ws-123',
    instanceId: 'inst-456',
    userId: 'user-789',
  });

  const handleCreateLot = async () => {
    const result = await createLot({
      speciesId: 'species_mouse',
      strain: 'C57BL/6',
      sex: 'mixed',
      quantity: 20,
      sourceType: 'internal_birth',
      cageId: 'cage-abc',
    });

    if (result.success) {
      console.log(`Created lot ${result.data.lotCode}`);
    } else {
      console.error(result.error);
    }
  };

  return (
    <div>
      <button onClick={handleCreateLot} disabled={isLoading === 'createLot'}>
        {isLoading === 'createLot' ? 'Creating...' : 'Create Lot'}
      </button>
      {lastError && <div className="error">{lastError}</div>}
    </div>
  );
}
```

## Primitives

### LotPicker
Fast lot selection with search and filters:
```tsx
<LotPicker
  value={selectedLotId}
  onChange={setSelectedLotId}
  filter={{ status: ['active'], minQuantity: 1 }}
  showQuantity
  showLocation
/>
```

### CagePicker
Cage selection with capacity visualization:
```tsx
<CagePicker
  value={selectedCageId}
  onChange={setSelectedCageId}
  filter={{ minAvailableSpace: 10 }}
  showCapacity
/>
```

### QuantityInput
Touch-friendly numeric input:
```tsx
<QuantityInput
  value={quantity}
  onChange={setQuantity}
  min={1}
  max={availableSpace}
  quickValues={[1, 5, 10, 20]}
/>
```

## Architecture Integration

### Event Flow
```
User Action → Workflow Action → Runtime Operation → 
Persistence Layer → Operational Event → Projection Rebuild → UI Update
```

### Projection Dependencies
Workflows read from **materialized projections** for speed:
- `current_lot_state` - Current lot quantities and status
- `current_cage_occupancy` - Real-time cage availability
- `active_breeding_groups` - Active breeding group data

### Immutability
All workflows create **immutable operational events**:
- Events are INSERT ONLY
- No destructive updates to event tables
- State changes recorded as new events
- Full historical traceability preserved

## AI Assistant Integration

The workflow architecture naturally supports AI assistants:

### 1. Natural Language Commands
```
"Create a new lot of 20 C57 mice, mixed sex"
→ createLot({ speciesId: 'species_mouse', strain: 'C57BL/6', quantity: 20, sex: 'mixed' })
```

### 2. Predictive Suggestions
AI can analyze patterns and suggest:
- Optimal cage assignments based on occupancy
- Breeding pair recommendations
- Mortality anomaly detection

### 3. Automated Workflows
Routine operations can be automated:
- Daily mortality logging reminders
- Weaning age notifications
- Capacity optimization suggestions

### 4. Historical Analysis
Event stream enables:
- Trend analysis for mortality rates
- Breeding performance metrics
- Operational efficiency insights

## Why This Architecture?

### Hybrid Event-Driven Model
- **Events** = Immutable historical truth (audit, compliance, analytics)
- **Projections** = Fast current state (UI, dashboards, validations)
- **No full replay needed** = Projections provide instant access

### Why Not Pure CRUD?
- CRUD loses historical context
- Cannot answer "what happened and when"
- Difficult to implement undo/reversal
- Analytics require complex change tracking

### Why Not Pure Event Sourcing?
- Full replay is slow for operational UI
- Dashboards need instant data
- Mobile users cannot wait for replay
- Complexity outweighs benefits for this domain

### The Hybrid Advantage
- Best of both worlds: history + speed
- Events for compliance and analytics
- Projections for real-time operations
- Scalable as data grows

## Future Extensions

### Command Palette
Quick keyboard-driven workflow access:
```
Cmd+K → "Create lot" → Form appears
```

### Batch Operations
Multiple similar operations in one action:
```
"Wean all litters older than 21 days"
```

### Offline Support
Queue operations when offline, sync when connected:
- Critical for facilities with spotty connectivity
- Operations validated locally first
- Conflict resolution on sync

### Voice Input
Hands-free operation for lab environments:
```
"Register 2 deaths in lot A-101, reason unknown"
```
