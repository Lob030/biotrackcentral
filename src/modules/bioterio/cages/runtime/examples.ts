/**
 * Bioterio Cage Runtime - Usage Examples
 * 
 * Demonstrates common workflows and patterns for the cage occupancy system.
 */

import {
  createCage,
  assignLotToCage,
  moveLot,
  removeLotFromCage,
  getCageOccupancy,
  getAvailableCages,
  getLotsInCage,
  getCageMovementHistory,
  queryCages,
  startCleaning,
  completeCleaning,
  getFacilityStatistics,
  relocateSubdividedLots,
} from './operations';

import { createLot, subdivideLot } from '../../lots/runtime/operations';

// ============================================================================
// EXAMPLE 1: Creating Cages and Setting Up Facility
// ============================================================================

export function example1_CreateCages() {
  console.log('\n=== Example 1: Creating Cages ===\n');

  // Create a standard mouse cage in Room 1
  const cage1 = createCage({
    roomId: 'R1',
    zoneId: 'Rack-A',
    rackPosition: 'A1',
    capacity: {
      maxAnimals: 50,
      maxLots: 2,
      speciesCompatibility: ['mouse'],
      volumeLiters: 20,
      floorAreaCm2: 800,
    },
    tags: ['standard', 'breeding'],
  });

  console.log(`Created cage: ${cage1.code} (${cage1.id})`);
  console.log(`  Room: ${cage1.roomId}, Position: ${cage1.rackPosition}`);
  console.log(`  Capacity: ${cage1.capacity.maxAnimals} animals`);
  console.log(`  Status: ${cage1.status}`);

  // Create another cage in the same room
  const cage2 = createCage({
    roomId: 'R1',
    zoneId: 'Rack-A',
    rackPosition: 'A2',
    capacity: {
      maxAnimals: 50,
      speciesCompatibility: ['mouse'],
    },
  });

  console.log(`Created cage: ${cage2.code}`);

  // Create a larger rat cage
  const ratCage = createCage({
    roomId: 'R2',
    zoneId: 'Rack-B',
    rackPosition: 'B1',
    capacity: {
      maxAnimals: 20,
      speciesCompatibility: ['rat'],
      volumeLiters: 40,
    },
    tags: ['rat', 'large'],
  });

  console.log(`Created rat cage: ${ratCage.code}`);

  return { cage1, cage2, ratCage };
}

// ============================================================================
// EXAMPLE 2: Assigning Lots to Cages
// ============================================================================

export function example2_AssignLotsToCages() {
  console.log('\n=== Example 2: Assigning Lots to Cages ===\n');

  // First, create some cages
  const { cage1 } = example1_CreateCages();

  // Create a lot of mice
  const lot = createLot({
    species: 'mouse',
    strain: 'C57BL/6',
    sex: 'mixed',
    quantity: 25,
    sourceType: 'internal_birth',
    birthDate: new Date('2025-01-01'),
  });

  console.log(`Created lot: ${lot.code} with ${lot.currentQuantity} animals`);

  // Assign the lot to the cage
  const result = assignLotToCage({
    lotId: lot.id,
    cageId: cage1.id,
    notes: 'Initial placement after weaning',
    performedBy: 'user-123',
  });

  console.log(`Assigned lot ${lot.code} to cage ${result.cage.code}`);
  console.log(`  Assignment date: ${result.assignment.assignedDate.toISOString()}`);
  console.log(`  Movement type: ${result.movement.movementType}`);
  console.log(`  Cage status is now: ${result.cage.status}`);

  // Check occupancy
  const occupancy = getCageOccupancy(cage1.id);
  console.log(`\nCage occupancy:`);
  console.log(`  Total animals: ${occupancy.totalAnimals}`);
  console.log(`  Total lots: ${occupancy.totalLots}`);
  console.log(`  Utilization: ${occupancy.utilizationPercent.toFixed(1)}%`);
  console.log(`  Over capacity: ${occupancy.isOverCapacity}`);

  return { lot, cage1, result };
}

// ============================================================================
// EXAMPLE 3: Moving Lots Between Cages
// ============================================================================

export function example3_MoveLotsBetweenCages() {
  console.log('\n=== Example 3: Moving Lots Between Cages ===\n');

  // Set up initial state
  const { lot, cage1 } = example2_AssignLotsToCages();

  // Create a second cage
  const cage2 = createCage({
    roomId: 'R1',
    zoneId: 'Rack-A',
    rackPosition: 'A2',
    capacity: {
      maxAnimals: 50,
      speciesCompatibility: ['mouse'],
    },
  });

  console.log(`\nMoving lot ${lot.code} from ${cage1.code} to ${cage2.code}...`);

  // Move the lot
  const moveResult = moveLot({
    lotId: lot.id,
    fromCageId: cage1.id,
    toCageId: cage2.id,
    reason: 'Relocating for breeding program',
    performedBy: 'user-123',
  });

  console.log(`Moved successfully!`);
  console.log(`  From: ${moveResult.fromCage.code} (status: ${moveResult.fromCage.status})`);
  console.log(`  To: ${moveResult.toCage.code} (status: ${moveResult.toCage.status})`);
  console.log(`  Movement type: ${moveResult.movement.movementType}`);

  // Verify source cage is now available
  const sourceOccupancy = getCageOccupancy(cage1.id);
  console.log(`\nSource cage (${cage1.code}) occupancy:`);
  console.log(`  Total lots: ${sourceOccupancy.totalLots}`);
  console.log(`  Status: ${sourceOccupancy.totalLots === 0 ? 'available' : 'occupied'}`);

  // Get movement history
  const history = getCageMovementHistory(cage2.id);
  console.log(`\nDestination cage movement history:`);
  console.log(`  Total movements in: ${history.totalMovementsIn}`);
  console.log(`  Total movements out: ${history.totalMovementsOut}`);
  console.log(`  Current assignments: ${history.currentAssignments.length}`);

  return { moveResult };
}

// ============================================================================
// EXAMPLE 4: Subdivision and Relocation Workflow
// ============================================================================

export function example4_SubdivisionAndRelocation() {
  console.log('\n=== Example 4: Subdivision and Relocation Workflow ===\n');

  // Create cages for subdivided lots
  const maleCage = createCage({
    roomId: 'R1',
    zoneId: 'Rack-A',
    rackPosition: 'A3',
    capacity: { maxAnimals: 30, speciesCompatibility: ['mouse'] },
  });

  const femaleCage = createCage({
    roomId: 'R1',
    zoneId: 'Rack-A',
    rackPosition: 'A4',
    capacity: { maxAnimals: 30, speciesCompatibility: ['mouse'] },
  });

  console.log(`Created cages for subdivision: ${maleCage.code}, ${femaleCage.code}`);

  // Create a mixed lot
  const parentLot = createLot({
    species: 'mouse',
    strain: 'BALB/c',
    sex: 'mixed',
    quantity: 40,
    sourceType: 'internal_birth',
  });

  console.log(`Created parent lot: ${parentLot.code} (${parentLot.currentQuantity} animals, mixed)`);

  // Assign parent lot to a cage
  const parentCage = createCage({
    roomId: 'R1',
    zoneId: 'Rack-A',
    rackPosition: 'A1',
    capacity: { maxAnimals: 50, speciesCompatibility: ['mouse'] },
  });

  assignLotToCage({
    lotId: parentLot.id,
    cageId: parentCage.id,
  });

  console.log(`Assigned parent lot to cage ${parentCage.code}`);

  // Subdivide by sex at weaning
  const subdivisionResult = subdivideLot({
    lotId: parentLot.id,
    subdivisions: [
      { sex: 'male', quantity: 20, codeSuffix: '-M' },
      { sex: 'female', quantity: 20, codeSuffix: '-F' },
    ],
  });

  console.log(`\nSubdivided ${parentLot.code}:`);
  console.log(`  Parent status: ${subdivisionResult.parentLot.status}`);
  console.log(`  Child lots created: ${subdivisionResult.childLots.length}`);
  
  for (const child of subdivisionResult.childLots) {
    console.log(`    - ${child.code}: ${child.sex}, ${child.currentQuantity} animals`);
  }

  // Relocate child lots to separate cages
  console.log(`\nRelocating subdivided lots to separate cages...`);
  
  const relocationResults = relocateSubdividedLots({
    parentLotId: parentLot.id,
    childLotIds: subdivisionResult.childLots.map(c => c.id),
    targetCageAssignments: [
      { 
        lotId: subdivisionResult.childLots[0].id, 
        cageId: maleCage.id,
        notes: 'Male lot relocated'
      },
      { 
        lotId: subdivisionResult.childLots[1].id, 
        cageId: femaleCage.id,
        notes: 'Female lot relocated'
      },
    ],
    performedBy: 'user-123',
  });

  console.log(`Relocation results:`);
  for (const result of relocationResults) {
    console.log(`  ${result.lotId}: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.fromCageId} -> ${result.toCageId}`);
    if (result.error) {
      console.log(`    Error: ${result.error}`);
    }
  }

  // Verify final locations
  const maleLots = getLotsInCage(maleCage.id);
  const femaleLots = getLotsInCage(femaleCage.id);

  console.log(`\nFinal cage assignments:`);
  console.log(`  ${maleCage.code}: ${maleLots.length} lot(s)`);
  console.log(`  ${femaleCage.code}: ${femaleLots.length} lot(s)`);

  return { subdivisionResult, relocationResults };
}

// ============================================================================
// EXAMPLE 5: Cleaning and Maintenance Workflows
// ============================================================================

export function example5_CleaningAndMaintenance() {
  console.log('\n=== Example 5: Cleaning and Maintenance Workflows ===\n');

  // Create and empty a cage
  const cage = createCage({
    roomId: 'R1',
    rackPosition: 'A5',
    capacity: { maxAnimals: 50 },
  });

  console.log(`Created cage: ${cage.code} (status: ${cage.status})`);

  // Start cleaning
  const cleaningStarted = startCleaning(cage.id, 'cleaning-staff-1');
  console.log(`Started cleaning: ${cleaningStarted?.code} (status: ${cleaningStarted?.status})`);

  // Cannot assign lot during cleaning
  try {
    const testLot = createLot({
      species: 'mouse',
      sex: 'mixed',
      quantity: 10,
      sourceType: 'internal_birth',
    });
    
    assignLotToCage({
      lotId: testLot.id,
      cageId: cage.id,
    });
  } catch (error) {
    console.log(`Expected error: ${(error as Error).message}`);
  }

  // Complete cleaning
  const cleaningCompleted = completeCleaning(cage.id, 'cleaning-staff-1');
  console.log(`Completed cleaning: ${cleaningCompleted?.code} (status: ${cleaningCompleted?.status})`);
  console.log(`Last cleaned: ${cleaningCompleted?.lastCleanedAt?.toISOString()}`);

  // Now cage is available again
  console.log(`Cage is now available for assignment`);

  return { cage };
}

// ============================================================================
// EXAMPLE 6: Querying and Statistics
// ============================================================================

export function example6_QueryingAndStatistics() {
  console.log('\n=== Example 6: Querying and Statistics ===\n');

  // Set up some data
  example2_AssignLotsToCages();
  example4_SubdivisionAndRelocation();

  // Query available cages
  const available = getAvailableCages({ roomId: 'R1' });
  console.log(`Available cages in R1: ${available.length}`);
  for (const cage of available) {
    console.log(`  - ${cage.code} (${cage.rackPosition})`);
  }

  // Query occupied cages
  const occupied = queryCages({ status: 'occupied', roomId: 'R1' });
  console.log(`\nOccupied cages in R1: ${occupied.length}`);

  // Get facility statistics
  const stats = getFacilityStatistics();
  console.log(`\n=== Facility Statistics ===`);
  console.log(`Total cages: ${stats.totalCages}`);
  console.log(`Active cages: ${stats.activeCages}`);
  console.log(`Available: ${stats.availableCages}`);
  console.log(`Occupied: ${stats.occupiedCages}`);
  console.log(`Total animals: ${stats.totalAnimals}`);
  console.log(`Total lots: ${stats.totalLots}`);
  console.log(`Average utilization: ${stats.averageUtilization.toFixed(1)}%`);
  console.log(`Over-capacity cages: ${stats.overCapacityCages}`);

  console.log(`\nBy Room:`);
  for (const [roomId, data] of Object.entries(stats.byRoom)) {
    console.log(`  ${roomId}: ${data.cages} cages, ${data.animals} animals, ${data.utilization.toFixed(1)}% utilized`);
  }

  return { stats };
}

// ============================================================================
// EXAMPLE 7: Removing Lots (Sale/Transfer Out)
// ============================================================================

export function example7_RemoveLots() {
  console.log('\n=== Example 7: Removing Lots (Sale/Transfer Out) ===\n');

  const { lot, cage1 } = example2_AssignLotsToCages();

  console.log(`\nRemoving lot ${lot.code} from cage ${cage1.code} (sold)...`);

  const result = removeLotFromCage({
    lotId: lot.id,
    cageId: cage1.id,
    reason: 'Sold to research facility',
    performedBy: 'sales-team',
  });

  console.log(`Lot removed successfully`);
  console.log(`  Cage ${result.cage.code} status: ${result.cage.status}`);
  console.log(`  Movement type: ${result.movement.movementType}`);

  // Verify cage is now available
  const occupancy = getCageOccupancy(cage1.id);
  console.log(`\nCage occupancy after removal:`);
  console.log(`  Total lots: ${occupancy.totalLots}`);
  console.log(`  Total animals: ${occupancy.totalAnimals}`);

  return { result };
}

// ============================================================================
// Run All Examples
// ============================================================================

export function runAllExamples() {
  console.log('='.repeat(60));
  console.log('BIOTERIO CAGE RUNTIME - USAGE EXAMPLES');
  console.log('='.repeat(60));

  example1_CreateCages();
  example2_AssignLotsToCages();
  example3_MoveLotsBetweenCages();
  example4_SubdivisionAndRelocation();
  example5_CleaningAndMaintenance();
  example6_QueryingAndStatistics();
  example7_RemoveLots();

  console.log('\n' + '='.repeat(60));
  console.log('ALL EXAMPLES COMPLETED');
  console.log('='.repeat(60) + '\n');
}
