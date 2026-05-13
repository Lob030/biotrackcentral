/**
 * Bioterio Lot Runtime - Documentation
 * 
 * This document explains the architectural decisions and operational model
 * of the lot-centric bioterio management system.
 */

/**
 * =============================================================================
 * WHY THE SYSTEM IS LOT-CENTRIC
 * =============================================================================
 * 
 * The Bioterio blueprint is designed around LOTS (groups of animals) rather
 * than individual animals. This decision is driven by operational reality:
 * 
 * 1. SCALE OF OPERATIONS
 *    - Bioterios typically manage hundreds or thousands of small animals
 *    - Mice, rats, and similar species are too small for practical individual tagging
 *    - Individual tracking would be cost-prohibitive and operationally burdensome
 * 
 * 2. ANIMAL LIFECYCLE
 *    - Many animals do not remain long-term in the facility
 *    - They are born, raised, and sold/transferred as groups
 *    - Individual tracking provides minimal operational value
 * 
 * 3. OPERATIONAL EFFICIENCY
 *    - Daily operations (feeding, cleaning, health checks) are performed at cage/lot level
 *    - Breeding decisions are made at the lot level
 *    - Sales and transfers happen in quantities, not individual animals
 * 
 * 4. REGULATORY COMPLIANCE
 *    - Most regulations require batch/lot traceability, not individual tracking
 *    - Lineage must be preserved, but at the group level
 * 
 * 5. DATA MODEL SIMPLICITY
 *    - Lot-based systems are simpler to implement and maintain
 *    - Queries and reports are more straightforward
 *    - Performance is better with fewer entities to track
 * 
 * 
 * =============================================================================
 * HOW LINEAGE IS PRESERVED
 * =============================================================================
 * 
 * Lineage preservation is CRITICAL for breeding programs and traceability.
 * The system maintains lineage through the following mechanisms:
 * 
 * 1. ORIGIN TRACKING
 *    - Every lot has an `originLotId` field (if it came from another lot)
 *    - Root lots (internal births, external purchases) have no origin
 *    - This creates a parent-child relationship chain
 * 
 * 2. ANCESTOR CHAIN
 *    - Each lot maintains an `ancestors` array in its lineage
 *    - This array contains ALL ancestor lot IDs from oldest to most recent
 *    - Example: [ASF-001, ASF-001-M, ASF-001-M-A] for a third-generation lot
 * 
 * 3. GENERATION DEPTH
 *    - The `generationDepth` field tracks how many generations deep a lot is
 *    - Root lots have depth 0
 *    - Their children have depth 1, grandchildren depth 2, etc.
 * 
 * 4. SUBDIVISION RECORDS
 *    - Parent lots maintain a `subdivisions` array
 *    - Each record tracks which child lots were created
 *    - Includes quantity allocated, sex, date, and notes
 * 
 * 5. LIFECYCLE EVENTS
 *    - Every significant event is recorded with full context
 *    - Subdivision events include references to all child lots
 *    - Creation events include parent lot references
 * 
 * EXAMPLE LINEAGE FLOW:
 * 
 *   Generation 0: ASF-001 (mixed breeding pair lot)
 *                    |
 *                    |--- subdivision into male/female lots
 *                    |
 *   Generation 1: ASF-001-M (males)    ASF-001-F (females)
 *                    |
 *                    |--- offspring born
 *                    |
 *   Generation 2: ASF-001-M-001 (offspring lot)
 *                    |
 *                    |--- sold to customer
 *                    |
 *   Status: SOLD (lineage preserved forever)
 * 
 * 
 * =============================================================================
 * HOW SUBDIVISIONS WORK OPERATIONALLY
 * =============================================================================
 * 
 * Subdivision is the PRIMARY mechanism for lot transformation. Common scenarios:
 * 
 * 1. SEX SEPARATION (Most Common)
 *    Original: ASF-001 (mixed, 20 animals)
 *    
 *    Operation: Separate males from females
 *    
 *    Result:
 *      - ASF-001-M (male, 10 animals) - NEW LOT
 *      - ASF-001-F (female, 10 animals) - NEW LOT
 *      - ASF-001 status -> 'subdivided'
 *    
 *    Both child lots preserve:
 *      - Same species and strain
 *      - Same birth/acquisition dates
 *      - Origin reference to ASF-001
 *      - Full ancestor chain
 * 
 * 2. WEANING SEPARATION
 *    Original: BREED-001 (breeding colony with offspring)
 *    
 *    Operation: Wean offspring into separate lots
 *    
 *    Result:
 *      - BREED-001 (breeding adults only) - UPDATED
 *      - WEAN-001-A (first weanling group) - NEW LOT
 *      - WEAN-001-B (second weanling group) - NEW LOT
 * 
 * 3. EXPERIMENTAL ALLOCATION
 *    Original: STOCK-001 (general stock, 100 animals)
 *    
 *    Operation: Allocate animals to different experiments
 *    
 *    Result:
 *      - STOCK-001 (remaining stock) - UPDATED
 *      - EXP-001-A (experiment A group) - NEW LOT
 *      - EXP-001-B (experiment B group) - NEW LOT
 * 
 * SUBDIVISION PROCESS:
 * 
 * Step 1: Validate
 *   - Parent lot must be 'active'
 *   - Total subdivided quantity <= current quantity
 *   - All required fields provided
 * 
 * Step 2: Create Child Lots
 *   - Generate new IDs and codes
 *   - Copy relevant attributes from parent
 *   - Set originLotId to parent
 *   - Build complete ancestor chain
 *   - Initialize as 'active' status
 * 
 * Step 3: Update Parent
 *   - Reduce current quantity
 *   - Add subdivision records to lineage
 *   - Mark as 'subdivided' if fully distributed
 * 
 * Step 4: Record Events
 *   - Log creation events for each child
 *   - Log subdivision event for parent
 *   - Include all metadata for audit trail
 * 
 * 
 * =============================================================================
 * HOW THIS DIFFERS FROM PET/VETERINARY BLUEPRINTS
 * =============================================================================
 * 
 * The Bioterio blueprint is fundamentally different from pet/veterinary systems:
 * 
 * 1. ENTITY FOCUS
 *    Bioterio:     LOTS (groups) are primary entities
 *    Pet/Vet:      INDIVIDUAL ANIMALS are primary entities
 * 
 * 2. IDENTIFICATION
 *    Bioterio:     Lot codes (e.g., "ASF-001")
 *    Pet/Vet:      Individual IDs, microchips, names
 * 
 * 3. MEDICAL RECORDS
 *    Bioterio:     Health tracked at lot/cage level
 *    Pet/Vet:      Detailed individual medical histories
 * 
 * 4. LIFECYCLE
 *    Bioterio:     Animals may be short-term, high-turnover
 *    Pet/Vet:      Long-term relationships with individual animals
 * 
 * 5. OPERATIONS
 *    Bioterio:     Batch operations (feed all, sell N animals)
 *    Pet/Vet:      Individual appointments, treatments
 * 
 * 6. TRACEABILITY
 *    Bioterio:     Lineage through lot subdivisions
 *    Pet/Vet:      Pedigree of individual animals
 * 
 * 7. METRICS
 *    Bioterio:     Population statistics, breeding rates, mortality rates
 *    Pet/Vet:      Individual health outcomes, treatment success
 * 
 * 
 * =============================================================================
 * FUTURE EXTENSIONS PREPARED FOR
 * =============================================================================
 * 
 * The lot runtime is designed to support future capabilities:
 * 
 * 1. ANALYTICS
 *    - Breeding performance by strain
 *    - Mortality rate tracking
 *    - Growth rate analysis
 *    - Turnover metrics
 * 
 * 2. AI OPERATIONAL ASSISTANT
 *    - Predictive breeding recommendations
 *    - Optimal subdivision timing
 *    - Inventory forecasting
 *    - Anomaly detection (mortality spikes)
 * 
 * 3. CAGE OCCUPANCY
 *    - Location tracking integration
 *    - Capacity management
 *    - Move/space optimization
 * 
 * 4. BREEDING WORKFLOWS
 *    - Breeding pair formation
 *    - Pregnancy tracking
 *    - Litter recording
 *    - Weaning management
 * 
 * 5. INTEGRATION POINTS
 *    - Database persistence layer
 *    - Event sourcing for audit
 *    - API endpoints for UI
 *    - Import/export utilities
 */

export const LOT_RUNTIME_DOCUMENTATION = {
  version: '1.0.0',
  architecture: 'lot-centric',
  lastUpdated: new Date().toISOString(),
};
