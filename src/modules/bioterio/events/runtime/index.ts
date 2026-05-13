/**
 * Bioterio Operational Event Runtime - Public API
 * 
 * This module provides the event-driven operational foundation for the bioterio.
 * All operational actions generate immutable events that form the historical record.
 * 
 * @module @biotrackcentral/bioterio/events/runtime
 */

// Types
export type {
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
  EventExport,
} from './types';

// Operations
export {
  createOperationalEvent,
  createCorrectionEvent,
  createReversalEvent,
  getLotEvents,
  getCageEvents,
  getOperationalTimeline,
  getRecentActivity,
  getActivitySummary,
  eventToTimelineEntry,
  getEventStreamFrom,
  exportEvents,
  bridgeLotLifecycleEvent,
  bridgeCageMovement,
} from './operations';
