/**
 * Operational Availability Engine — Core Operations
 *
 * Pure functions that derive operational availability from raw data.
 * No side effects. No DB calls. Fully testable.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  AVAILABILITY DERIVATION PIPELINE                          │
 * │                                                             │
 * │  1. getOperationalAvailability(lots, reservations)          │
 * │     → InventoryClassificationState[]                        │
 * │                                                             │
 * │  2. getProjectedAvailability(lots, settings, sizeClasses)   │
 * │     → AvailabilityProjection                               │
 * │                                                             │
 * │  3. validateAvailability(states, reservations)              │
 * │     → AvailabilityValidationResult                         │
 * │                                                             │
 * │  4. classifyInventoryAvailability(lot, sizeClasses)         │
 * │     → InventoryAvailabilityStatus                          │
 * └─────────────────────────────────────────────────────────────┘
 */

import type {
  InventorySnapshot,
  InventoryClassificationState,
  InventoryReservation,
  AvailabilityProjection,
  AvailabilityTimeline,
  ProjectedAvailability,
  AvailabilityWindow,
  AvailabilityValidationResult,
  AvailabilityValidationIssue,
  AvailabilityBottleneck,
  LowStockAlert,
  LotForAvailability,
  SpeciesSettingsForProjection,
  InventoryMovementRecord,
  InventoryMovementType,
  CreateReservationInput,
  InventorySnapshotSummary,
} from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

const LOW_STOCK_THRESHOLD_DEFAULT = 10;
const STALE_RESERVATION_DAYS = 7;
const PROJECTION_DAYS = 30;

// ============================================================================
// 1. OPERATIONAL AVAILABILITY
// ============================================================================

/**
 * Derives the current operational availability from active lots and reservations.
 *
 * ALGORITHM:
 * 1. Filter lots to active, sellable types (nacimiento, engorda).
 * 2. Group by (speciesProfileId, sizeClassId).
 * 3. Sum actual quantities per group.
 * 4. Subtract active reservations per group.
 * 5. Return InventoryClassificationState[].
 */
export function getOperationalAvailability(
  lots: LotForAvailability[],
  activeReservations: InventoryReservation[],
  lowStockThreshold = LOW_STOCK_THRESHOLD_DEFAULT
): InventoryClassificationState[] {
  // Only count lots that are active and sellable
  const sellableLots = lots.filter(
    (l) => l.estado === 'activo' && ['nacimiento', 'engorda'].includes(l.tipo)
  );

  // Group lots by classification key
  const grouped = new Map<string, LotForAvailability[]>();

  for (const lot of sellableLots) {
    if (!lot.size_class_id || !lot.size_class) continue;

    const key = `${lot.size_class.species_profile_id}::${lot.size_class_id}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(lot);
  }

  const states: InventoryClassificationState[] = [];

  for (const [key, groupLots] of grouped) {
    const [speciesProfileId, sizeClassId] = key.split('::');
    const representativeLot = groupLots[0];
    const sizeClass = representativeLot.size_class!;
    const speciesProfile = representativeLot.species_profile;

    const totalAnimals = groupLots.reduce(
      (sum, l) => sum + (l.cantidad_actual ?? 0),
      0
    );

    // Sum reservations for this classification
    const reservedQuantity = activeReservations
      .filter(
        (r) =>
          r.speciesProfileId === speciesProfileId &&
          r.sizeClassId === sizeClassId &&
          r.status === 'active'
      )
      .reduce((sum, r) => sum + r.remainingQuantity, 0);

    const available = Math.max(0, totalAnimals - reservedQuantity);

    const estimatedValue = sizeClass.sale_price
      ? available * sizeClass.sale_price
      : 0;

    states.push({
      speciesProfileId,
      speciesDisplayName: speciesProfile?.display_name ?? '',
      taxonomyKey: speciesProfile?.taxonomy_key ?? '',
      sizeClassId,
      sizeClassName: sizeClass.display_name,
      sizeClassCode: sizeClass.code,

      totalAnimals,
      available,
      reserved: reservedQuantity,
      blocked: 0, // TODO: integrate quarantine/blocked states

      statusBreakdown: {
        available,
        reserved: reservedQuantity,
        quarantined: 0,
        pendingWeaning: 0,
        pendingSubdivision: 0,
      },

      lotIds: groupLots.map((l) => l.id),
      lotCount: groupLots.length,

      salePrice: sizeClass.sale_price ?? undefined,
      estimatedValue,

      displayOrder: sizeClass.display_order,
    });
  }

  // Sort by displayOrder for consistent rendering
  return states.sort((a, b) => {
    if (a.speciesProfileId !== b.speciesProfileId) {
      return a.speciesProfileId.localeCompare(b.speciesProfileId);
    }
    return a.displayOrder - b.displayOrder;
  });
}

// ============================================================================
// 2. INVENTORY SNAPSHOT
// ============================================================================

/**
 * Builds a complete InventorySnapshot — the root object for the availability engine.
 */
export function buildInventorySnapshot(
  workspaceId: string,
  lots: LotForAvailability[],
  activeReservations: InventoryReservation[],
  lowStockThreshold = LOW_STOCK_THRESHOLD_DEFAULT
): InventorySnapshot {
  const classificationStates = getOperationalAvailability(
    lots,
    activeReservations,
    lowStockThreshold
  );

  const summary = buildSnapshotSummary(classificationStates, activeReservations, lowStockThreshold);

  return {
    workspaceId,
    computedAt: new Date().toISOString(),
    classificationStates,
    activeReservations,
    summary,
  };
}

function buildSnapshotSummary(
  states: InventoryClassificationState[],
  reservations: InventoryReservation[],
  lowStockThreshold: number
): InventorySnapshotSummary {
  const totalAvailable = states.reduce((s, c) => s + c.available, 0);
  const totalReserved = states.reduce((s, c) => s + c.reserved, 0);
  const totalBlocked = states.reduce((s, c) => s + c.blocked, 0);
  const speciesCount = new Set(states.map((s) => s.speciesProfileId)).size;

  const lowStockAlerts: LowStockAlert[] = states
    .filter((s) => s.available <= lowStockThreshold && s.available > 0)
    .map((s) => ({
      speciesProfileId: s.speciesProfileId,
      sizeClassId: s.sizeClassId,
      speciesName: s.speciesName,
      sizeClassName: s.sizeClassName,
      currentAvailable: s.available,
      threshold: lowStockThreshold,
      severity: s.available <= lowStockThreshold / 2 ? 'critical' : 'warning',
    }));

  return {
    totalAvailable,
    totalReserved,
    totalProjected: 0, // populated by projection engine
    totalBlocked,
    speciesCount,
    activeReservationCount: reservations.filter((r) => r.status === 'active').length,
    lowStockAlerts,
  };
}

// ============================================================================
// 3. AVAILABILITY PROJECTION ENGINE
// ============================================================================

/**
 * Projects future inventory availability based on:
 * - Current lots and their age/size class
 * - Species operational settings (growth curves, mortality rates)
 * - Expected weaning and subdivision timelines
 *
 * OUTPUT: "In 5 days: 120 Hopper ASF available"
 */
export function getProjectedAvailability(
  lots: LotForAvailability[],
  sizeClasses: Array<{
    id: string;
    species_profile_id: string;
    name: string;
    code?: string;
    min_age_days?: number | null;
    max_age_days?: number | null;
    display_order: number;
    sale_price?: number | null;
  }>,
  speciesSettings: SpeciesSettingsForProjection[],
  projectionDays = PROJECTION_DAYS
): AvailabilityProjection {
  const timelines: AvailabilityTimeline[] = [];
  const now = new Date();

  // Group size classes by species profile
  const sizeClassesByProfile = new Map<string, typeof sizeClasses>();
  for (const sc of sizeClasses) {
    if (!sizeClassesByProfile.has(sc.species_profile_id)) {
      sizeClassesByProfile.set(sc.species_profile_id, []);
    }
    sizeClassesByProfile.get(sc.species_profile_id)!.push(sc);
  }

  // Get unique species profile IDs from active lots
  const profileIds = new Set<string>();
  for (const lot of lots) {
    if (lot.size_class?.species_profile_id) {
      profileIds.add(lot.size_class.species_profile_id);
    }
  }

  for (const profileId of profileIds) {
    const profileSizeClasses = sizeClassesByProfile.get(profileId) ?? [];
    const settings = speciesSettings.find((s) => s.speciesProfileId === profileId);
    const mortalityFactor = settings ? 1 - settings.expectedMortalityRate : 0.95;

    const profileLots = lots.filter(
      (l) => l.size_class?.species_profile_id === profileId && l.estado === 'activo'
    );

    for (const sizeClass of profileSizeClasses) {
      const dailyProjections: ProjectedAvailability[] = [];

      for (let dayOffset = 0; dayOffset < projectionDays; dayOffset++) {
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + dayOffset);
        const targetDayStr = targetDate.toISOString().split('T')[0];

        // Find lots that will be in this size class on the target date
        const contributingLots = profileLots.filter((lot) => {
          if (!lot.fecha_nacimiento) return false;

          const birthDate = new Date(lot.fecha_nacimiento);
          const ageDays = Math.floor(
            (targetDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          const minAge = sizeClass.min_age_days ?? 0;
          const maxAge = sizeClass.max_age_days ?? Infinity;

          return ageDays >= minAge && ageDays <= maxAge;
        });

        if (contributingLots.length === 0) continue;

        const rawQuantity = contributingLots.reduce(
          (sum, l) => sum + (l.cantidad_actual ?? 0),
          0
        );

        const projectedQuantity = Math.floor(rawQuantity * mortalityFactor);

        if (projectedQuantity <= 0) continue;

        dailyProjections.push({
          date: targetDayStr,
          speciesProfileId: profileId,
          sizeClassId: sizeClass.id,
          sizeClassName: sizeClass.name,
          speciesName: profileLots[0].species_profile?.species_name ?? '',
          projectedQuantity,
          confidence: dayOffset < 7 ? 'high' : dayOffset < 14 ? 'medium' : 'low',
          sourceLotIds: contributingLots.map((l) => l.id),
          mortalityFactor,
          growthFactor: 1.0,
        });
      }

      if (dailyProjections.length === 0) continue;

      // Find peak window
      const peakWindow = findPeakAvailabilityWindow(dailyProjections);

      timelines.push({
        speciesProfileId: profileId,
        sizeClassId: sizeClass.id,
        speciesName: profileLots[0].species_profile?.species_name ?? '',
        sizeClassName: sizeClass.name,
        dailyProjections,
        peakWindow,
      });
    }
  }

  const bottlenecks = detectBottlenecks(timelines, lots);
  const nextSevenDays = flattenProjections(timelines, 7);
  const nextThirtyDays = flattenProjections(timelines, 30);

  return {
    workspaceId: lots[0]?.species_profile?.id ?? '',
    computedAt: now.toISOString(),
    timelines,
    bottlenecks,
    nextSevenDays,
    nextThirtyDays,
  };
}

/**
 * Flatten projections across all timelines for a given number of days from today.
 */
function flattenProjections(
  timelines: AvailabilityTimeline[],
  days: number
): ProjectedAvailability[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  return timelines
    .flatMap((t) => t.dailyProjections)
    .filter((p) => p.date <= cutoffStr)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Identify the peak availability window for a timeline.
 */
function findPeakAvailabilityWindow(
  projections: ProjectedAvailability[]
): AvailabilityWindow | undefined {
  if (projections.length === 0) return undefined;

  const maxQty = Math.max(...projections.map((p) => p.projectedQuantity));
  const peakProjections = projections.filter(
    (p) => p.projectedQuantity >= maxQty * 0.85 // 85% of peak = "peak window"
  );

  if (peakProjections.length === 0) return undefined;

  return {
    speciesProfileId: projections[0].speciesProfileId,
    sizeClassId: projections[0].sizeClassId,
    startDate: peakProjections[0].date,
    endDate: peakProjections[peakProjections.length - 1].date,
    minimumQuantity: Math.min(...peakProjections.map((p) => p.projectedQuantity)),
    maximumQuantity: maxQty,
    averageQuantity: Math.round(
      peakProjections.reduce((s, p) => s + p.projectedQuantity, 0) / peakProjections.length
    ),
    confidence: peakProjections[0].confidence,
  };
}

/**
 * Detect operational bottlenecks in projections.
 */
function detectBottlenecks(
  timelines: AvailabilityTimeline[],
  lots: LotForAvailability[]
): AvailabilityBottleneck[] {
  const bottlenecks: AvailabilityBottleneck[] = [];

  // Detect species+size combos with NO projection at all
  const timelinesWithData = new Set(
    timelines
      .filter((t) => t.dailyProjections.length > 0)
      .map((t) => `${t.speciesProfileId}::${t.sizeClassId}`)
  );

  // Detect lots without size class assignment
  const unclassifiedLots = lots.filter(
    (l) => !l.size_class_id && l.estado === 'activo'
  );

  if (unclassifiedLots.length > 0) {
    bottlenecks.push({
      type: 'no_projection',
      description: `${unclassifiedLots.length} lotes activos sin clasificación de tamaño asignada. Ejecuta el Asistente de Migración.`,
      severity: 'warning',
    });
  }

  return bottlenecks;
}

// ============================================================================
// 4. RESERVATION OPERATIONS
// ============================================================================

/**
 * Create a new reservation (pure function — caller must persist the result).
 * Validates that sufficient inventory is available before creating.
 */
export function createReservation(
  input: CreateReservationInput,
  currentStates: InventoryClassificationState[],
  existingReservations: InventoryReservation[]
): { reservation: InventoryReservation | null; error?: string } {
  const classificationState = currentStates.find(
    (s) =>
      s.speciesProfileId === input.speciesProfileId &&
      s.sizeClassId === input.sizeClassId
  );

  if (!classificationState) {
    return { reservation: null, error: 'Clasificación no encontrada en el inventario actual.' };
  }

  if (classificationState.available < input.quantity) {
    return {
      reservation: null,
      error: `Disponibilidad insuficiente. Disponible: ${classificationState.available}, solicitado: ${input.quantity}.`,
    };
  }

  const reservation: InventoryReservation = {
    id: crypto.randomUUID(),
    workspaceId: input.workspaceId,
    speciesProfileId: input.speciesProfileId,
    sizeClassId: input.sizeClassId,
    quantity: input.quantity,
    customerId: input.customerId,
    customerName: input.customerName,
    orderId: input.orderId,
    status: 'active',
    createdAt: new Date().toISOString(),
    expiresAt: input.expiresAt,
    notes: input.notes,
    fulfilledQuantity: 0,
    remainingQuantity: input.quantity,
  };

  return { reservation };
}

/**
 * Release (cancel) a reservation.
 */
export function releaseReservation(
  reservation: InventoryReservation,
  reason?: string
): InventoryReservation {
  return {
    ...reservation,
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
    notes: reason
      ? `${reservation.notes ?? ''} [Cancelado: ${reason}]`.trim()
      : reservation.notes,
  };
}

/**
 * Partially or fully fulfill a reservation.
 */
export function fulfillReservation(
  reservation: InventoryReservation,
  quantity: number
): InventoryReservation {
  const newFulfilled = reservation.fulfilledQuantity + quantity;
  const newRemaining = reservation.quantity - newFulfilled;

  return {
    ...reservation,
    fulfilledQuantity: newFulfilled,
    remainingQuantity: Math.max(0, newRemaining),
    status: newRemaining <= 0 ? 'fulfilled' : 'active',
    fulfilledAt: newRemaining <= 0 ? new Date().toISOString() : undefined,
  };
}

// ============================================================================
// 5. VALIDATION
// ============================================================================

/**
 * Validate inventory states and reservations for operational integrity.
 */
export function validateAvailability(
  states: InventoryClassificationState[],
  reservations: InventoryReservation[]
): AvailabilityValidationResult {
  const issues: AvailabilityValidationIssue[] = [];
  const warnings: AvailabilityValidationIssue[] = [];
  const now = new Date();

  for (const state of states) {
    // Over-reservation check
    if (state.reserved > state.totalAnimals) {
      issues.push({
        type: 'over_reservation',
        severity: 'error',
        speciesProfileId: state.speciesProfileId,
        sizeClassId: state.sizeClassId,
        message: `Sobre-reserva detectada: ${state.reserved} reservados pero solo ${state.totalAnimals} animales disponibles en ${state.speciesName} - ${state.sizeClassName}.`,
      });
    }

    // Negative availability check
    if (state.available < 0) {
      issues.push({
        type: 'negative_availability',
        severity: 'error',
        speciesProfileId: state.speciesProfileId,
        sizeClassId: state.sizeClassId,
        message: `Disponibilidad negativa (${state.available}) en ${state.speciesName} - ${state.sizeClassName}.`,
      });
    }
  }

  for (const reservation of reservations) {
    if (reservation.status !== 'active') continue;

    // Stale reservation check
    const createdAt = new Date(reservation.createdAt);
    const daysSinceCreation =
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceCreation > STALE_RESERVATION_DAYS) {
      warnings.push({
        type: 'stale_reservation',
        severity: 'warning',
        reservationId: reservation.id,
        message: `Reserva ${reservation.id.slice(0, 8)} lleva más de ${STALE_RESERVATION_DAYS} días activa sin cumplirse. Verificar si sigue vigente.`,
      });
    }

    // Expired reservation check
    if (reservation.expiresAt) {
      const expiresAt = new Date(reservation.expiresAt);
      if (now > expiresAt) {
        warnings.push({
          type: 'expired_reservation',
          severity: 'warning',
          reservationId: reservation.id,
          message: `Reserva ${reservation.id.slice(0, 8)} venció el ${reservation.expiresAt}. Debe ser cancelada o renovada.`,
        });
      }
    }

    // Orphan reservation check (references a classification that no longer has inventory)
    const matchingState = states.find(
      (s) =>
        s.speciesProfileId === reservation.speciesProfileId &&
        s.sizeClassId === reservation.sizeClassId
    );
    if (!matchingState) {
      issues.push({
        type: 'orphan_reservation',
        severity: 'error',
        reservationId: reservation.id,
        message: `Reserva ${reservation.id.slice(0, 8)} apunta a una clasificación que ya no existe en el inventario.`,
      });
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings,
  };
}

// ============================================================================
// 6. INVENTORY CLASSIFICATION
// ============================================================================

/**
 * Classify a single lot's operational availability status.
 */
export function classifyInventoryAvailability(
  lot: LotForAvailability,
  activeReservations: InventoryReservation[]
): 'available' | 'reserved' | 'pendingWeaning' | 'pendingSubdivision' | 'blocked' {
  if (lot.estado !== 'activo') return 'blocked';
  if (!lot.size_class_id) return 'pendingWeaning';
  if (lot.tipo === 'reproduccion') return 'blocked';

  const lotReservations = activeReservations.filter(
    (r) => r.sizeClassId === lot.size_class_id && r.status === 'active'
  );

  if (lotReservations.length > 0) {
    const totalReserved = lotReservations.reduce((s, r) => s + r.remainingQuantity, 0);
    if (totalReserved >= (lot.cantidad_actual ?? 0)) return 'reserved';
  }

  return 'available';
}

// ============================================================================
// 7. INVENTORY GROWTH PROJECTION
// ============================================================================

/**
 * Calculate how a lot's animals will progress through size classes over time.
 * Returns the expected size class for each day in the range.
 */
export function calculateProjectedGrowth(
  lot: LotForAvailability,
  sizeClasses: Array<{
    id: string;
    name: string;
    min_age_days?: number | null;
    max_age_days?: number | null;
    display_order: number;
  }>,
  daysAhead = 30
): Array<{ date: string; sizeClassId: string; sizeClassName: string; projectedQuantity: number }> {
  if (!lot.fecha_nacimiento) return [];

  const birthDate = new Date(lot.fecha_nacimiento);
  const now = new Date();
  const results = [];

  const sortedClasses = [...sizeClasses].sort((a, b) => a.display_order - b.display_order);

  for (let dayOffset = 0; dayOffset <= daysAhead; dayOffset++) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + dayOffset);

    const ageDays = Math.floor(
      (targetDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const matchingClass = sortedClasses.find((sc) => {
      const minAge = sc.min_age_days ?? 0;
      const maxAge = sc.max_age_days ?? Infinity;
      return ageDays >= minAge && ageDays <= maxAge;
    });

    if (!matchingClass) continue;

    results.push({
      date: targetDate.toISOString().split('T')[0],
      sizeClassId: matchingClass.id,
      sizeClassName: matchingClass.name,
      projectedQuantity: lot.cantidad_actual ?? 0,
    });
  }

  return results;
}

// ============================================================================
// 8. AVAILABILITY TIMELINE QUERY
// ============================================================================

/**
 * Answer the question: "What inventory will be available on a specific date?"
 */
export function getAvailabilityTimeline(
  projection: AvailabilityProjection,
  targetDate: string
): ProjectedAvailability[] {
  return projection.timelines
    .flatMap((t) => t.dailyProjections)
    .filter((p) => p.date === targetDate)
    .sort((a, b) => a.speciesName.localeCompare(b.speciesName));
}

/**
 * Answer: "How many [sizeClassName] [speciesName] can I sell today/on date?"
 */
export function queryAvailabilityForClassification(
  snapshot: InventorySnapshot,
  speciesProfileId: string,
  sizeClassId: string
): {
  currentAvailable: number;
  reserved: number;
  totalAnimals: number;
  state: InventoryClassificationState | null;
} {
  const state = snapshot.classificationStates.find(
    (s) =>
      s.speciesProfileId === speciesProfileId && s.sizeClassId === sizeClassId
  );

  return {
    currentAvailable: state?.available ?? 0,
    reserved: state?.reserved ?? 0,
    totalAnimals: state?.totalAnimals ?? 0,
    state: state ?? null,
  };
}

// ============================================================================
// 9. INVENTORY MOVEMENT HISTORY
// ============================================================================

/**
 * Create an immutable inventory movement record.
 * These records cannot be edited — they form the audit trail.
 */
export function createMovementRecord(
  workspaceId: string,
  movementType: InventoryMovementType,
  summary: string,
  details?: Partial<Omit<InventoryMovementRecord, 'id' | 'workspaceId' | 'movementType' | 'timestamp' | 'summary'>>
): InventoryMovementRecord {
  return {
    id: crypto.randomUUID(),
    workspaceId,
    movementType,
    timestamp: new Date().toISOString(),
    summary,
    ...details,
  };
}

// ============================================================================
// 10. PROJECTION REBUILD
// ============================================================================

/**
 * Reconcile inventory state after bulk changes.
 * Returns a fresh snapshot and projection for re-rendering.
 */
export function reconcileInventoryState(
  workspaceId: string,
  lots: LotForAvailability[],
  reservations: InventoryReservation[],
  sizeClasses: Parameters<typeof getProjectedAvailability>[1],
  speciesSettings: SpeciesSettingsForProjection[]
): {
  snapshot: InventorySnapshot;
  projection: AvailabilityProjection;
  validation: AvailabilityValidationResult;
} {
  const snapshot = buildInventorySnapshot(workspaceId, lots, reservations);
  const projection = getProjectedAvailability(lots, sizeClasses, speciesSettings);
  const validation = validateAvailability(snapshot.classificationStates, reservations);

  return { snapshot, projection, validation };
}
