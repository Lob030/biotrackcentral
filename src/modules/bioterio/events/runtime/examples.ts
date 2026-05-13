/**
 * Bioterio Operational Event Runtime - Examples and Usage
 * 
 * This file demonstrates how to use the event-driven operational system.
 * These examples show real-world scenarios for event creation and consumption.
 */

import {
  createOperationalEvent,
  createCorrectionEvent,
  createReversalEvent,
  getLotEvents,
  getCageEvents,
  getOperationalTimeline,
  getRecentActivity,
  getActivitySummary,
  eventToTimelineEntry,
} from './operations';
import type { EventActor, EventType, EventMetadata } from './types';

// ============================================================================
// EXAMPLE ACTORS
// ============================================================================

const userActor: EventActor = {
  type: 'user',
  id: 'user_123',
  name: 'Dr. Maria Garcia',
  role: 'Bioterio Manager',
};

const systemActor: EventActor = {
  type: 'system',
  id: 'system_scheduler',
  name: 'Automated System',
};

const aiActor: EventActor = {
  type: 'ai_agent',
  id: 'ai_optimizer_v1',
  name: 'AI Operations Assistant',
};

// ============================================================================
// EXAMPLE 1: Recording a Lot Creation Event
// ============================================================================

export function exampleLotCreation() {
  const lotId = 'lot_abc123';
  
  const event = createOperationalEvent({
    eventType: 'lot_created' as EventType,
    lotIds: [lotId],
    actor: userActor,
    metadata: {
      lotCode: 'ASF-001',
      speciesId: 'species_mouse',
      strain: 'C57BL/6',
      quantity: 10,
      sex: 'mixed',
      sourceType: 'internal_birth',
    },
  });
  
  console.log('Lot creation event:', event);
  return event;
}

// ============================================================================
// EXAMPLE 2: Recording a Cage Assignment Event
// ============================================================================

export function exampleCageAssignment() {
  const lotId = 'lot_abc123';
  const cageId = 'cage_r1_c01';
  
  const event = createOperationalEvent({
    eventType: 'lot_assigned_to_cage' as EventType,
    lotIds: [lotId],
    cageIds: [cageId],
    actor: userActor,
    metadata: {
      lotCode: 'ASF-001',
      cageCode: 'R1-C01',
      quantity: 10,
    },
  });
  
  console.log('Cage assignment event:', event);
  return event;
}

// ============================================================================
// EXAMPLE 3: Recording a Lot Movement Between Cages
// ============================================================================

export function exampleLotMovement() {
  const lotId = 'lot_abc123';
  const fromCageId = 'cage_r1_c01';
  const toCageId = 'cage_r1_c05';
  
  const event = createOperationalEvent({
    eventType: 'lot_moved_between_cages' as EventType,
    lotIds: [lotId],
    cageIds: [fromCageId, toCageId],
    actor: userActor,
    metadata: {
      lotCode: 'ASF-001',
      fromCageCode: 'R1-C01',
      toCageCode: 'R1-C05',
      reason: 'Relocating to larger cage',
      quantity: 10,
    },
  });
  
  console.log('Lot movement event:', event);
  return event;
}

// ============================================================================
// EXAMPLE 4: Recording Mortality
// ============================================================================

export function exampleMortality() {
  const lotId = 'lot_abc123';
  
  const event = createOperationalEvent({
    eventType: 'mortality_recorded' as EventType,
    lotIds: [lotId],
    actor: userActor,
    metadata: {
      lotCode: 'ASF-001',
      quantity: 2,
      previousQuantity: 10,
      newQuantity: 8,
      reason: 'Natural causes',
    },
  });
  
  console.log('Mortality event:', event);
  return event;
}

// ============================================================================
// EXAMPLE 5: Recording a Subdivision Event
// ============================================================================

export function exampleSubdivision() {
  const parentLotId = 'lot_abc123';
  const childLotId1 = 'lot_def456';
  const childLotId2 = 'lot_ghi789';
  
  // Record the subdivision of the parent lot
  const parentEvent = createOperationalEvent({
    eventType: 'lot_subdivided' as EventType,
    lotIds: [parentLotId, childLotId1, childLotId2],
    actor: userActor,
    metadata: {
      lotCode: 'ASF-001',
      newQuantity: 2, // Number of child lots created
    },
  });
  
  // Record the creation of each child lot
  const childEvent1 = createOperationalEvent({
    eventType: 'subdivision_child_created' as EventType,
    lotIds: [childLotId1],
    actor: userActor,
    metadata: {
      lotCode: 'ASF-001-M',
      parentLotCode: 'ASF-001',
      quantity: 5,
      sex: 'male',
    },
    references: [{
      eventId: parentEvent.id,
      relationship: 'parent',
      reason: 'Child lot created from subdivision',
    }],
  });
  
  const childEvent2 = createOperationalEvent({
    eventType: 'subdivision_child_created' as EventType,
    lotIds: [childLotId2],
    actor: userActor,
    metadata: {
      lotCode: 'ASF-001-F',
      parentLotCode: 'ASF-001',
      quantity: 5,
      sex: 'female',
    },
    references: [{
      eventId: parentEvent.id,
      relationship: 'parent',
      reason: 'Child lot created from subdivision',
    }],
  });
  
  console.log('Subdivision events:', { parentEvent, childEvent1, childEvent2 });
  return { parentEvent, childEvent1, childEvent2 };
}

// ============================================================================
// EXAMPLE 6: Recording a Breeding Event (Litter Born)
// ============================================================================

export function exampleBreeding() {
  const breedingLotId = 'lot_breed001';
  
  const event = createOperationalEvent({
    eventType: 'litter_born' as EventType,
    lotIds: [breedingLotId],
    actor: userActor,
    metadata: {
      lotCode: 'BREED-001',
      quantity: 8, // Number of pups born
      strain: 'C57BL/6',
      birthDate: new Date().toISOString(),
    },
  });
  
  console.log('Breeding event:', event);
  return event;
}

// ============================================================================
// EXAMPLE 7: Environmental Alert
// ============================================================================

export function exampleEnvironmentalAlert() {
  const cageId = 'cage_r1_c01';
  
  const event = createOperationalEvent({
    eventType: 'environmental_alert' as EventType,
    cageIds: [cageId],
    actor: systemActor,
    metadata: {
      cageCode: 'R1-C01',
      temperature: 32.5,
      humidity: 75,
      threshold: 28,
      alertType: 'high_temperature',
    },
  });
  
  console.log('Environmental alert:', event);
  return event;
}

// ============================================================================
// EXAMPLE 8: Correction Event (Fixing Bad Data)
// ============================================================================

export function exampleCorrection() {
  // Assume we previously recorded wrong mortality count
  const originalEventId = 'event_wrong_mortality';
  
  const correctionEvent = createCorrectionEvent({
    originalEventId,
    reason: 'Incorrect mortality count was recorded',
    correctedData: {
      quantity: 1, // Correct count
      previousQuantity: 10,
      newQuantity: 9,
    },
    actor: userActor,
    relatedLotIds: ['lot_abc123'],
  });
  
  console.log('Correction event:', correctionEvent);
  return correctionEvent;
}

// ============================================================================
// EXAMPLE 9: Reversal Event (Undoing an Action)
// ============================================================================

export function exampleReversal() {
  // Assume we need to reverse an accidental cage assignment
  const originalEventId = 'event_accidental_assignment';
  
  const reversalEvent = createReversalEvent({
    originalEventId,
    reason: 'Accidental assignment - lot was not ready for transfer',
    reversalAction: 'Removed lot from cage and returned to original location',
    actor: userActor,
    relatedLotIds: ['lot_xyz999'],
    relatedCageIds: ['cage_r1_c01'],
  });
  
  console.log('Reversal event:', reversalEvent);
  return reversalEvent;
}

// ============================================================================
// EXAMPLE 10: Querying Events for a Lot
// ============================================================================

export function exampleLotHistory() {
  const lotId = 'lot_abc123';
  
  // Get all events for this lot
  const allEvents = getLotEvents(lotId);
  
  // Get only mortality events
  const mortalityEvents = getLotEvents(lotId, {
    eventType: ['mortality_recorded'],
  });
  
  // Get events from last week
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentEvents = getLotEvents(lotId, {
    startTime: oneWeekAgo,
    sortOrder: 'desc',
  });
  
  console.log('Lot history:', { allEvents, mortalityEvents, recentEvents });
  return { allEvents, mortalityEvents, recentEvents };
}

// ============================================================================
// EXAMPLE 11: Querying Events for a Cage
// ============================================================================

export function exampleCageHistory() {
  const cageId = 'cage_r1_c01';
  
  // Get all events for this cage
  const allEvents = getCageEvents(cageId);
  
  // Get only movement events
  const movementEvents = getCageEvents(cageId, {
    category: ['cage_movement'],
  });
  
  console.log('Cage history:', { allEvents, movementEvents });
  return { allEvents, movementEvents };
}

// ============================================================================
// EXAMPLE 12: Getting Operational Timeline
// ============================================================================

export function exampleOperationalTimeline() {
  // Get timeline for multiple lots
  const lotIds = ['lot_abc123', 'lot_def456'];
  
  const timeline = getOperationalTimeline({
    lotIds,
    startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    limit: 100,
  });
  
  // Convert to timeline entries for visualization
  const timelineEntries = timeline.map(eventToTimelineEntry);
  
  console.log('Operational timeline:', timelineEntries);
  return timelineEntries;
}

// ============================================================================
// EXAMPLE 13: Getting Recent Activity Feed
// ============================================================================

export function exampleRecentActivity() {
  // Get last 50 events across the system
  const recentActivity = getRecentActivity(50);
  
  // Filter to only warnings and above
  const alerts = recentActivity.filter(e => 
    e.severity === 'warning' || e.severity === 'error' || e.severity === 'critical'
  );
  
  console.log('Recent activity:', { all: recentActivity, alerts });
  return { all: recentActivity, alerts };
}

// ============================================================================
// EXAMPLE 14: Getting Activity Summary for Analytics
// ============================================================================

export function exampleActivitySummary() {
  // Get summary for last month
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const now = new Date();
  
  const summary = getActivitySummary(oneMonthAgo, now);
  
  console.log('Activity summary:', summary);
  console.log(`Total events: ${summary.totalEvents}`);
  console.log(`Events by category:`, summary.eventsByCategory);
  console.log(`Affected lots: ${summary.affectedLots}`);
  console.log(`Affected cages: ${summary.affectedCages}`);
  console.log(`Alerts: ${summary.alertsCount}`);
  console.log(`Corrections: ${summary.correctionsCount}`);
  
  return summary;
}

// ============================================================================
// EXAMPLE 15: AI Agent Recording Optimization Decision
// ============================================================================

export function exampleAIOptimization() {
  const cageId = 'cage_r1_c01';
  const lotId = 'lot_abc123';
  
  // AI recommends cage relocation based on optimization algorithm
  const event = createOperationalEvent({
    eventType: 'lot_moved_between_cages' as EventType,
    lotIds: [lotId],
    cageIds: ['cage_r1_c01', 'cage_r2_c10'],
    actor: aiActor,
    metadata: {
      lotCode: 'ASF-001',
      fromCageCode: 'R1-C01',
      toCageCode: 'R2-C10',
      optimizationReason: 'Space utilization optimization',
      algorithmVersion: 'v1.2.0',
      confidenceScore: 0.95,
      alternativeOptions: 3,
    },
  });
  
  console.log('AI optimization event:', event);
  return event;
}

// ============================================================================
// EXAMPLE 16: Quarantine Workflow Events
// ============================================================================

export function exampleQuarantineWorkflow() {
  const cageId = 'cage_quarantine_01';
  const lotId = 'lot_quarantine_001';
  
  // Initiate quarantine
  const quarantineStart = createOperationalEvent({
    eventType: 'quarantine_initiated' as EventType,
    lotIds: [lotId],
    cageIds: [cageId],
    actor: userActor,
    metadata: {
      lotCode: 'QUAR-001',
      cageCode: 'QUAR-01',
      reason: 'New arrival - standard quarantine protocol',
      expectedDuration: '14 days',
    },
  });
  
  // Quarantine alert (e.g., symptoms observed)
  const quarantineAlert = createOperationalEvent({
    eventType: 'quarantine_alert' as EventType,
    lotIds: [lotId],
    cageIds: [cageId],
    actor: userActor,
    metadata: {
      alertType: 'symptoms_observed',
      symptoms: 'lethargy, reduced appetite',
      severity: 'moderate',
    },
  });
  
  // Release from quarantine
  const quarantineRelease = createOperationalEvent({
    eventType: 'quarantine_released' as EventType,
    lotIds: [lotId],
    cageIds: [cageId],
    actor: userActor,
    metadata: {
      reason: 'Quarantine period completed - no issues detected',
      finalStatus: 'healthy',
    },
    references: [{
      eventId: quarantineStart.id,
      relationship: 'related',
      reason: 'Closing quarantine initiated by this event',
    }],
  });
  
  console.log('Quarantine workflow:', { quarantineStart, quarantineAlert, quarantineRelease });
  return { quarantineStart, quarantineAlert, quarantineRelease };
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

export function runAllExamples() {
  console.log('=== Bioterio Operational Event Runtime Examples ===\n');
  
  exampleLotCreation();
  exampleCageAssignment();
  exampleLotMovement();
  exampleMortality();
  exampleSubdivision();
  exampleBreeding();
  exampleEnvironmentalAlert();
  exampleCorrection();
  exampleReversal();
  exampleLotHistory();
  exampleCageHistory();
  exampleOperationalTimeline();
  exampleRecentActivity();
  exampleActivitySummary();
  exampleAIOptimization();
  exampleQuarantineWorkflow();
  
  console.log('\n=== All examples completed ===');
}
