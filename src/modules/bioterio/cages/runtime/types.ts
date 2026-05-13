/**
 * Bioterio Cage Runtime Types
 * 
 * Core type definitions for the cage-centric spatial operational model.
 * 
 * CRITICAL: This system is SPACE-AWARE and LOT-CENTRIC.
 * - Lots exist inside cages
 * - Occupancy changes constantly
 * - Movements are core workflows
 * - Cage capacity and availability are critical operational concerns
 * 
 * IMPORTANT: Occupancy is NOT hardcoded on the cage itself.
 * Occupancy is DERIVED from:
 * - Active lot assignments
 * - Movement events
 * - Lifecycle events
 */

/**
 * Cage Status - Represents the current operational state of a cage
 */
export type CageStatus =
  | 'available'    // Cage is empty and ready for occupancy
  | 'occupied'     // Cage has active lot assignments
  | 'cleaning'     // Cage is being cleaned/sanitized
  | 'maintenance'  // Cage is under maintenance/repair
  | 'quarantine';  // Cage is in quarantine (restricted use)

/**
 * Cage Capacity Configuration
 */
export interface CageCapacity {
  maxAnimals: number;        // Maximum animal count
  maxLots?: number;          // Maximum number of lots (if multi-lot allowed)
  speciesCompatibility?: string[]; // Species IDs this cage can house
  volumeLiters?: number;     // Cage volume for environmental calculations
  floorAreaCm2?: number;     // Floor area for density calculations
}

/**
 * Environmental Metadata - Conditions monitored in the cage
 */
export interface CageEnvironment {
  temperatureCelsius?: number;
  humidityPercent?: number;
  lightCycle?: string;       // e.g., "12L:12D"
  ventilationRate?: number;
  lastEnvironmentalCheck?: Date;
}

/**
 * Cage Lifecycle Event Types
 */
export type CageLifecycleEventType =
  | 'created'           // Cage was added to the system
  | 'status_changed'    // Cage status changed
  | 'lot_assigned'      // A lot was assigned to this cage
  | 'lot_removed'       // A lot was removed from this cage
  | 'lot_moved_in'      // A lot moved into this cage from another
  | 'lot_moved_out'     // A lot moved out of this cage to another
  | 'cleaning_started'  // Cleaning process began
  | 'cleaning_completed' // Cleaning process completed
  | 'maintenance_started' // Maintenance began
  | 'maintenance_completed' // Maintenance completed
  | 'quarantine_started' // Quarantine protocol initiated
  | 'quarantine_ended'   // Quarantine protocol ended
  | 'capacity_exceeded' // Warning: capacity limits exceeded
  | 'environmental_alert'; // Environmental parameter out of range

/**
 * Cage Lifecycle Event - A single event in the cage's history
 */
export interface CageLifecycleEvent {
  id: string;
  cageId: string;
  eventType: CageLifecycleEventType;
  timestamp: Date;
  lotId?: string;         // Associated lot (if applicable)
  previousStatus?: CageStatus;
  newStatus?: CageStatus;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Cage Movement - Records a lot movement event
 * 
 * IMPORTANT: Movements must preserve complete historical traceability.
 * Movement history should NEVER be overwritten.
 */
export interface CageMovement {
  id: string;
  lotId: string;
  fromCageId?: string;    // Undefined if initial assignment
  toCageId: string;
  movementType: 'initial_assignment' | 'transfer' | 'relocation' | 'removal';
  timestamp: Date;
  quantityMoved?: number; // If only partial quantity moved
  reason?: string;
  performedBy?: string;   // User ID who performed the movement
  notes?: string;
}

/**
 * Lot Assignment - Represents a lot currently assigned to a cage
 */
export interface LotAssignment {
  lotId: string;
  assignedDate: Date;
  quantityAtAssignment: number;
  notes?: string;
}

/**
 * Cage Occupancy - Derived occupancy information
 * 
 * This is COMPUTED at runtime from:
 * - Active lot assignments
 * - Movement history
 * - Current lot statuses
 */
export interface CageOccupancy {
  cageId: string;
  totalAnimals: number;           // Sum of all lot quantities
  totalLots: number;              // Number of active lots
  assignments: LotAssignment[];   // Current active assignments
  utilizationPercent: number;     // (totalAnimals / maxCapacity) * 100
  isOverCapacity: boolean;
  lastUpdated: Date;
}

/**
 * Cage - The primary spatial entity in the bioterio
 * 
 * A cage represents a physical housing unit that can contain one or more lots.
 * Occupancy is DERIVED from lot assignments, not stored directly.
 */
export interface Cage {
  // Identity
  id: string;
  code: string;             // Human-readable identifier (e.g., "R1-C01")
  
  // Location
  roomId?: string;          // Room identifier
  zoneId?: string;          // Zone/rack identifier
  rackPosition?: string;    // Position within rack (e.g., "A1", "B3")
  
  // Capacity configuration
  capacity: CageCapacity;
  
  // Environmental metadata
  environment?: CageEnvironment;
  
  // Operational state
  status: CageStatus;
  
  // Temporal
  createdAt: Date;
  updatedAt: Date;
  lastCleanedAt?: Date;
  lastMaintenanceAt?: Date;
  
  // Metadata
  notes?: string;
  tags?: string[];          // For categorization/search
  isActive: boolean;        // Whether cage is in active service
}

/**
 * Assign Lot to Cage Options
 */
export interface AssignLotToCageOptions {
  lotId: string;
  cageId: string;
  quantity?: number;        // If assigning partial lot quantity
  notes?: string;
  performedBy?: string;
}

/**
 * Move Lot Options - For moving a lot between cages
 */
export interface MoveLotOptions {
  lotId: string;
  fromCageId: string;
  toCageId: string;
  quantity?: number;        // If moving partial quantity
  reason?: string;
  performedBy?: string;
  notes?: string;
}

/**
 * Remove Lot from Cage Options
 */
export interface RemoveLotFromCageOptions {
  lotId: string;
  cageId: string;
  reason?: string;
  performedBy?: string;
  notes?: string;
}

/**
 * Cage Query Filters
 */
export interface CageQueryFilters {
  status?: CageStatus | CageStatus[];
  roomId?: string;
  zoneId?: string;
  speciesCompatible?: string; // Filter by species compatibility
  includeInactive?: boolean;
  availableOnly?: boolean;    // Only cages that can accept new lots
}

/**
 * Cage Summary - Lightweight representation for lists
 */
export interface CageSummary {
  id: string;
  code: string;
  roomId?: string;
  status: CageStatus;
  occupancy: {
    totalAnimals: number;
    totalLots: number;
    utilizationPercent: number;
  };
  isActive: boolean;
}

/**
 * Movement History Query Result
 */
export interface MovementHistoryResult {
  cageId: string;
  movements: CageMovement[];
  totalMovementsIn: number;
  totalMovementsOut: number;
  currentAssignments: LotAssignment[];
}
