/**
 * Bioterio Operational Event Runtime - Core Operations
 * 
 * Implements the fundamental event-driven operational system for the bioterio.
 * This is the operational foundation for immutable event history and traceability.
 * 
 * CRITICAL PRINCIPLES:
 * - Events are IMMUTABLE (never overwritten)
 * - Corrections generate correction/reversal events, NOT mutations
 * - Occupancy and lifecycle systems derive state from event history
 * - Events become the operational source of truth
 * 
 * FUTURE SUPPORT:
 * - Analytics consumption
 * - AI operational assistant
 * - Anomaly detection
 * - Audit history
 * - Activity feeds
 * - Operational replay
 * - Timeline visualization
 */

import type {
  OperationalEvent,
  EventType,
  EventCategory,
  EventActor,
  EventContext,
  EventMetadata,
  EventReference,
  EventSeverity,
  EventQueryFilters,
  EventTimelineEntry,
  ActivitySummary,
  EventStreamPosition,
  CorrectionPayload,
  ReversalPayload,
} from './types';

// Import cage and lot types for integration
import type { CageMovement } from '../../cages/runtime/types';
import type { LotLifecycleEvent } from '../../lots/runtime/types';

/**
 * Map event type to category
 */
function getEventCategory(eventType: EventType): EventCategory {
  const categoryMap: Record<EventType, EventCategory> = {
    // Lot events
    lot_created: 'lot',
    lot_status_changed: 'lot',
    lot_sold: 'lot',
    lot_retired: 'lot',
    lot_deceased: 'lot',
    
    // Subdivision events
    lot_subdivided: 'subdivision',
    subdivision_child_created: 'subdivision',
    
    // Cage movement events
    lot_assigned_to_cage: 'cage_movement',
    lot_moved_between_cages: 'cage_movement',
    lot_removed_from_cage: 'cage_movement',
    cage_cleaning_started: 'maintenance',
    cage_cleaning_completed: 'maintenance',
    cage_maintenance_started: 'maintenance',
    cage_maintenance_completed: 'maintenance',
    
    // Occupancy events
    cage_occupied: 'occupancy',
    cage_vacated: 'occupancy',
    capacity_exceeded: 'occupancy',
    capacity_warning: 'occupancy',
    
    // Mortality events
    mortality_recorded: 'mortality',
    mortality_threshold_exceeded: 'mortality',
    
    // Breeding events
    breeding_pair_formed: 'breeding',
    litter_born: 'breeding',
    weaning_completed: 'breeding',
    breeding_pair_separated: 'breeding',
    
    // Transfer events
    lot_transferred_in: 'transfer',
    lot_transferred_out: 'transfer',
    lot_sold_external: 'transfer',
    
    // Environmental events
    environmental_reading: 'environmental',
    environmental_alert: 'environmental',
    environmental_normalized: 'environmental',
    
    // Maintenance events
    equipment_maintenance: 'maintenance',
    facility_maintenance: 'maintenance',
    
    // Quarantine events
    quarantine_initiated: 'quarantine',
    quarantine_released: 'quarantine',
    quarantine_alert: 'quarantine',
    
    // Correction events
    data_correction: 'correction',
    event_reversal: 'correction',
    state_reconciliation: 'correction',
  };
  
  return categoryMap[eventType] || 'lot';
}

/**
 * Map event severity to display color
 */
function getSeverityColor(severity: EventSeverity): string {
  const colorMap: Record<EventSeverity, string> = {
    info: 'blue',
    notice: 'green',
    warning: 'yellow',
    error: 'orange',
    critical: 'red',
  };
  return colorMap[severity];
}

/**
 * Map event type to icon
 */
function getEventIcon(eventType: EventType): string {
  const iconMap: Partial<Record<EventType, string>> = {
    lot_created: 'package',
    lot_status_changed: 'refresh-cw',
    lot_sold: 'dollar-sign',
    lot_retired: 'archive',
    lot_deceased: 'x-circle',
    lot_subdivided: 'git-branch',
    subdivision_child_created: 'git-merge',
    lot_assigned_to_cage: 'arrow-right',
    lot_moved_between_cages: 'shuffle',
    lot_removed_from_cage: 'arrow-left',
    cage_cleaning_started: 'droplet',
    cage_cleaning_completed: 'check-circle',
    mortality_recorded: 'alert-triangle',
    breeding_pair_formed: 'heart',
    litter_born: 'plus-circle',
    lot_transferred_in: 'download',
    lot_transferred_out: 'upload',
    environmental_alert: 'thermometer',
    quarantine_initiated: 'shield-alert',
    data_correction: 'edit-3',
    event_reversal: 'undo',
  };
  return iconMap[eventType] || 'activity';
}

/**
 * Generate a human-readable description for an event
 */
function generateEventDescription(
  eventType: EventType,
  metadata: EventMetadata,
  actor: EventActor
): string {
  const actorName = actor.name || actor.id;
  
  switch (eventType) {
    case 'lot_created':
      return `Lot ${metadata.lotCode || 'created'} created by ${actorName}`;
    case 'lot_status_changed':
      return `Lot status changed from ${metadata.previousStatus} to ${metadata.newStatus} by ${actorName}`;
    case 'lot_assigned_to_cage':
      return `Lot ${metadata.lotCode} assigned to cage ${metadata.cageCode} by ${actorName}`;
    case 'lot_moved_between_cages':
      return `Lot ${metadata.lotCode} moved from cage ${metadata.previousStatus} to ${metadata.newStatus} by ${actorName}`;
    case 'lot_removed_from_cage':
      return `Lot ${metadata.lotCode} removed from cage ${metadata.cageCode} by ${actorName}`;
    case 'mortality_recorded':
      return `${metadata.quantity} animal(s) mortality recorded in lot ${metadata.lotCode} by ${actorName}`;
    case 'lot_subdivided':
      return `Lot ${metadata.lotCode} subdivided into ${metadata.newQuantity} lots by ${actorName}`;
    case 'litter_born':
      return `Litter of ${metadata.quantity} born to lot ${metadata.lotCode} by ${actorName}`;
    case 'capacity_exceeded':
      return `WARNING: Cage ${metadata.cageCode} capacity exceeded (${metadata.quantity}/${metadata.previousQuantity})`;
    case 'environmental_alert':
      return `ALERT: Environmental anomaly in cage ${metadata.cageCode} - Temp: ${metadata.temperature}°C`;
    case 'data_correction':
      return `Data correction applied by ${actorName}: ${metadata.reason}`;
    case 'event_reversal':
      return `Event reversal performed by ${actorName}: ${metadata.reason}`;
    default:
      return `${eventType} event by ${actorName}`;
  }
}

/**
 * Determine event severity based on type and metadata
 */
function determineSeverity(eventType: EventType, metadata: EventMetadata): EventSeverity {
  // Correction and reversal events are notices
  if (eventType === 'data_correction' || eventType === 'event_reversal') {
    return 'notice';
  }
  
  // Alerts and thresholds are warnings
  if (eventType.includes('alert') || eventType.includes('exceeded') || eventType.includes('warning')) {
    return 'warning';
  }
  
  // Mortality above threshold is critical
  if (eventType === 'mortality_threshold_exceeded') {
    return 'critical';
  }
  
  // Standard mortality is warning
  if (eventType === 'mortality_recorded') {
    return 'warning';
  }
  
  // Capacity issues are warnings
  if (eventType === 'capacity_exceeded') {
    return 'warning';
  }
  
  // Environmental alerts are warnings or critical
  if (eventType === 'environmental_alert') {
    return metadata.temperature && (metadata.temperature > 30 || metadata.temperature < 18) 
      ? 'critical' 
      : 'warning';
  }
  
  // Quarantine alerts are warnings
  if (eventType === 'quarantine_alert') {
    return 'warning';
  }
  
  // Default to info for normal operations
  return 'info';
}

/**
 * In-memory event store (for demonstration/runtime purposes)
 * In production, this would be backed by an event-sourced database
 */
class EventStore {
  private events: Map<string, OperationalEvent> = new Map();
  private eventsByLot: Map<string, string[]> = new Map(); // lotId -> eventIds
  private eventsByCage: Map<string, string[]> = new Map(); // cageId -> eventIds
  private eventsByTime: OperationalEvent[] = []; // Time-sorted array
  private sequenceNumber: number = 0;
  
  /**
   * Save an event (immutable - events are never updated)
   */
  save(event: OperationalEvent): void {
    if (this.events.has(event.id)) {
      throw new Error(`Cannot modify existing event: ${event.id}. Events are immutable.`);
    }
    
    this.events.set(event.id, event);
    this.sequenceNumber++;
    
    // Index by lot IDs
    for (const lotId of event.lotIds) {
      const lotEvents = this.eventsByLot.get(lotId) || [];
      lotEvents.push(event.id);
      this.eventsByLot.set(lotId, lotEvents);
    }
    
    // Index by cage IDs
    for (const cageId of event.cageIds) {
      const cageEvents = this.eventsByCage.get(cageId) || [];
      cageEvents.push(event.id);
      this.eventsByCage.set(cageId, cageEvents);
    }
    
    // Insert into time-sorted array
    this.insertIntoTimeSort(event);
  }
  
  private insertIntoTimeSort(event: OperationalEvent): void {
    // Binary search for insertion point
    let left = 0;
    let right = this.eventsByTime.length;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.eventsByTime[mid].timestamp < event.timestamp) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    this.eventsByTime.splice(left, 0, event);
  }
  
  /**
   * Get an event by ID
   */
  get(id: string): OperationalEvent | undefined {
    return this.events.get(id);
  }
  
  /**
   * Get events for a lot
   */
  getByLotId(lotId: string, filters?: EventQueryFilters): OperationalEvent[] {
    const eventIds = this.eventsByLot.get(lotId) || [];
    const events = eventIds.map(id => this.events.get(id)).filter((e): e is OperationalEvent => !!e);
    return this.applyFilters(events, filters);
  }
  
  /**
   * Get events for a cage
   */
  getByCageId(cageId: string, filters?: EventQueryFilters): OperationalEvent[] {
    const eventIds = this.eventsByCage.get(cageId) || [];
    const events = eventIds.map(id => this.events.get(id)).filter((e): e is OperationalEvent => !!e);
    return this.applyFilters(events, filters);
  }
  
  /**
   * Get all events with optional filters
   */
  getAll(filters?: EventQueryFilters): OperationalEvent[] {
    let events = [...this.eventsByTime];
    return this.applyFilters(events, filters);
  }
  
  /**
   * Apply query filters to event list
   */
  private applyFilters(
    events: OperationalEvent[],
    filters?: EventQueryFilters
  ): OperationalEvent[] {
    if (!filters) return events;
    
    let filtered = events;
    
    // Time range filter
    if (filters.startTime) {
      filtered = filtered.filter(e => e.timestamp >= filters.startTime!);
    }
    if (filters.endTime) {
      filtered = filtered.filter(e => e.timestamp <= filters.endTime!);
    }
    
    // Category filter
    if (filters.category) {
      const categories = Array.isArray(filters.category) ? filters.category : [filters.category];
      filtered = filtered.filter(e => categories.includes(e.category));
    }
    
    // Event type filter
    if (filters.eventType) {
      const types = Array.isArray(filters.eventType) ? filters.eventType : [filters.eventType];
      filtered = filtered.filter(e => types.includes(e.eventType));
    }
    
    // Actor filter
    if (filters.actorId) {
      filtered = filtered.filter(e => e.actor.id === filters.actorId);
    }
    if (filters.actorType) {
      filtered = filtered.filter(e => e.actor.type === filters.actorType);
    }
    
    // Severity filter
    if (filters.minSeverity) {
      const severityOrder: EventSeverity[] = ['info', 'notice', 'warning', 'error', 'critical'];
      const minIndex = severityOrder.indexOf(filters.minSeverity);
      filtered = filtered.filter(e => {
        const eventIndex = severityOrder.indexOf(e.severity);
        return eventIndex >= minIndex;
      });
    }
    
    // Sort order
    if (filters.sortOrder === 'asc') {
      filtered.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } else if (filters.sortOrder === 'desc') {
      filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    
    // Pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || filtered.length;
    filtered = filtered.slice(offset, offset + limit);
    
    return filtered;
  }
  
  /**
   * Get recent activity
   */
  getRecentActivity(limit: number = 50): OperationalEvent[] {
    return this.eventsByTime.slice(-limit).reverse();
  }
  
  /**
   * Get event stream position
   */
  getStreamPosition(): EventStreamPosition {
    const lastEvent = this.eventsByTime[this.eventsByTime.length - 1];
    return {
      lastEventId: lastEvent?.id || '',
      lastTimestamp: lastEvent?.timestamp || new Date(0),
      sequenceNumber: this.sequenceNumber,
    };
  }
  
  /**
   * Get activity summary for a time period
   */
  getActivitySummary(start: Date, end: Date): ActivitySummary {
    const events = this.getAll({ startTime: start, endTime: end });
    
    const eventsByCategory: Record<EventCategory, number> = {
      lot: 0,
      subdivision: 0,
      cage_movement: 0,
      occupancy: 0,
      mortality: 0,
      breeding: 0,
      transfer: 0,
      environmental: 0,
      maintenance: 0,
      quarantine: 0,
      correction: 0,
    };
    
    const eventsByType: Partial<Record<EventType, number>> = {};
    const affectedLots = new Set<string>();
    const affectedCages = new Set<string>();
    let alertsCount = 0;
    let correctionsCount = 0;
    
    for (const event of events) {
      eventsByCategory[event.category]++;
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
      
      for (const lotId of event.lotIds) {
        affectedLots.add(lotId);
      }
      for (const cageId of event.cageIds) {
        affectedCages.add(cageId);
      }
      
      if (event.severity === 'warning' || event.severity === 'error' || event.severity === 'critical') {
        alertsCount++;
      }
      
      if (event.category === 'correction') {
        correctionsCount++;
      }
    }
    
    return {
      period: { start, end },
      totalEvents: events.length,
      eventsByCategory,
      eventsByType,
      affectedLots: affectedLots.size,
      affectedCages: affectedCages.size,
      alertsCount,
      correctionsCount,
    };
  }
}

// Global store instance
const store = new EventStore();

/**
 * Generate a unique ID
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Create an operational event
 * 
 * This is the PRIMARY function for recording any operational action.
 * Events are IMMUTABLE once created.
 */
export function createOperationalEvent(options: {
  eventType: EventType;
  lotIds?: string[];
  cageIds?: string[];
  actor: EventActor;
  metadata?: EventMetadata;
  context?: EventContext;
  references?: EventReference[];
  customDescription?: string;
  forceSeverity?: EventSeverity;
}): OperationalEvent {
  const now = new Date();
  const id = generateId();
  const category = getEventCategory(options.eventType);
  const metadata = options.metadata || {};
  const severity = options.forceSeverity || determineSeverity(options.eventType, metadata);
  
  const event: OperationalEvent = {
    id,
    eventType: options.eventType,
    category,
    timestamp: now,
    actor: options.actor,
    lotIds: options.lotIds || [],
    cageIds: options.cageIds || [],
    context: options.context,
    metadata,
    severity,
    references: options.references || [],
    description: options.customDescription || generateEventDescription(options.eventType, metadata, options.actor),
    isImmutable: true,
  };
  
  store.save(event);
  
  return event;
}

/**
 * Create a correction event
 * 
 * Use this instead of modifying historical data.
 * Creates a new event that references and corrects the original.
 */
export function createCorrectionEvent(payload: {
  originalEventId: string;
  reason: string;
  correctedData: Record<string, unknown>;
  actor: EventActor;
  relatedLotIds?: string[];
  relatedCageIds?: string[];
}): OperationalEvent {
  const originalEvent = store.get(payload.originalEventId);
  
  if (!originalEvent) {
    throw new Error(`Original event not found: ${payload.originalEventId}`);
  }
  
  const reference: EventReference = {
    eventId: payload.originalEventId,
    relationship: 'correction',
    reason: payload.reason,
  };
  
  return createOperationalEvent({
    eventType: 'data_correction',
    lotIds: payload.relatedLotIds || originalEvent.lotIds,
    cageIds: payload.relatedCageIds || originalEvent.cageIds,
    actor: payload.actor,
    metadata: {
      originalEventId: payload.originalEventId,
      originalEventType: originalEvent.eventType,
      correctedData: payload.correctedData,
      reason: payload.reason,
    },
    references: [reference],
  });
}

/**
 * Create a reversal event
 * 
 * Use this to reverse/undo a previous operational action.
 * Creates a new event that negates the original action.
 */
export function createReversalEvent(payload: {
  originalEventId: string;
  reason: string;
  reversalAction: string;
  actor: EventActor;
  relatedLotIds?: string[];
  relatedCageIds?: string[];
}): OperationalEvent {
  const originalEvent = store.get(payload.originalEventId);
  
  if (!originalEvent) {
    throw new Error(`Original event not found: ${payload.originalEventId}`);
  }
  
  const reference: EventReference = {
    eventId: payload.originalEventId,
    relationship: 'reversal',
    reason: payload.reason,
  };
  
  return createOperationalEvent({
    eventType: 'event_reversal',
    lotIds: payload.relatedLotIds || originalEvent.lotIds,
    cageIds: payload.relatedCageIds || originalEvent.cageIds,
    actor: payload.actor,
    metadata: {
      originalEventId: payload.originalEventId,
      originalEventType: originalEvent.eventType,
      reversalAction: payload.reversalAction,
      reason: payload.reason,
    },
    references: [reference],
    forceSeverity: 'notice',
  });
}

/**
 * Get all events for a lot
 */
export function getLotEvents(
  lotId: string,
  filters?: EventQueryFilters
): OperationalEvent[] {
  return store.getByLotId(lotId, filters);
}

/**
 * Get all events for a cage
 */
export function getCageEvents(
  cageId: string,
  filters?: EventQueryFilters
): OperationalEvent[] {
  return store.getByCageId(cageId, filters);
}

/**
 * Get operational timeline for multiple entities
 */
export function getOperationalTimeline(options: {
  lotIds?: string[];
  cageIds?: string[];
  startTime?: Date;
  endTime?: Date;
  limit?: number;
}): OperationalEvent[] {
  const filters: EventQueryFilters = {
    startTime: options.startTime,
    endTime: options.endTime,
    limit: options.limit,
    sortOrder: 'desc',
  };
  
  if (options.lotIds && options.lotIds.length === 1) {
    return store.getByLotId(options.lotIds[0], filters);
  }
  
  if (options.cageIds && options.cageIds.length === 1) {
    return store.getByCageId(options.cageIds[0], filters);
  }
  
  // For multiple entities, get all events and filter
  let allEvents = store.getAll(filters);
  
  if (options.lotIds || options.cageIds) {
    allEvents = allEvents.filter(event => {
      if (options.lotIds && options.lotIds.some(id => event.lotIds.includes(id))) {
        return true;
      }
      if (options.cageIds && options.cageIds.some(id => event.cageIds.includes(id))) {
        return true;
      }
      return false;
    });
  }
  
  return allEvents;
}

/**
 * Get recent activity across the system
 */
export function getRecentActivity(limit: number = 50): OperationalEvent[] {
  return store.getRecentActivity(limit);
}

/**
 * Get activity summary for a time period
 */
export function getActivitySummary(start: Date, end: Date): ActivitySummary {
  return store.getActivitySummary(start, end);
}

/**
 * Convert event to timeline entry for visualization
 */
export function eventToTimelineEntry(event: OperationalEvent): EventTimelineEntry {
  return {
    event,
    displayTime: event.timestamp,
    summary: event.description,
    icon: getEventIcon(event.eventType),
    color: getSeverityColor(event.severity),
  };
}

/**
 * Get events as a stream from a position
 */
export function getEventStreamFrom(position: EventStreamPosition, limit: number = 100): OperationalEvent[] {
  const allEvents = store.getAll({
    startTime: position.lastTimestamp,
    sortOrder: 'asc',
    limit: limit + 1, // +1 to check if there are more
  });
  
  // Skip events up to and including the last known event
  const startIndex = allEvents.findIndex(e => e.id === position.lastEventId);
  if (startIndex >= 0) {
    return allEvents.slice(startIndex + 1, startIndex + 1 + limit);
  }
  
  return allEvents.slice(0, limit);
}

/**
 * Export events for external consumption
 */
export function exportEvents(options: {
  startTime?: Date;
  endTime?: Date;
  categories?: EventCategory[];
}): { events: OperationalEvent[]; metadata: { totalEvents: number; dateRange: { start: Date; end: Date }; categories: EventCategory[] } } {
  const filters: EventQueryFilters = {
    startTime: options.startTime,
    endTime: options.endTime,
    category: options.categories,
  };
  
  const events = store.getAll(filters);
  const categories = options.categories || Array.from(new Set(events.map(e => e.category)));
  
  const startDate = events.length > 0 ? events[0].timestamp : options.startTime || new Date();
  const endDate = events.length > 0 ? events[events.length - 1].timestamp : options.endTime || new Date();
  
  return {
    events,
    metadata: {
      totalEvents: events.length,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      categories,
    },
  };
}

/**
 * Create a lot lifecycle event bridge
 * 
 * Converts legacy lot lifecycle events to operational events
 * for unified event history.
 */
export function bridgeLotLifecycleEvent(lotEvent: LotLifecycleEvent, actor: EventActor): OperationalEvent {
  const eventTypeMap: Record<string, EventType> = {
    created: 'lot_created',
    subdivided: 'lot_subdivided',
    animals_added: 'lot_status_changed',
    animals_removed: 'lot_status_changed',
    mortality: 'mortality_recorded',
    status_changed: 'lot_status_changed',
    sold: 'lot_sold',
    retired: 'lot_retired',
    deceased: 'lot_deceased',
  };
  
  return createOperationalEvent({
    eventType: eventTypeMap[lotEvent.eventType] || 'lot_status_changed',
    lotIds: [lotEvent.lotId],
    actor,
    metadata: {
      quantity: lotEvent.quantity,
      reason: lotEvent.reason,
      ...lotEvent.metadata,
    },
  });
}

/**
 * Create a cage movement event bridge
 * 
 * Converts cage movement records to operational events
 * for unified event history.
 */
export function bridgeCageMovement(movement: CageMovement, actor: EventActor): OperationalEvent {
  const eventTypeMap: Record<CageMovement['movementType'], EventType> = {
    initial_assignment: 'lot_assigned_to_cage',
    transfer: 'lot_moved_between_cages',
    relocation: 'lot_moved_between_cages',
    removal: 'lot_removed_from_cage',
  };
  
  return createOperationalEvent({
    eventType: eventTypeMap[movement.movementType],
    lotIds: [movement.lotId],
    cageIds: [movement.toCageId, ...(movement.fromCageId ? [movement.fromCageId] : [])],
    actor,
    metadata: {
      quantity: movement.quantityMoved,
      reason: movement.reason,
      fromCageId: movement.fromCageId,
      toCageId: movement.toCageId,
      notes: movement.notes,
    },
  });
}
