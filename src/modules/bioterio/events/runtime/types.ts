/**
 * Bioterio Operational Event Runtime Types
 * 
 * Core type definitions for the event-driven operational model.
 * 
 * CRITICAL: This system is EVENT-DRIVEN and IMMUTABLE.
 * - Every workflow generates operational events
 * - Events preserve immutable historical traceability
 * - Future analytics and AI systems consume event streams
 * - Movement history and lifecycle history are core operational data
 * 
 * IMPORTANT:
 * - Events are IMMUTABLE (never overwritten)
 * - Corrections generate correction/reversal events, NOT mutations
 * - Occupancy and lifecycle systems derive state from event history
 * - Events become the operational source of truth
 */

/**
 * Operational Event Categories
 * 
 * These represent the major categories of operational events
 * that occur in the bioterio facility.
 */
export type EventCategory =
  | 'lot'               // Lot creation, subdivision, status changes
  | 'subdivision'       // Subdivision-specific events
  | 'cage_movement'     // Cage movement/transfer events
  | 'occupancy'         // Occupancy change events
  | 'mortality'         // Animal mortality events
  | 'breeding'          // Breeding-related events
  | 'transfer'          // Transfer in/out events
  | 'environmental'     // Environmental monitoring events
  | 'maintenance'       // Cage/facility maintenance events
  | 'quarantine'        // Quarantine protocol events
  | 'correction'        // Correction/reversal events;

/**
 * Specific Event Types within each category
 */
export type EventType =
  // Lot events
  | 'lot_created'
  | 'lot_status_changed'
  | 'lot_sold'
  | 'lot_retired'
  | 'lot_deceased'
  
  // Subdivision events
  | 'lot_subdivided'
  | 'subdivision_child_created'
  
  // Cage movement events
  | 'lot_assigned_to_cage'
  | 'lot_moved_between_cages'
  | 'lot_removed_from_cage'
  | 'cage_cleaning_started'
  | 'cage_cleaning_completed'
  | 'cage_maintenance_started'
  | 'cage_maintenance_completed'
  
  // Occupancy events
  | 'cage_occupied'
  | 'cage_vacated'
  | 'capacity_exceeded'
  | 'capacity_warning'
  
  // Mortality events
  | 'mortality_recorded'
  | 'mortality_threshold_exceeded'
  
  // Breeding events
  | 'breeding_pair_formed'
  | 'litter_born'
  | 'weaning_completed'
  | 'breeding_pair_separated'
  
  // Transfer events
  | 'lot_transferred_in'
  | 'lot_transferred_out'
  | 'lot_sold_external'
  
  // Environmental events
  | 'environmental_reading'
  | 'environmental_alert'
  | 'environmental_normalized'
  
  // Maintenance events
  | 'equipment_maintenance'
  | 'facility_maintenance'
  
  // Quarantine events
  | 'quarantine_initiated'
  | 'quarantine_released'
  | 'quarantine_alert'
  
  // Correction events
  | 'data_correction'
  | 'event_reversal'
  | 'state_reconciliation';

/**
 * Event Actor - Represents who/what triggered the event
 */
export interface EventActor {
  type: 'user' | 'system' | 'integration' | 'ai_agent';
  id: string;              // User ID, system ID, integration ID, etc.
  name?: string;           // Human-readable name
  role?: string;           // User role or system component
}

/**
 * Event Context - Operational context at the time of the event
 */
export interface EventContext {
  workspaceId?: string;    // Workspace/instance identifier
  sessionId?: string;      // User session (if applicable)
  requestId?: string;      // API request ID for tracing
  ipAddress?: string;      // Source IP (for audit)
  userAgent?: string;      // Client information
}

/**
 * Event Metadata - Additional structured data about the event
 */
export interface EventMetadata {
  // Quantitative data
  quantity?: number;
  previousQuantity?: number;
  newQuantity?: number;
  
  // Status transitions
  previousStatus?: string;
  newStatus?: string;
  
  // References
  cageCode?: string;
  lotCode?: string;
  speciesProfileId?: string;
  /** Immutable snapshot of the species profile at event time — preserves history across renames. */
  speciesProfileSnapshot?: {
    speciesProfileId: string;
    code: string;
    displayName: string;
    taxonomyKey?: string;
  };
  strain?: string;
  
  // Environmental readings
  temperature?: number;
  humidity?: number;
  lightCycle?: string;
  
  // Financial (for sales/transfers)
  unitPrice?: number;
  totalPrice?: number;
  customerId?: string;
  
  // Arbitrary additional fields
  [key: string]: unknown;
}

/**
 * Event Reference - Links to related events
 * 
 * Enables building event chains and causal relationships.
 */
export interface EventReference {
  eventId: string;         // ID of the referenced event
  relationship: 'parent' | 'child' | 'reversal' | 'correction' | 'related';
  reason?: string;         // Why this event is referenced
}

/**
 * Event Severity Level
 */
export type EventSeverity =
  | 'info'        // Informational event
  | 'notice'      // Notable but normal operation
  | 'warning'     // Potential issue requiring attention
  | 'error'       // Error condition
  | 'critical';   // Critical failure requiring immediate action

/**
 * OperationalEvent - The core immutable event record
 * 
 * Every operational action in the bioterio generates an event.
 * Events are NEVER modified after creation.
 * Corrections create new events that reference the original.
 */
export interface OperationalEvent {
  // Identity
  id: string;
  eventType: EventType;
  category: EventCategory;
  
  // Temporal
  timestamp: Date;
  
  // Actor
  actor: EventActor;
  
  // Entity references (what this event affects)
  lotIds: string[];          // Related lot IDs (can be multiple for subdivisions)
  cageIds: string[];         // Related cage IDs (can be empty for lot-only events)
  
  // Context
  context?: EventContext;
  
  // Data
  metadata: EventMetadata;
  severity: EventSeverity;
  
  // Relationships
  references: EventReference[];  // Links to related events
  
  // Description (human-readable summary)
  description: string;
  
  // Immutable flag (always true for events)
  readonly isImmutable: true;
}

/**
 * Event Query Filters - For querying events
 */
export interface EventQueryFilters {
  // Time range
  startTime?: Date;
  endTime?: Date;
  
  // Entity filters
  lotId?: string;
  cageId?: string;
  
  // Type filters
  category?: EventCategory | EventCategory[];
  eventType?: EventType | EventType[];
  
  // Actor filters
  actorId?: string;
  actorType?: EventActor['type'];
  
  // Severity filter
  minSeverity?: EventSeverity;
  
  // Pagination
  limit?: number;
  offset?: number;
  
  // Sort order
  sortOrder?: 'asc' | 'desc';
}

/**
 * Event Timeline Entry - For timeline visualization
 */
export interface EventTimelineEntry {
  event: OperationalEvent;
  displayTime: Date;
  summary: string;
  icon: string;
  color: string;
}

/**
 * Activity Summary - Aggregated activity for a time period
 */
export interface ActivitySummary {
  period: {
    start: Date;
    end: Date;
  };
  totalEvents: number;
  eventsByCategory: Record<EventCategory, number>;
  eventsByType: Partial<Record<EventType, number>>;
  affectedLots: number;
  affectedCages: number;
  alertsCount: number;
  correctionsCount: number;
}

/**
 * Event Stream Position - For streaming/consumption tracking
 */
export interface EventStreamPosition {
  lastEventId: string;
  lastTimestamp: Date;
  sequenceNumber: number;
}

/**
 * Correction Event Payload - Data for creating correction events
 */
export interface CorrectionPayload {
  originalEventId: string;
  reason: string;
  correctedData: Record<string, unknown>;
  performedBy: EventActor;
}

/**
 * Reversal Event Payload - Data for creating reversal events
 */
export interface ReversalPayload {
  originalEventId: string;
  reason: string;
  reversalAction: string;
  performedBy: EventActor;
}

/**
 * Event Export Format - For external consumption
 */
export interface EventExport {
  version: string;
  exportedAt: Date;
  events: OperationalEvent[];
  metadata: {
    totalEvents: number;
    dateRange: {
      start: Date;
      end: Date;
    };
    categories: EventCategory[];
  };
}
