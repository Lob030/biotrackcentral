/**
 * Bioterio Lot Runtime - Core Operations
 *
 * In-memory lot operations. Lots are species-profile-scoped exclusively;
 * the resolver injects display data when needed for UI. No string-species
 * fallbacks anywhere in this layer.
 */

import type {
  Lot,
  LotStatus,
  LotLineage,
  LotSubdivision,
  LotLifecycleEvent,
  CreateLotOptions,
  SubdivideLotOptions,
  LotQueryFilters,
  LotSummary,
  SpeciesProfileId,
} from "./types";

class LotStore {
  private lots: Map<string, Lot> = new Map();
  private events: Map<string, LotLifecycleEvent[]> = new Map();

  save(lot: Lot): void { this.lots.set(lot.id, lot); }
  get(id: string): Lot | undefined { return this.lots.get(id); }
  getAll(): Lot[] { return Array.from(this.lots.values()); }
  delete(id: string): boolean { return this.lots.delete(id); }
  addEvent(event: LotLifecycleEvent): void {
    const arr = this.events.get(event.lotId) ?? [];
    arr.push(event);
    this.events.set(event.lotId, arr);
  }
  getEvents(lotId: string): LotLifecycleEvent[] {
    return this.events.get(lotId) ?? [];
  }
}

const store = new LotStore();

function generateId(): string { return crypto.randomUUID(); }

/**
 * Generate a human-readable lot code. The species-profile-driven prefix is
 * resolved upstream and passed in as `strain`; if the caller does not
 * provide one we fall back to a generic LOT prefix — never a species alias.
 */
function generateLotCode(strain?: string): string {
  const prefix = strain ? strain.substring(0, 3).toUpperCase() : "LOT";
  const seq = Math.floor(Math.random() * 900) + 100;
  return `${prefix}-${seq}`;
}

export function createLot(options: CreateLotOptions): Lot {
  if (!options.speciesProfileId) {
    throw new Error("createLot: speciesProfileId is required");
  }
  const now = new Date();
  const id = generateId();
  const code = generateLotCode(options.strain);

  let lineage: LotLineage;
  if (options.originLotId) {
    const origin = store.get(options.originLotId);
    const ancestors = origin
      ? [...origin.lineage.ancestors, options.originLotId]
      : [options.originLotId];
    lineage = {
      lotId: id,
      originLotId: options.originLotId,
      sourceType: options.sourceType,
      subdivisions: [],
      ancestors,
      generationDepth: ancestors.length,
    };
  } else {
    lineage = {
      lotId: id,
      sourceType: options.sourceType,
      subdivisions: [],
      ancestors: [],
      generationDepth: 0,
    };
  }

  const lot: Lot = {
    id,
    code,
    speciesProfileId: options.speciesProfileId,
    strain: options.strain,
    sex: options.sex,
    initialQuantity: options.quantity,
    currentQuantity: options.quantity,
    birthDate: options.birthDate,
    acquisitionDate: options.acquisitionDate,
    createdAt: now,
    updatedAt: now,
    sourceType: options.sourceType,
    originLotId: options.originLotId,
    supplierName: options.supplierName,
    status: "active",
    location: options.location,
    lineage,
    notes: options.notes,
    tags: options.tags,
    sizeClassId: options.sizeClassId,
  };

  store.save(lot);
  store.addEvent({
    id: generateId(),
    lotId: id,
    eventType: "created",
    timestamp: now,
    quantity: options.quantity,
    reason: `Lot created via ${options.sourceType}`,
    metadata: {
      speciesProfileId: options.speciesProfileId,
      sex: options.sex,
      strain: options.strain,
    },
  });

  return lot;
}

export function subdivideLot(
  options: SubdivideLotOptions,
): { parentLot: Lot; childLots: Lot[] } {
  const parentLot = store.get(options.lotId);
  if (!parentLot) throw new Error(`Lot not found: ${options.lotId}`);
  if (parentLot.status !== "active") {
    throw new Error(
      `Cannot subdivide lot with status '${parentLot.status}'.`,
    );
  }

  const total = options.subdivisions.reduce((s, x) => s + x.quantity, 0);
  if (total > parentLot.currentQuantity) {
    throw new Error(
      `Cannot subdivide ${total} from lot with ${parentLot.currentQuantity}.`,
    );
  }

  const now = new Date();
  const childLots: Lot[] = [];

  for (const sub of options.subdivisions) {
    const childId = generateId();
    const childCode = `${parentLot.code}${sub.codeSuffix ?? ""}`;
    const ancestors = [...parentLot.lineage.ancestors, parentLot.id];

    const childLot: Lot = {
      id: childId,
      code: childCode,
      speciesProfileId: parentLot.speciesProfileId,
      strain: parentLot.strain,
      sex: sub.sex,
      initialQuantity: sub.quantity,
      currentQuantity: sub.quantity,
      birthDate: parentLot.birthDate,
      acquisitionDate: parentLot.acquisitionDate,
      createdAt: now,
      updatedAt: now,
      sourceType: "transfer",
      originLotId: parentLot.id,
      status: "active",
      location: parentLot.location,
      lineage: {
        lotId: childId,
        originLotId: parentLot.id,
        sourceType: "transfer",
        subdivisions: [],
        ancestors,
        generationDepth: ancestors.length,
      },
      notes: sub.notes,
      tags: parentLot.tags,
      sizeClassId: parentLot.sizeClassId,
      sizeClassName: parentLot.sizeClassName,
    };

    store.save(childLot);
    childLots.push(childLot);

    store.addEvent({
      id: generateId(),
      lotId: childId,
      eventType: "created",
      timestamp: now,
      quantity: sub.quantity,
      reason: `Created from subdivision of ${parentLot.code}`,
      metadata: {
        parentLotId: parentLot.id,
        parentLotCode: parentLot.code,
        sex: sub.sex,
      },
    });

    const subRecord: LotSubdivision = {
      id: generateId(),
      parentLotId: parentLot.id,
      childLotId: childId,
      subdivisionDate: now,
      quantityAllocated: sub.quantity,
      sex: sub.sex,
      notes: sub.notes,
    };
    parentLot.lineage.subdivisions.push(subRecord);
  }

  parentLot.status = "subdivided";
  parentLot.currentQuantity -= total;
  parentLot.updatedAt = now;
  store.save(parentLot);

  store.addEvent({
    id: generateId(),
    lotId: parentLot.id,
    eventType: "subdivided",
    timestamp: now,
    quantity: total,
    reason: `Subdivided into ${childLots.length} child lots`,
    metadata: {
      childLotIds: childLots.map((l) => l.id),
      childLotCodes: childLots.map((l) => l.code),
    },
  });

  return { parentLot, childLots };
}

export function getLotLineage(lotId: string): LotLineage | null {
  return store.get(lotId)?.lineage ?? null;
}

export function getLotAncestors(lotId: string): Lot[] {
  const lot = store.get(lotId);
  if (!lot) return [];
  const ancestors: Lot[] = [];
  let originId = lot.lineage.originLotId;
  while (originId) {
    const ancestor = store.get(originId);
    if (!ancestor) break;
    ancestors.push(ancestor);
    originId = ancestor.lineage.originLotId;
  }
  return ancestors.reverse();
}

export function getLotDescendants(lotId: string): Lot[] {
  const out: Lot[] = [];
  const stack = [lotId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const lot of store.getAll()) {
      if (lot.lineage.originLotId === id) {
        out.push(lot);
        stack.push(lot.id);
      }
    }
  }
  return out;
}

export function getLotLifecycle(lotId: string): LotLifecycleEvent[] {
  return store.getEvents(lotId);
}

export function getActiveLots(): Lot[] {
  return store.getAll().filter((l) => l.status === "active");
}

export function queryLots(filters: LotQueryFilters): Lot[] {
  return store.getAll().filter((lot) => {
    if (filters.status) {
      const s = Array.isArray(filters.status) ? filters.status : [filters.status];
      if (!s.includes(lot.status)) return false;
    }
    if (filters.speciesProfileId) {
      const ids = Array.isArray(filters.speciesProfileId)
        ? filters.speciesProfileId
        : [filters.speciesProfileId];
      if (!ids.includes(lot.speciesProfileId)) return false;
    }
    if (filters.sex) {
      const sx = Array.isArray(filters.sex) ? filters.sex : [filters.sex];
      if (!sx.includes(lot.sex)) return false;
    }
    if (filters.sourceType && lot.sourceType !== filters.sourceType) return false;
    if (filters.includeSubdivided === false && lot.status === "subdivided") {
      return false;
    }
    return true;
  });
}

export function updateLotStatus(
  lotId: string,
  newStatus: LotStatus,
  reason?: string,
): Lot | null {
  const lot = store.get(lotId);
  if (!lot) return null;
  const oldStatus = lot.status;
  lot.status = newStatus;
  lot.updatedAt = new Date();
  store.save(lot);
  store.addEvent({
    id: generateId(),
    lotId,
    eventType: "status_changed",
    timestamp: new Date(),
    reason: reason ?? `Status: ${oldStatus} → ${newStatus}`,
    metadata: { oldStatus, newStatus },
  });
  return lot;
}

export function addAnimalsToLot(
  lotId: string,
  quantity: number,
  reason?: string,
): Lot | null {
  const lot = store.get(lotId);
  if (!lot) return null;
  if (lot.status !== "active") {
    throw new Error(`Cannot add animals to lot with status '${lot.status}'`);
  }
  lot.currentQuantity += quantity;
  lot.updatedAt = new Date();
  store.save(lot);
  store.addEvent({
    id: generateId(),
    lotId,
    eventType: "animals_added",
    timestamp: new Date(),
    quantity,
    reason: reason ?? "Animals added",
  });
  return lot;
}

export function removeAnimalsFromLot(
  lotId: string,
  quantity: number,
  reason?: string,
  isMortality = false,
): Lot | null {
  const lot = store.get(lotId);
  if (!lot) return null;
  if (lot.status !== "active") {
    throw new Error(`Cannot remove from lot with status '${lot.status}'`);
  }
  lot.currentQuantity = Math.max(0, lot.currentQuantity - quantity);
  lot.updatedAt = new Date();
  store.save(lot);
  store.addEvent({
    id: generateId(),
    lotId,
    eventType: isMortality ? "mortality" : "animals_removed",
    timestamp: new Date(),
    quantity,
    reason: reason ?? (isMortality ? "Mortality" : "Removed"),
  });
  return lot;
}

export function getLotSummary(lotId: string): LotSummary | null {
  const lot = store.get(lotId);
  if (!lot) return null;
  return {
    id: lot.id,
    code: lot.code,
    speciesProfileId: lot.speciesProfileId,
    sex: lot.sex,
    currentQuantity: lot.currentQuantity,
    status: lot.status,
    location: lot.location,
    sizeClassId: lot.sizeClassId,
    sizeClassName: lot.sizeClassName,
  };
}

export function getLotStatistics(): {
  totalLots: number;
  activeLots: number;
  totalAnimals: number;
  bySpeciesProfile: Record<SpeciesProfileId, number>;
  byStatus: Record<LotStatus, number>;
} {
  const all = store.getAll();
  const active = all.filter((l) => l.status === "active");
  const bySpeciesProfile: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const lot of active) {
    bySpeciesProfile[lot.speciesProfileId] =
      (bySpeciesProfile[lot.speciesProfileId] ?? 0) + lot.currentQuantity;
  }
  for (const lot of all) {
    byStatus[lot.status] = (byStatus[lot.status] ?? 0) + 1;
  }
  return {
    totalLots: all.length,
    activeLots: active.length,
    totalAnimals: active.reduce((s, l) => s + l.currentQuantity, 0),
    bySpeciesProfile,
    byStatus: byStatus as Record<LotStatus, number>,
  };
}
