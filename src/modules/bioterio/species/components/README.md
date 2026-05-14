# Operational Species Configuration UI

## Overview

This is the **CORE operational configuration interface** for workspace species management. It directly impacts:

- **Inventory** - How lots are classified and tracked
- **Workflows** - Breeding, weaning, sales operations
- **Sales** - Pricing by size class
- **Availability** - What's available to sell
- **Forecasting** - Growth projections based on classifications
- **AI Operational Behavior** - Workspace-specific terminology and parameters

## Route Structure

```
/bioterio/species           → Species Profiles List
/bioterio/species/:id       → Species Detail & Configuration
```

## Architecture

### Components

```
src/modules/bioterio/species/components/
├── SpeciesProfileCard.tsx      # Overview card with stats
├── SizeClassEditor.tsx         # Inline editing + drag-and-drop
├── ClassificationFlow.tsx      # Visual progression display
└── index.ts                    # Re-exports
```

### Pages

```
src/modules/bioterio/pages/
└── SpeciesProfiles.tsx         # Main page (list + detail views)
```

## Key Features

### 1. Species Profile Cards

Each profile displays:
- Species name (with blueprint/custom badge)
- Active size classes count
- Breeding cycle duration
- Weaning age
- Inventory counts
- Estimated operational value

**Design Principles:**
- Operational feel (not administrative)
- Fast scanning
- Click-through to detail view
- Visual hierarchy

### 2. Size Class Management

**Inline Editing:**
- Edit name, code, weight range, age range, pricing
- No modal depth - edit in place
- Large touch targets for mobile
- Keyboard-efficient inputs

**Drag-and-Drop Ordering:**
- Reorder size classes by dragging
- Updates `displayOrder` persistently
- Visual feedback during drag
- Smooth animations

**Validation Feedback:**
- Immediate error display
- Overlapping ranges detected
- Invalid ordering warnings
- Negative value detection
- Impossible range alerts

### 3. Classification Flow Visualization

Shows the operational progression:

```
Pinky (3-10g, 0-7d)
    ↓
Fuzzy (10-20g, 7-14d)
    ↓
Hopper (20-40g, 14-21d)
    ↓
Adult (40-80g, 21+d)
```

Or workspace-custom:

```
10g (8-12g, 5-10d)
    ↓
20g (15-25g, 10-18d)
    ↓
50g (40-60g, 18-30d)
    ↓
Adult (50g+, 30+d)
```

### 4. Built-in Blueprint Instantiation

Users can start from:
- **ASF Preset** - African Soft-Furred Rat defaults
- **Rat Preset** - Laboratory rat defaults
- **Mouse Preset** - Laboratory mouse defaults
- **Custom Species** - Completely new profile

**Critical:** All presets are fully editable after instantiation. Nothing is locked.

### 5. Operational Settings Display

Shows key parameters:
- Breeding cycle days
- Gestation period
- Weaning age
- Maturity age
- Birth/adult weights
- Expected mortality rate

## Mobile UX Considerations

Designed for frequent phone/tablet use:

- **Large Touch Targets** - Buttons ≥ 44px height
- **Minimal Modal Depth** - Inline editing preferred
- **Keyboard-Efficient** - Numeric inputs where appropriate
- **Responsive Layout** - Grid adapts to screen size
- **Touch-Friendly Drag** - Easy reordering on mobile

## Integration Points

### With Inventory System

Inventory screens consume:
```typescript
// From workspace-specific configuration
const sizeClasses = useSizeClasses(speciesProfileId);

// Display uses workspace naming
sizeClasses.map(sc => sc.name) // "Pinky" or "10g" depending on workspace

// Pricing from workspace config
sc.salePrice // Workspace-defined price
```

### With Dashboard

Dashboard widgets adapt to:
- Custom classification names
- Custom ordering
- Workspace-specific pricing

### With AI Systems

AI receives workspace context:
```typescript
{
  speciesProfile: { ... },
  operationalSettings: { ... },
  sizeClasses: [ ... ],  // Workspace-specific names
  pricing: { ... }       // Workspace-specific prices
}
```

**No hardcoded species assumptions in AI prompts.**

## Validation System

Detects and displays:

### Errors (Blocking)
- Overlapping weight ranges
- Overlapping age ranges  
- Min > Max (impossible ranges)
- Negative values

### Warnings (Advisory)
- Gaps in ranges (no coverage)
- Unusual ordering
- Missing default class

Example validation result:
```typescript
{
  isValid: false,
  errors: [
    {
      field: "weightRange",
      message: "Weight ranges overlap between 'Fuzzy' and 'Hopper'",
      severity: "error",
      details: { sizeClassId: "abc123" }
    }
  ],
  warnings: []
}
```

## Data Flow

### Creation Flow

1. User clicks "Desde Plantilla" or "Especie Personalizada"
2. Selects blueprint or enters custom data
3. `useUpsertSpeciesProfile` mutation creates profile
4. Default size classes auto-created (for blueprints)
5. Redirected to detail view

### Configuration Flow

1. User opens species detail
2. Views current size classes in list
3. Clicks edit icon or drags to reorder
4. Changes saved via mutations:
   - `useUpdateSizeClass`
   - `useReorderSizeClasses`
5. Validation runs automatically
6. Visual feedback shows errors/warnings

### Runtime Classification

When classifying a lot:
```typescript
import { classifyLotByWeight, classifyLotByAge } from '../runtime/operations';

const result = classifyLotByWeight({
  workspaceId,
  speciesProfileId,
  weightGrams: 15.5
});

// Returns:
{
  sizeClassId: "xyz789",
  sizeClassName: "Fuzzy",  // Workspace-specific name
  matchedBy: "weight",
  confidence: "exact"
}
```

## Example Usage

### Creating Custom Size Classes

Workspace A wants gram-based classifications:

```typescript
// User adds via UI:
{
  name: "10g",
  code: "10G",
  minWeightGrams: 8,
  maxWeightGrams: 12,
  minAgeDays: 5,
  maxAgeDays: 10,
  salePrice: 2.75,
  displayOrder: 1
}
```

Workspace B wants developmental stages:

```typescript
// User adds via UI:
{
  name: "Nursling",
  code: "NS",
  minWeightGrams: 3,
  maxWeightGrams: 8,
  minAgeDays: 0,
  maxAgeDays: 5,
  salePrice: 2.00,
  displayOrder: 1
}
```

Both are valid for the same biological species.

## Migration Support

For existing inventory using old hardcoded classifications:

1. **Migration Assistant UI** (future phase)
   - Shows old classifications
   - Maps to new `sizeClassId` references
   - Validates mapping before applying
   - Batch updates inventory records

2. **Backward Compatibility**
   - Old string-based classifications still work temporarily
   - Warning banners encourage migration
   - Automatic conversion tools available

## Future Enhancements (Out of Scope for This Phase)

- Advanced analytics dashboards
- Predictive growth modeling
- Genetics simulation
- Complex pricing engines
- Automated reordering suggestions

## Testing Checklist

- [ ] Create species from ASF blueprint
- [ ] Create species from Rat blueprint
- [ ] Create species from Mouse blueprint
- [ ] Create completely custom species
- [ ] Add new size class inline
- [ ] Edit size class properties
- [ ] Delete size class
- [ ] Drag-and-drop reordering
- [ ] Validation detects overlapping ranges
- [ ] Validation detects impossible ranges
- [ ] Classification flow displays correctly
- [ ] Mobile touch targets usable
- [ ] Navigation between list and detail works
- [ ] Back button returns to list

## Summary

This UI provides **operational flexibility** as the core principle:

✅ Workspace-specific classifications
✅ Workspace-specific naming
✅ Workspace-specific pricing
✅ Workspace-specific operational parameters
✅ Full editability of all starter blueprints
✅ Fast, mobile-friendly workflows
✅ Immediate validation feedback
✅ Visual classification progression

This prepares the platform for **real operational use** across diverse bioterios with different operational models.
