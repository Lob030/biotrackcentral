/**
 * Bioterio Lot Runtime - Usage Examples
 * 
 * This file demonstrates common operations with the lot-centric runtime.
 * These examples show real-world bioterio workflows.
 */

import {
  createLot,
  subdivideLot,
  getLotLineage,
  getLotAncestors,
  getLotDescendants,
  getLotLifecycle,
  getActiveLots,
  queryLots,
  updateLotStatus,
  addAnimalsToLot,
  removeAnimalsFromLot,
  getLotSummary,
  getLotStatistics,
} from './operations';
import type { CreateLotOptions, SubdivideLotOptions } from './types';

// ============================================================================
// EXAMPLE 1: Creating Lots from Different Sources
// ============================================================================

export function example_CreateLotsFromDifferentSources() {
  console.log('\n=== Example 1: Creating Lots from Different Sources ===\n');

  // Scenario A: Internal birth (new litter from breeding)
  const internalBirthOptions: CreateLotOptions = {
    species: 'mouse',
    strain: 'C57BL/6',
    sex: 'mixed',
    quantity: 8, // Typical litter size
    sourceType: 'internal_birth',
    birthDate: new Date(),
    location: 'Room-A-Cage-101',
    notes: 'Litter from breeding pair BP-042',
  };

  const newbornLot = createLot(internalBirthOptions);
  console.log('Created newborn lot:', newbornLot.code);
  console.log('  Species:', newbornLot.species);
  console.log('  Strain:', newbornLot.strain);
  console.log('  Quantity:', newbornLot.currentQuantity);
  console.log('  Source:', newbornLot.sourceType);
  console.log('  Generation:', newbornLot.lineage.generationDepth);

  // Scenario B: External purchase from supplier
  const purchaseOptions: CreateLotOptions = {
    species: 'mouse',
    strain: 'BALB/c',
    sex: 'female',
    quantity: 20,
    sourceType: 'external_purchase',
    acquisitionDate: new Date(),
    supplierName: 'Jackson Laboratory',
    location: 'Quarantine-Room-1',
    tags: ['quarantine', 'new-arrival'],
  };

  const purchasedLot = createLot(purchaseOptions);
  console.log('\nCreated purchased lot:', purchasedLot.code);
  console.log('  Supplier:', purchasedLot.supplierName);
  console.log('  Tags:', purchasedLot.tags);

  // Scenario C: Transfer from another facility
  const transferOptions: CreateLotOptions = {
    species: 'rat',
    strain: 'Wistar',
    sex: 'male',
    quantity: 10,
    sourceType: 'transfer',
    originLotId: undefined, // In real scenario, would reference external lot
    acquisitionDate: new Date(),
    notes: 'Transfer from Satellite Facility B',
  };

  const transferredLot = createLot(transferOptions);
  console.log('\nCreated transferred lot:', transferredLot.code);
  console.log('  Notes:', transferredLot.notes);

  return { newbornLot, purchasedLot, transferredLot };
}

// ============================================================================
// EXAMPLE 2: Sex Separation (Most Common Subdivision)
// ============================================================================

export function example_SexSeparation() {
  console.log('\n=== Example 2: Sex Separation Subdivision ===\n');

  // Start with a mixed lot at weaning age
  const mixedLotOptions: CreateLotOptions = {
    species: 'mouse',
    strain: 'ASF',
    sex: 'mixed',
    quantity: 20,
    sourceType: 'internal_birth',
    birthDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 21 days ago
    location: 'Weaning-Room-Cage-5',
  };

  const mixedLot = createLot(mixedLotOptions);
  console.log('Original mixed lot:', mixedLot.code);
  console.log('  Status:', mixedLot.status);
  console.log('  Sex:', mixedLot.sex);
  console.log('  Quantity:', mixedLot.currentQuantity);

  // Subdivide by sex at weaning
  const subdivisionOptions: SubdivideLotOptions = {
    lotId: mixedLot.id,
    subdivisions: [
      {
        sex: 'male',
        quantity: 10,
        codeSuffix: '-M',
        notes: 'Male group for growth study',
      },
      {
        sex: 'female',
        quantity: 10,
        codeSuffix: '-F',
        notes: 'Female group for breeding prep',
      },
    ],
  };

  const result = subdivideLot(subdivisionOptions);
  
  console.log('\nAfter subdivision:');
  console.log('  Parent lot status:', result.parentLot.status);
  console.log('  Parent remaining quantity:', result.parentLot.currentQuantity);
  
  console.log('\n  Child lots created:');
  for (const child of result.childLots) {
    console.log(`    ${child.code}:`);
    console.log(`      Sex: ${child.sex}`);
    console.log(`      Quantity: ${child.currentQuantity}`);
    console.log(`      Origin: ${child.originLotId === mixedLot.id ? 'Preserved ✓' : 'ERROR'}`);
    console.log(`      Generation: ${child.lineage.generationDepth}`);
  }

  // Verify lineage preservation
  const maleChild = result.childLots.find((c) => c.sex === 'male');
  if (maleChild) {
    const lineage = getLotLineage(maleChild.id);
    console.log('\n  Male lot lineage:');
    console.log('    Origin Lot ID:', lineage?.originLotId);
    console.log('    Ancestors:', lineage?.ancestors);
    console.log('    Source Type:', lineage?.sourceType);
  }

  return result;
}

// ============================================================================
// EXAMPLE 3: Multi-Generation Lineage Tracking
// ============================================================================

export function example_MultiGenerationLineage() {
  console.log('\n=== Example 3: Multi-Generation Lineage Tracking ===\n');

  // Generation 0: Founding breeding pair
  const foundingLot = createLot({
    species: 'mouse',
    strain: 'KO-TEST',
    sex: 'mixed',
    quantity: 2,
    sourceType: 'external_purchase',
    supplierName: 'Research Supplier',
  });
  console.log('Generation 0 (Founders):', foundingLot.code);

  // Generation 1: First offspring
  const gen1Lot = createLot({
    species: 'mouse',
    strain: 'KO-TEST',
    sex: 'mixed',
    quantity: 6,
    sourceType: 'internal_birth',
    originLotId: foundingLot.id,
    birthDate: new Date(),
  });
  console.log('Generation 1 (Offspring):', gen1Lot.code);

  // Verify ancestry
  const gen1Ancestors = getLotAncestors(gen1Lot.id);
  console.log('  Gen 1 ancestors count:', gen1Ancestors.length);
  console.log('  Gen 1 generation depth:', gen1Lot.lineage.generationDepth);

  // Generation 2: Grand-offspring (subdivided)
  const gen2Result = subdivideLot({
    lotId: gen1Lot.id,
    subdivisions: [
      { sex: 'male', quantity: 3, codeSuffix: '-M' },
      { sex: 'female', quantity: 3, codeSuffix: '-F' },
    ],
  });

  const gen2Male = gen2Result.childLots[0];
  console.log('Generation 2 (Grand-offspring):', gen2Male.code);

  const gen2Ancestors = getLotAncestors(gen2Male.id);
  console.log('  Gen 2 ancestors count:', gen2Ancestors.length);
  console.log('  Gen 2 ancestor codes:', gen2Ancestors.map((a) => a.code));
  console.log('  Gen 2 generation depth:', gen2Male.lineage.generationDepth);

  // Get all descendants of founding lot
  const descendants = getLotDescendants(foundingLot.id);
  console.log('\n  Founding lot descendants:', descendants.length);
  console.log('  Descendant codes:', descendants.map((d) => d.code));

  return { foundingLot, gen1Lot, gen2Male, descendants };
}

// ============================================================================
// EXAMPLE 4: Lifecycle Event Tracking
// ============================================================================

export function example_LifecycleEvents() {
  console.log('\n=== Example 4: Lifecycle Event Tracking ===\n');

  // Create a lot
  const lot = createLot({
    species: 'mouse',
    strain: 'CD-1',
    sex: 'female',
    quantity: 15,
    sourceType: 'internal_birth',
  });

  console.log('Initial lifecycle events:');
  let events = getLotLifecycle(lot.id);
  events.forEach((e) => {
    console.log(`  - ${e.eventType}: ${e.reason}`);
  });

  // Add animals (from another source)
  addAnimalsToLot(lot.id, 5, 'Added from weaning batch');
  console.log('\nAfter adding 5 animals:');
  events = getLotLifecycle(lot.id);
  console.log(`  Total events: ${events.length}`);
  console.log(`  Latest: ${events[events.length - 1].eventType}`);

  // Remove animals (mortality)
  removeAnimalsFromLot(lot.id, 2, 'Unknown cause', true);
  console.log('\nAfter mortality event (2 animals):');
  events = getLotLifecycle(lot.id);
  const mortalityEvent = events.find((e) => e.eventType === 'mortality');
  console.log(`  Mortality recorded: ${mortalityEvent ? 'Yes ✓' : 'No'}`);
  console.log(`  Current quantity: ${lot.currentQuantity}`);

  // Change status (sell some animals)
  updateLotStatus(lot.id, 'sold', 'Sold to research lab');
  console.log('\nAfter selling lot:');
  events = getLotLifecycle(lot.id);
  console.log(`  Final status event: ${events[events.length - 1].eventType}`);

  return { lot, events };
}

// ============================================================================
// EXAMPLE 5: Query and Filter Operations
// ============================================================================

export function example_QueryAndFilter() {
  console.log('\n=== Example 5: Query and Filter Operations ===\n');

  // Create various lots for demonstration
  createLot({
    species: 'mouse',
    strain: 'C57BL/6',
    sex: 'male',
    quantity: 10,
    sourceType: 'internal_birth',
  });

  createLot({
    species: 'mouse',
    strain: 'C57BL/6',
    sex: 'female',
    quantity: 12,
    sourceType: 'internal_birth',
  });

  createLot({
    species: 'rat',
    strain: 'Wistar',
    sex: 'mixed',
    quantity: 8,
    sourceType: 'external_purchase',
  });

  // Query: All active lots
  const activeLots = getActiveLots();
  console.log('Active lots:', activeLots.length);

  // Query: Filter by species
  const mouseLots = queryLots({ species: 'mouse' });
  console.log('Mouse lots:', mouseLots.length);

  // Query: Filter by sex
  const femaleLots = queryLots({ sex: 'female' });
  console.log('Female lots:', femaleLots.length);

  // Query: Multiple filters
  const activeFemaleMice = queryLots({
    species: 'mouse',
    sex: 'female',
    status: 'active',
  });
  console.log('Active female mouse lots:', activeFemaleMice.length);

  // Query: Exclude subdivided lots
  const nonSubdivided = queryLots({ includeSubdivided: false });
  console.log('Non-subdivided lots:', nonSubdivided.length);

  return { activeLots, mouseLots, femaleLots };
}

// ============================================================================
// EXAMPLE 6: Statistics and Reporting
// ============================================================================

export function example_Statistics() {
  console.log('\n=== Example 6: Statistics and Reporting ===\n');

  // Ensure we have some data
  createLot({
    species: 'mouse',
    strain: 'Test-Strain',
    sex: 'mixed',
    quantity: 20,
    sourceType: 'internal_birth',
  });

  // Get statistics
  const stats = getLotStatistics();

  console.log('Population Statistics:');
  console.log('  Total lots (all time):', stats.totalLots);
  console.log('  Active lots:', stats.activeLots);
  console.log('  Total animals (active):', stats.totalAnimals);

  console.log('\n  By Species:');
  for (const [species, count] of Object.entries(stats.bySpecies)) {
    console.log(`    ${species}: ${count} animals`);
  }

  console.log('\n  By Status:');
  for (const [status, count] of Object.entries(stats.byStatus)) {
    console.log(`    ${status}: ${count} lots`);
  }

  // Get individual lot summary
  const activeLots = getActiveLots();
  if (activeLots.length > 0) {
    const summary = getLotSummary(activeLots[0].id);
    console.log('\n  Sample Lot Summary:');
    console.log('    Code:', summary?.code);
    console.log('    Species:', summary?.species);
    console.log('    Sex:', summary?.sex);
    console.log('    Quantity:', summary?.currentQuantity);
    console.log('    Status:', summary?.status);
  }

  return stats;
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

/**
 * Run all examples to demonstrate the lot runtime capabilities
 */
export function runAllExamples(): void {
  console.log('\n' + '='.repeat(70));
  console.log('BIOTERIO LOT RUNTIME - USAGE DEMONSTRATION');
  console.log('='.repeat(70));

  example_CreateLotsFromDifferentSources();
  example_SexSeparation();
  example_MultiGenerationLineage();
  example_LifecycleEvents();
  example_QueryAndFilter();
  example_Statistics();

  console.log('\n' + '='.repeat(70));
  console.log('END OF DEMONSTRATION');
  console.log('='.repeat(70) + '\n');
}

// Auto-run when this module is imported (for demonstration)
if (typeof window !== 'undefined') {
  // Uncomment to auto-run in browser:
  // runAllExamples();
}
