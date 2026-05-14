# Workspace Species Profiles Runtime

## Overview

The Workspace Species Profiles Runtime is an **operational configuration system** that allows every workspace/bioterio to define how THEY operationally manage species.

## Critical Principles

### Species Are NOT Hardcoded Operational Behavior

Each workspace can customize:
- **Classifications** - Different naming conventions (Pinky/Fuzzy/Hopper vs 10g/20g/Adult)
- **Sizes** - Weight ranges specific to their operations
- **Operational Naming** - How they refer to species internally
- **Weights** - Min/max weight thresholds
- **Ages** - Age-based classifications
- **Pricing** - Size-class-specific pricing
- **Breeding Behavior** - Expected cycles, weaning ages, etc.

### Built-in Species Are Editable Starter Blueprints

The existing ASF, Rat, Mouse definitions are now:
- ✅ Starter operational blueprints
- ✅ Editable templates
- ✅ Examples of usage

NOT fixed immutable definitions.

### Workspace-Scoped Configuration

Different bioterios may configure the same species differently:

```
Workspace A:
- Pinky (3-10g, 0-7 days)
- Fuzzy (10-20g, 7-14 days)
- Hopper (20-40g, 14-21 days)

Workspace B:
- 10g (8-12g)
- 20g (18-25g)
- 50g (45-60g)
- Adult (60g+)
```

Both are valid operational classifications for the same biological species.

## Architecture

```
src/modules/bioterio/species/runtime/
├── types.ts          # Core type definitions
├── operations.ts     # Runtime operations
└── index.ts          # Public API
```

## Core Entities

### WorkspaceSpeciesProfile

The main entity defining how a workspace manages a species:

```typescript
interface WorkspaceSpeciesProfile {
  id: string;
  workspaceId: string;
  speciesId: string;           // Biological species identifier
  speciesName: string;         // Display name
  operationalName: string;     // Workspace-specific name
  isActive: boolean;
  isCustom: boolean;           // true if workspace-defined
  isStarterBlueprint: boolean; // true if from built-in blueprint
}
```

### SpeciesSizeClass

Defines operational size classifications:

```typescript
interface SpeciesSizeClass {
  id: string;
  workspaceId: string;
  speciesProfileId: string;    // Reference to profile
  name: string;                // e.g., 'Pinky', '20g', 'Adult'
  minWeightGrams?: number;
  maxWeightGrams?: number;
  minAgeDays?: number;
  maxAgeDays?: number;
  salePrice?: number;
  displayOrder: number;
  isActive: boolean;
  isDefault: boolean;
  isCustom: boolean;
}
```

### SpeciesOperationalSettings

Operational parameters for managing a species:

```typescript
interface SpeciesOperationalSettings {
  breedingCycleDays: number;
  expectedWeaningAgeDays: number;
  expectedGestationDays: number;
  maturityAgeDays: number;
  expectedBirthWeightGrams: number;
  expectedAdultWeightGrams: number;
  expectedMortalityRate: number;
  typicalLitterSize?: number;
}
```

## Runtime Operations

### Profile Management

```typescript
// Create from starter blueprint
const profile = createSpeciesProfileFromBlueprint({
  workspaceId: 'ws_123',
  blueprintId: 'starter_asf',
  operationalName: 'ASF Colony A',
});

// Create custom species
const custom = createCustomSpeciesProfile({
  workspaceId: 'ws_123',
  speciesId: 'cavia_porcellus',
  speciesName: 'Guinea Pig',
  operationalName: 'GP',
});

// Update profile
updateSpeciesProfile(profile.id, {
  operationalName: 'ASF - Main Colony',
});

// Get profiles for workspace
const profiles = getSpeciesProfiles({
  workspaceId: 'ws_123',
  isActive: true,
});
```

### Size Class Management

```typescript
// Add size class
const pinky = addSizeClass({
  workspaceId: 'ws_123',
  speciesProfileId: profile.id,
  name: 'Pinky',
  code: 'PK',
  minWeightGrams: 3,
  maxWeightGrams: 10,
  minAgeDays: 0,
  maxAgeDays: 7,
  salePrice: 2.50,
  isDefault: false,
});

// Update size class
updateSizeClass(pinky.id, {
  salePrice: 3.00,
  maxWeightGrams: 12,
});

// Get size classes for species
const sizeClasses = getSizeClassesForSpecies({
  workspaceId: 'ws_123',
  speciesProfileId: profile.id,
  isActive: true,
});

// Reorder size classes
reorderSizeClasses({
  workspaceId: 'ws_123',
  speciesProfileId: profile.id,
  orderedIds: [id1, id2, id3, id4],
});
```

### Classification Operations

```typescript
// Classify by weight
const weightClassification = classifyLotByWeight({
  workspaceId: 'ws_123',
  speciesProfileId: profile.id,
  weightGrams: 15,
});
// Returns: { sizeClassId, sizeClassName, matchedBy: 'weight', confidence }

// Classify by age
const ageClassification = classifyLotByAge({
  workspaceId: 'ws_123',
  speciesProfileId: profile.id,
  ageDays: 10,
});

// Get size class by ID
const sizeClass = getOperationalSizeClass(sizeClassId);
```

### Validation

```typescript
// Validate configuration
const validation = validateSpeciesConfiguration({
  workspaceId: 'ws_123',
  speciesProfileId: profile.id,
});

if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}

validation.warnings.forEach(w => {
  console.warn('Warning:', w.message);
});
```

## Validation Rules

The system detects:

1. **Overlapping Weight Ranges** - Warns when size classes have overlapping weight thresholds
2. **Overlapping Age Ranges** - Warns when age classifications overlap
3. **Invalid Ordering** - Checks display order consistency
4. **Negative Values** - Errors on negative weights, ages, or prices
5. **Impossible Ranges** - Errors when min > max

Example validation result:

```typescript
{
  isValid: false,
  errors: [
    {
      field: 'sizeClass.xxx.minWeightGrams',
      message: 'Minimum weight cannot be negative',
      severity: 'error',
      details: { value: -5 }
    }
  ],
  warnings: [
    {
      field: 'weightRanges',
      message: 'Overlapping weight ranges between "Pinky" and "Fuzzy"',
      severity: 'warning',
      details: { ... }
    }
  ]
}
```

## Migration Support

Existing ASF/Rat/Mouse data automatically converts into editable profiles:

```typescript
// On workspace initialization
const asfProfile = createSpeciesProfileFromBlueprint({
  workspaceId: currentWorkspace.id,
  blueprintId: 'starter_asf',
});

// This creates:
// - 1 WorkspaceSpeciesProfile (editable copy)
// - 4 SpeciesSizeClasses (Pinky, Fuzzy, Hopper, Adult)
// - 1 SpeciesOperationalSettings
```

## Integration Points

### With Lot System

Lots reference `sizeClassId` instead of hardcoded size names:

```typescript
interface Lot {
  // ... other fields
  speciesId: SpeciesId;
  sizeClassId?: string;  // Reference to workspace size class
}
```

### With Dashboard

Dashboards consume workspace-specific configurations:

```typescript
// Dashboard queries
const profiles = getSpeciesProfiles({ workspaceId });
const sizeClasses = getSizeClassesForSpecies({ workspaceId, speciesProfileId });

// Display workspace-specific classifications
sizeClasses.forEach(sc => {
  console.log(`${sc.name}: ${sc.minWeightGrams}-${sc.maxWeightGrams}g`);
});
```

### With AI Systems

AI receives workspace-specific context, NOT hardcoded assumptions:

```typescript
// AI prompt context
const aiContext = {
  speciesProfile: getSpeciesProfile(profileId),
  operationalSettings: getOperationalSettingsForSpecies(profileId),
  sizeClassifications: getSizeClassesForSpecies({ workspaceId, speciesProfileId }),
};

// AI uses workspace-specific terminology
// "Classify this 15g ASF" -> uses workspace's size classes
```

## Future Custom Species

Adding new species is straightforward:

```typescript
// 1. Create custom profile
const hamsterProfile = createCustomSpeciesProfile({
  workspaceId: 'ws_123',
  speciesId: 'mesocricetus_auratus',
  speciesName: 'Golden Hamster',
  operationalName: 'Hamster',
});

// 2. Add size classes
addSizeClass({
  workspaceId: 'ws_123',
  speciesProfileId: hamsterProfile.id,
  name: 'Baby',
  minWeightGrams: 2,
  maxWeightGrams: 30,
  // ...
});

// 3. Configure operational settings
// (settings created automatically, can be updated)
updateOperationalSettings(settingsId, {
  breedingCycleDays: 4,
  expectedWeaningAgeDays: 16,
  // ...
});
```

## Key Design Decisions

### 1. ID References, Not String Names

Operational entities reference `sizeClassId`, NOT size names as strings.

**Why?** Prevents data corruption if users rename classes.

```typescript
// ✅ CORRECT: Reference by ID
lot.sizeClassId = 'sc_abc123';

// ❌ WRONG: Reference by name
lot.sizeClass = 'Pinky'; // What if user renames it?
```

### 2. Workspace-Scoped

All configurations are scoped to `workspaceId`.

**Why?** Different bioterios have different operational needs.

### 3. Starter Blueprints Are Editable

Built-in species are templates, not immutable definitions.

**Why?** Flexibility for diverse operational requirements.

### 4. Validation at Configuration Time

Errors and warnings detected during configuration, not at runtime.

**Why?** Prevents invalid operational states.

## What This System Does NOT Do

This phase focuses ONLY on operational flexibility:

- ❌ Advanced genetics
- ❌ Feeding AI
- ❌ Environmental automation
- ❌ Predictive ML
- ❌ Additional blueprints/modules

## Next Steps

1. **Persistence Layer** - Connect to Supabase tables
2. **UI Components** - Species Profiles page, Size Class editor
3. **Migration** - Convert existing hardcoded data
4. **Integration** - Update lot/cage systems to use sizeClassId
5. **Dashboard** - Consume workspace-specific configurations
