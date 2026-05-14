/**
 * Operational Availability Engine — Core Types
 *
 * CRITICAL PRINCIPLES:
 * - Inventory is NOT total animals. It is OPERATIONAL AVAILABILITY.
 * - Availability is derived: lots + size classifications + events + reservations.
 * - Inventory operates by (speciesProfileId + sizeClassId), NOT raw species strings.
 * - Historical inventory truth is IMMUTABLE. Reclassification never rewrites history.
 * - Reservations do NOT mutate source inventory — availability = derived stock - reservations.
 *
 * ┌────────────────────────────────────────────────────────────────────────────┐
 * │  HOW OPERATIONAL AVAILABILITY WORKS                                       │
 * │                                                                            │
 * │  1. Lots are fetched from the database (active, nacimiento/engorda types). │
 * │  2. Each lot's size class is resolved via size_class_id (FK).              │
 * │  3. Animals within a lot are grouped by (speciesProfileId, sizeClassId).   │
 * │  4. Mortality events reduce the derived count (not stored quantity).        │
 * │  5. Reservations are subtracted from the derived count.                    │
 * │  6. Result = InventoryClassificationState per (speciesProfileId+sizeClassId)│
 * │                                                                            │
 * │  HOW PROJECTIONS WORK                                                      │
 * │  - Today's neonates will become Pinkies in N days (species-specific).      │
 * │  - Growth progression follows SpeciesOperationalSettings.                  │
 * │  - Mortality expectations are applied as a discount factor.                │
 * │  - Output: AvailabilityProjection — "In 5 days: 120 Hopper ASF available" │
 * └────────────────────────────────────────────────────────────────────────────┘
 */

// ============================================================================
// INVENTORY STATES
// ============================================================================

export type InventoryAvailabilityStatus =
  | 'available'        // Ready to sell / transfer
  | 'reserved'         // Claimed by a reservation, not yet sold
  | 'projected'        // Will become available in the future
  | 'blocked'          // Held for internal reasons (quarantine, pending action)
  | 'quarantined'      // Under health hold
  | 'pendingWeaning'   // Litter that hasn't been weaned yet
  | 'pendingSubdivision'; // Lot that needs to be split by sex

// ============================================================================
// INVENTORY SNAPSHOT
// ============================================================================

/**
 * A point-in-time snapshot of the operational inventory for a workspace.
 * This is the root object for the availability engine output.
 */
export interface InventorySnapshot {
  workspaceId: string;
  computedAt: string; // ISO timestamp

  /** Grouped availability by species profile and size class */
  classificationStates: InventoryClassificationState[];

  /** All active reservations at snapshot time */
  activeReservations: InventoryReservation[];

  /** Summary metrics */
  summary: InventorySnapshotSummary;
}

export interface InventorySnapshotSummary {
  totalAvailable: number;
  totalReserved: number;
  totalProjected: number;
  totalBlocked: number;
  speciesCount: number;
  activeReservationCount: number;
  lowStockAlerts: LowStockAlert[];
}

// ============================================================================
// INVENTORY CLASSIFICATION STATE
// ============================================================================

/**
 * The operational availability for a specific (speciesProfile + sizeClass) pair.
 * This is the atomic unit of the availability engine.
 */
export interface InventoryClassificationState {
  // Identity
  speciesProfileId: string;
  speciesName: string;
  operationalName: string;
  sizeClassId: string;
  sizeClassName: string;
  sizeClassCode?: string;

  // Counts
  totalAnimals: number;          // Raw sum from lots
  available: number;             // totalAnimals - reserved - blocked
  reserved: number;              // Sum of active reservations for this classification
  blocked: number;               // Quarantine + pendingWeaning + pendingSubdivision

  // Status breakdown
  statusBreakdown: {
    available: number;
    reserved: number;
    quarantined: number;
    pendingWeaning: number;
    pendingSubdivision: number;
  };

  // Contributing lots
  lotIds: string[];
  lotCount: number;

  // Pricing
  salePrice?: number;
  estimatedValue: number; // available * salePrice

  // Ordering (inherits from size class)
  displayOrder: number;
}

// ============================================================================
// AVAILABILITY PROJECTION
// ============================================================================

/**
 * A forward-looking projection of when and how much inventory will be available.
 * Derived from current lots + species operational settings + growth progression.
 */
export interface AvailabilityProjection {
  workspaceId: string;
  computedAt: string;

  /** Per-species timeline projections */
  timelines: AvailabilityTimeline[];

  /** Operational bottleneck warnings */
  bottlenecks: AvailabilityBottleneck[];

  /** Next N days summary */
  nextSevenDays: ProjectedAvailability[];
  nextThirtyDays: ProjectedAvailability[];
}

/**
 * A single point in an availability timeline
 */
export interface ProjectedAvailability {
  date: string; // ISO date string (YYYY-MM-DD)
  speciesProfileId: string;
  sizeClassId: string;
  sizeClassName: string;
  speciesName: string;

  projectedQuantity: number;
  confidence: 'high' | 'medium' | 'low';

  /** Source lot IDs that contribute to this projection */
  sourceLotIds: string[];

  /** Factors applied */
  mortalityFactor: number;   // Expected mortality discount (e.g., 0.95 = 5% expected mortality)
  growthFactor: number;      // Growth classification confidence
}

/**
 * A timeline for a specific species + size class combination
 */
export interface AvailabilityTimeline {
  speciesProfileId: string;
  sizeClassId: string;
  speciesName: string;
  sizeClassName: string;

  /** Ordered daily projections */
  dailyProjections: ProjectedAvailability[];

  /** Peak availability window */
  peakWindow?: AvailabilityWindow;

  /** Running low warning */
  lowStockDate?: string; // Date when stock drops below threshold
}

/**
 * An availability window — a period of time with guaranteed supply
 */
export interface AvailabilityWindow {
  speciesProfileId: string;
  sizeClassId: string;
  startDate: string;
  endDate: string;
  minimumQuantity: number;
  maximumQuantity: number;
  averageQuantity: number;
  confidence: 'high' | 'medium' | 'low';
}

// ============================================================================
// INVENTORY RESERVATIONS
// ============================================================================

export type ReservationStatus =
  | 'active'     // Holding inventory
  | 'fulfilled'  // Order was completed
  | 'cancelled'  // Reservation was cancelled
  | 'expired';   // Passed expiration without fulfillment

/**
 * A reservation claims inventory WITHOUT mutating the source lots.
 * Availability = derived stock - SUM(active reservations).
 */
export interface InventoryReservation {
  id: string;
  workspaceId: string;

  // What is being reserved
  speciesProfileId: string;
  sizeClassId: string;
  quantity: number;

  // Who reserved it
  customerId?: string;
  customerName?: string;
  orderId?: string;

  // Lifecycle
  status: ReservationStatus;
  createdAt: string;
  expiresAt?: string;
  fulfilledAt?: string;
  cancelledAt?: string;

  // Metadata
  notes?: string;
  createdBy?: string;

  // Partial fulfillment tracking
  fulfilledQuantity: number;
  remainingQuantity: number; // quantity - fulfilledQuantity
}

/**
 * Input for creating a new reservation
 */
export interface CreateReservationInput {
  workspaceId: string;
  speciesProfileId: string;
  sizeClassId: string;
  quantity: number;
  customerId?: string;
  customerName?: string;
  orderId?: string;
  expiresAt?: string;
  notes?: string;
}

// ============================================================================
// ALERTS
// ============================================================================

export interface LowStockAlert {
  speciesProfileId: string;
  sizeClassId: string;
  speciesName: string;
  sizeClassName: string;
  currentAvailable: number;
  threshold: number;
  severity: 'warning' | 'critical';
}

export interface AvailabilityBottleneck {
  type: 'low_stock' | 'no_projection' | 'over_reserved' | 'stale_reservation' | 'orphan_reservation';
  speciesProfileId?: string;
  sizeClassId?: string;
  reservationId?: string;
  description: string;
  severity: 'warning' | 'critical';
}

// ============================================================================
// INVENTORY MOVEMENT HISTORY
// ============================================================================

export type InventoryMovementType =
  | 'lot_created'
  | 'classification_assigned'
  | 'classification_changed'
  | 'mortality_registered'
  | 'sale_registered'
  | 'subdivision_created'
  | 'reservation_created'
  | 'reservation_fulfilled'
  | 'reservation_cancelled'
  | 'availability_change';

/**
 * An immutable record of an inventory state change.
 * Historical truth CANNOT be overwritten.
 */
export interface InventoryMovementRecord {
  id: string;
  workspaceId: string;
  movementType: InventoryMovementType;
  timestamp: string;

  // What changed
  speciesProfileId?: string;
  sizeClassId?: string;
  lotId?: string;
  reservationId?: string;

  // Quantities (before/after for audit)
  quantityBefore?: number;
  quantityAfter?: number;
  quantityDelta?: number;

  // Human-readable summary
  summary: string;

  // Related entity IDs
  relatedEntityId?: string;
  relatedEntityType?: string;

  // Who did it
  actorId?: string;
}

// ============================================================================
// VALIDATION RESULTS
// ============================================================================

export interface AvailabilityValidationResult {
  isValid: boolean;
  issues: AvailabilityValidationIssue[];
  warnings: AvailabilityValidationIssue[];
}

export interface AvailabilityValidationIssue {
  type:
    | 'over_reservation'
    | 'negative_availability'
    | 'invalid_projection'
    | 'orphan_reservation'
    | 'stale_reservation'
    | 'expired_reservation';
  severity: 'error' | 'warning';
  reservationId?: string;
  speciesProfileId?: string;
  sizeClassId?: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// ENGINE INPUT TYPES (raw DB rows)
// ============================================================================

/** Raw lot data needed by the availability engine */
export interface LotForAvailability {
  id: string;
  codigo: string | null;
  especie: string;
  species_id?: string;
  size_class_id: string | null;
  cantidad_actual: number | null;
  fecha_nacimiento: string | null;
  estado: string;
  tipo: string;
  // Resolved joins
  size_class?: {
    id: string;
    name: string;
    code?: string;
    species_profile_id: string;
    sale_price?: number | null;
    min_age_days?: number | null;
    max_age_days?: number | null;
    display_order: number;
  } | null;
  species_profile?: {
    id: string;
    species_name: string;
    operational_name: string;
  } | null;
}

/** Raw lote event data for mortality/sales calculations */
export interface LotEventForAvailability {
  id: string;
  lote_id: string;
  tipo: 'mortalidad' | 'venta' | 'traslado_caja' | 'ajuste' | 'nota';
  cantidad: number | null;
  fecha: string;
}

/** Species operational settings needed for projection */
export interface SpeciesSettingsForProjection {
  speciesProfileId: string;
  breedingCycleDays: number;
  expectedWeaningAgeDays: number;
  expectedGestationDays: number;
  maturityAgeDays: number;
  expectedMortalityRate: number;
  typicalLitterSize?: number;
}
