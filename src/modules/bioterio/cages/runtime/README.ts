/**
 * Bioterio Cage Runtime - Architectural Documentation
 * 
 * This document explains the design decisions, architectural patterns,
 * and operational rationale behind the Cage Occupancy Runtime System.
 */

// ============================================================================
// 1. WHY OCCUPANCY IS RUNTIME-DERIVED (NOT STORED)
// ============================================================================

/**
 * CRITICAL DESIGN DECISION: Occupancy is NOT stored on the Cage entity.
 * 
 * Instead, occupancy is COMPUTED at runtime from:
 * - Active lot assignments
 * - Current lot quantities (fetched from lot system)
 * - Movement history
 * 
 * RATIONALE:
 * 
 * 1. SINGLE SOURCE OF TRUTH
 *    - Lot quantities can change (mortality, births, additions)
 *    - If occupancy were stored, it would drift from actual lot data
 *    - Derived occupancy ensures consistency with lot system
 * 
 * 2. AUDIT TRAIL INTEGRITY
 *    - Every movement creates an immutable record
 *    - Historical occupancy can be reconstructed for any point in time
 *    - No risk of stale or incorrect cached data
 * 
 * 3. OPERATIONAL FLEXIBILITY
 *    - Lots can be partially moved (split quantities)
 *    - Multiple lots can share a cage
 *    - Complex scenarios are handled naturally
 * 
 * 4. EVENT-DRIVEN ARCHITECTURE
 *    - Movements are events, not state changes
 *    - Events can trigger downstream workflows (cleaning, alerts)
 *    - Events persist indefinitely for compliance/auditing
 * 
 * EXAMPLE:
 * 
 *   // INCORRECT (stored occupancy):
 *   cage.occupancy = { animals: 25, lots: 1 };
 *   // Problem: What if lot quantity changes to 23 due to mortality?
 *   // The cage occupancy is now WRONG until manually updated.
 * 
 *   // CORRECT (derived occupancy):
 *   function getCageOccupancy(cageId) {
 *     const assignments = getAssignments(cageId);
 *     let totalAnimals = 0;
 *     for (const assignment of assignments) {
 *       const lot = getLot(assignment.lotId);
 *       totalAnimals += lot.currentQuantity; // Always current!
 *     }
 *     return { totalAnimals, ... };
 *   }
 *   // Benefit: Always reflects actual lot quantities.
 */

// ============================================================================
// 2. HOW MOVEMENT TRACEABILITY WORKS
// ============================================================================

/**
 * IMMUTABLE MOVEMENT HISTORY
 * 
 * Every lot movement creates a CageMovement record that is NEVER modified.
 * 
 * MOVEMENT TYPES:
 * 
 * 1. initial_assignment
 *    - First time a lot is placed in a cage
 *    - fromCageId is undefined
 *    - Creates assignment record
 * 
 * 2. transfer
 *    - Moving lot from one cage to another
 *    - Both fromCageId and toCageId are populated
 *    - Removes old assignment, creates new assignment
 *    - Records event in BOTH cages' histories
 * 
 * 3. relocation
 *    - Similar to transfer, but within same room/rack
 *    - Used for operational tracking distinctions
 * 
 * 4. removal
 *    - Lot leaves the facility (sold, deceased, transferred out)
 *    - Assignment is removed
 *    - Cage may become available
 * 
 * TRACEABILITY CHAIN:
 * 
 *   Lot: ASF-001
 *   Movement History:
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ 2025-01-15 10:00 - initial_assignment → Cage R1-A-01        │
 *   │ 2025-01-20 14:30 - transfer → Cage R1-A-05                  │
 *   │ 2025-01-25 09:15 - transfer → Cage R2-B-03                  │
 *   │ 2025-02-01 16:00 - removal (sold)                           │
 *   └─────────────────────────────────────────────────────────────┘
 * 
 *   Query: "Where was ASF-001 on Jan 22?"
 *   Answer: Cage R1-A-05 (between transfers on 20th and 25th)
 * 
 * IMPLEMENTATION:
 * 
 *   function moveLot({ lotId, fromCageId, toCageId }) {
 *     // 1. Remove old assignment
 *     store.removeAssignment(fromCageId, lotId);
 *     
 *     // 2. Create new assignment
 *     store.addAssignment(toCageId, { lotId, assignedDate: now });
 *     
 *     // 3. Record IMMUTABLE movement event
 *     const movement = {
 *       id: generateId(),
 *       lotId,
 *       fromCageId,
 *       toCageId,
 *       movementType: 'transfer',
 *       timestamp: now,
 *       // ... metadata
 *     };
 *     store.addMovement(movement); // NEVER modified after creation
 *     
 *     // 4. Record lifecycle events in both cages
 *     store.addEvent({ cageId: fromCageId, eventType: 'lot_moved_out', ... });
 *     store.addEvent({ cageId: toCageId, eventType: 'lot_moved_in', ... });
 *   }
 */

// ============================================================================
// 3. HOW LOT/CAGE RELATIONSHIPS OPERATE
// ============================================================================

/**
 * MANY-TO-MANY WITH TEMPORAL DIMENSION
 * 
 * A lot can occupy multiple cages OVER TIME (but only one at a time).
 * A cage can contain multiple lots SIMULTANEOUSLY (if capacity allows).
 * 
 * RELATIONSHIP MODEL:
 * 
 *   Lot ──< LotAssignment >── Cage
 *   
 *   LotAssignment {
 *     lotId: string;
 *     assignedDate: Date;
 *     quantityAtAssignment: number;
 *     notes?: string;
 *   }
 * 
 * KEY OPERATIONS:
 * 
 * 1. assignLotToCage()
 *    - Creates LotAssignment
 *    - Creates CageMovement (initial_assignment)
 *    - Updates cage status to 'occupied'
 *    - Records lifecycle event
 * 
 * 2. moveLot()
 *    - Removes old LotAssignment
 *    - Creates new LotAssignment
 *    - Creates CageMovement (transfer)
 *    - Updates both cages' statuses
 *    - Records lifecycle events in both cages
 * 
 * 3. removeLotFromCage()
 *    - Removes LotAssignment
 *    - Creates CageMovement (removal)
 *    - May update cage status to 'available'
 *    - Records lifecycle event
 * 
 * REVERSE INDEX:
 * 
 *   For quick lookups, we maintain:
 *   lotToCage: Map<lotId, cageId>
 *   
 *   This allows O(1) lookup of "Which cage is this lot in?"
 *   without scanning all assignments.
 * 
 * STATUS SYNCHRONIZATION:
 * 
 *   Cage status is automatically managed:
 *   - 'available' → 'occupied' when first lot assigned
 *   - 'occupied' → 'available' when last lot removed
 *   - 'cleaning' / 'maintenance' block new assignments
 *   - 'quarantine' blocks both assignments and incoming transfers
 */

// ============================================================================
// 4. HOW THIS SUPPORTS FUTURE AI AND ANALYTICS
// ============================================================================

/**
 * ANALYTICS FOUNDATION
 * 
 * The runtime provides rich data for analytics:
 * 
 * 1. OCCUPANCY ANALYTICS
 *    - Utilization rates by room, rack, cage type
 *    - Peak occupancy periods
 *    - Turnover rates (movements per cage per month)
 *    - Capacity violation trends
 * 
 * 2. MOVEMENT PATTERNS
 *    - Common movement paths (which cages feed which)
 *    - Subdivision relocation patterns
 *    - Time between movements
 *    - Bottleneck identification
 * 
 * 3. LIFECYCLE ANALYTICS
 *    - Cleaning frequency compliance
 *    - Maintenance schedules
 *    - Quarantine effectiveness
 *    - Status transition patterns
 * 
 * AI OPTIMIZATION OPPORTUNITIES:
 * 
 * 1. CAGE ASSIGNMENT OPTIMIZATION
 *    - ML model suggests optimal cage for new lot
 *    - Considers: species compatibility, location, cleaning schedule
 *    - Minimizes future moves
 * 
 * 2. PREDICTIVE CAPACITY PLANNING
 *    - Forecast occupancy based on breeding schedules
 *    - Alert when capacity will be exceeded
 *    - Suggest proactive relocations
 * 
 * 3. ANOMALY DETECTION
 *    - Unusual movement patterns
 *    - Unexpected mortality clusters
 *    - Cleaning schedule deviations
 * 
 * 4. WORKFLOW AUTOMATION
 *    - Auto-generate cleaning tasks when cage becomes empty
 *    - Auto-schedule maintenance based on usage
 *    - Auto-alert on capacity violations
 * 
 * DATA STRUCTURES FOR AI:
 * 
 *   // Time-series occupancy data
 *   interface OccupancyTimeSeries {
 *     cageId: string;
 *     timestamps: Date[];
 *     animalCounts: number[];
 *     lotCounts: number[];
 *   }
 * 
 *   // Movement graph for path analysis
 *   interface MovementGraph {
 *     nodes: string[]; // cage IDs
 *     edges: Array<{ from: string; to: string; count: number }>;
 *   }
 * 
 *   // Feature vector for ML
 *   interface CageFeatureVector {
 *     roomId: string;
 *     capacity: number;
 *     speciesCompatibility: string[];
 *     avgOccupancyRate: number;
 *     turnoverRate: number;
 *     daysSinceLastCleaning: number;
 *     recentMovements: number;
 *   }
 */

// ============================================================================
// 5. DIFFERENCE FROM CRUD-STYLE CAGE MANAGEMENT
// ============================================================================

/**
 * TRADITIONAL CRUD APPROACH (WHAT WE AVOID):
 * 
 *   // Direct state mutation
 *   cage.animals = 25;
 *   cage.lots = [lot1, lot2];
 *   cage.status = 'occupied';
 *   
 *   // Update overwrites previous state
 *   cage.animals = 23; // Two died. History is LOST.
 *   
 *   // No audit trail
 *   // No movement tracking
 *   // No temporal queries possible
 * 
 * OUR EVENT-SOURCED APPROACH:
 * 
 *   // Operations create events
 *   assignLotToCage({ lotId, cageId });
 *   // → Creates: Assignment record + Movement event + Lifecycle event
 *   
 *   removeAnimalsFromLot(lotId, 2, 'mortality');
 *   // → Creates: LotLifecycleEvent (mortality)
 *   // → Cage occupancy automatically reflects new quantity
 *   
 *   moveLot({ lotId, fromCageId, toCageId });
 *   // → Creates: Movement event (in both cages) + Lifecycle events
 *   
 *   // History is complete and queryable
 *   const history = getCageMovementHistory(cageId);
 *   // Can reconstruct state at ANY point in time
 * 
 * BENEFITS:
 * 
 * 1. REGULATORY COMPLIANCE
 *    - Full audit trail for inspections
 *    - Traceability from birth to sale/death
 *    - Movement records cannot be altered
 * 
 * 2. OPERATIONAL VISIBILITY
 *    - Know exactly where every lot has been
 *    - Track cleaning/maintenance compliance
 *    - Identify process bottlenecks
 * 
 * 3. ERROR RECOVERY
 *    - Mistakes can be traced and corrected
 *    - State can be reconstructed if needed
 *    - No silent data corruption
 * 
 * 4. BUSINESS INTELLIGENCE
 *    - Rich data for reporting
 *    - Trend analysis possible
 *    - KPI calculation straightforward
 */

// ============================================================================
// 6. INTEGRATION WITH LOT SUBDIVISION WORKFLOWS
// ============================================================================

/**
 * SUBDIVISION → RELOCATION PATTERN
 * 
 * When a lot is subdivided (e.g., sex separation at weaning):
 * 
 * 1. Original lot (mixed) is subdivided into child lots (male, female)
 * 2. Child lots inherit parent's cage assignment initially
 * 3. Child lots often need relocation to separate cages
 * 
 * THE relocateSubdividedLots() FUNCTION:
 * 
 *   relocateSubdividedLots({
 *     parentLotId: 'lot-123',
 *     childLotIds: ['lot-124', 'lot-125'],
 *     targetCageAssignments: [
 *       { lotId: 'lot-124', cageId: 'cage-male', notes: 'Males' },
 *       { lotId: 'lot-125', cageId: 'cage-female', notes: 'Females' },
 *     ],
 *   });
 * 
 * This handles:
 * - Checking current locations of child lots
 * - Moving from parent cage to target cages
 * - Recording all movements with proper context
 * - Error handling for capacity issues
 * 
 * LINEAGE PRESERVATION:
 * 
 *   Child lots maintain:
 *   - originLotId → parent lot
 *   - ancestors[] → full ancestry chain
 *   - generationDepth → incremented from parent
 *   
 *   Cage movements do NOT affect lineage.
 *   Lineage tracks biological descent.
 *   Movements track spatial history.
 *   These are orthogonal concerns.
 */

// ============================================================================
// SUMMARY
// ============================================================================

/**
 * The Cage Occupancy Runtime System is built on these principles:
 * 
 * 1. OCCUPANCY IS DERIVED, NOT STORED
 *    - Ensures consistency with lot quantities
 *    - Supports real-time accuracy
 *    - Enables historical reconstruction
 * 
 * 2. MOVEMENT HISTORY IS IMMUTABLE
 *    - Complete traceability
 *    - Audit compliance
 *    - Temporal queries possible
 * 
 * 3. LOT/CAGE RELATIONSHIPS ARE EVENT-DRIVEN
 *    - Operations create events, not state changes
 *    - Events trigger workflows
 *    - Events persist indefinitely
 * 
 * 4. DESIGNED FOR ANALYTICS AND AI
 *    - Rich data structures
 *    - Time-series support
 *    - Graph-based movement analysis
 * 
 * 5. OPERATIONAL REALISM
 *    - Models actual bioterio workflows
 *    - Supports subdivision/relocation patterns
 *    - Handles cleaning/maintenance cycles
 * 
 * This foundation enables:
 * - Regulatory compliance
 * - Operational efficiency
 * - Business intelligence
 * - Future AI optimization
 */

export {};
