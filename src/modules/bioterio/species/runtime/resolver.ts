/**
 * SpeciesRuntimeResolver
 *
 * Centralized, deterministic resolver for everything related to species
 * profiles in the operational runtime. ALL operational logic must go through
 * this resolver — never reach for `display_name` for matching, never compare
 * species by string aliases, never assume a fallback.
 *
 * Responsibilities:
 * - Resolve a `speciesProfileId` → full profile + capabilities + settings + size classes
 * - Resolve a `taxonomyKey` (within a workspace) → profile
 * - Aggregate profiles by `taxonomyKey` for cross-workspace analytics
 * - Provide quantity-unit, capability, and operational-setting lookups
 *
 * The resolver is a PURE data accessor: feed it the rows you already have
 * (from `useSpeciesProfiles`, `useSizeClasses`, `useOperationalSettings`)
 * and it answers all questions deterministically.
 */

export interface SpeciesProfileRow {
  id: string;
  workspace_id: string;
  code: string;
  display_name: string;
  scientific_name: string | null;
  taxonomy_class: string | null;
  taxonomy_key: string; // generated lower(code)
  capability_profile: Record<string, unknown>;
  is_active: boolean;
}

export interface SizeClassRow {
  id: string;
  species_profile_id: string;
  code: string;
  display_name: string;
  display_order: number;
  min_age_days: number | null;
  max_age_days: number | null;
  min_weight_g: number | null;
  max_weight_g: number | null;
  is_default: boolean;
  is_sale_eligible: boolean;
}

export interface OperationalSettingsRow {
  id: string;
  species_profile_id: string;
  quantity_unit: string;
  lot_tracking_mode: string;
  track_breeding: boolean;
  track_mortality: boolean;
  default_breeding_cycle_days: number | null;
  weaning_age_days: number | null;
  settings: Record<string, unknown>;
}

export interface ResolvedSpeciesProfile {
  id: string;
  workspaceId: string;
  code: string;
  taxonomyKey: string;
  /** UI-only — never use in logic, matching, AI reasoning, or projections. */
  displayName: string;
  scientificName: string | null;
  taxonomyClass: string | null;
  capabilities: Record<string, unknown>;
  settings: OperationalSettingsRow | null;
  sizeClasses: SizeClassRow[];
}

export class SpeciesProfileNotFoundError extends Error {
  constructor(public readonly speciesProfileId: string) {
    super(`Species profile not found: ${speciesProfileId}`);
    this.name = "SpeciesProfileNotFoundError";
  }
}

export class SpeciesRuntimeResolver {
  private byId: Map<string, SpeciesProfileRow>;
  private settingsByProfile: Map<string, OperationalSettingsRow>;
  private sizeClassesByProfile: Map<string, SizeClassRow[]>;

  constructor(
    profiles: SpeciesProfileRow[],
    settings: OperationalSettingsRow[] = [],
    sizeClasses: SizeClassRow[] = [],
  ) {
    this.byId = new Map(profiles.map((p) => [p.id, p]));
    this.settingsByProfile = new Map(
      settings.map((s) => [s.species_profile_id, s]),
    );
    this.sizeClassesByProfile = new Map();
    for (const sc of sizeClasses) {
      const arr = this.sizeClassesByProfile.get(sc.species_profile_id) ?? [];
      arr.push(sc);
      this.sizeClassesByProfile.set(sc.species_profile_id, arr);
    }
    for (const arr of this.sizeClassesByProfile.values()) {
      arr.sort((a, b) => a.display_order - b.display_order);
    }
  }

  /** Strict lookup. Throws if profile is missing — never falls back. */
  resolveById(speciesProfileId: string): ResolvedSpeciesProfile {
    const profile = this.byId.get(speciesProfileId);
    if (!profile) throw new SpeciesProfileNotFoundError(speciesProfileId);
    return this.toResolved(profile);
  }

  /** Soft lookup — returns null instead of throwing. */
  tryResolveById(speciesProfileId: string): ResolvedSpeciesProfile | null {
    const profile = this.byId.get(speciesProfileId);
    return profile ? this.toResolved(profile) : null;
  }

  /**
   * Resolve a workspace-scoped profile by taxonomy key. Used by the AI
   * resolver when the LLM emits a `speciesName`/`taxonomyKey` hint instead
   * of a UUID.
   */
  resolveByTaxonomyKey(
    workspaceId: string,
    taxonomyKey: string,
  ): ResolvedSpeciesProfile | null {
    const key = taxonomyKey.trim().toLowerCase();
    for (const profile of this.byId.values()) {
      if (
        profile.workspace_id === workspaceId &&
        profile.taxonomy_key === key &&
        profile.is_active
      ) {
        return this.toResolved(profile);
      }
    }
    return null;
  }

  /** Cross-workspace taxonomy aggregation for analytics. */
  groupByTaxonomyKey(): Map<string, ResolvedSpeciesProfile[]> {
    const groups = new Map<string, ResolvedSpeciesProfile[]>();
    for (const profile of this.byId.values()) {
      const arr = groups.get(profile.taxonomy_key) ?? [];
      arr.push(this.toResolved(profile));
      groups.set(profile.taxonomy_key, arr);
    }
    return groups;
  }

  resolveQuantityUnit(speciesProfileId: string): string {
    return this.resolveById(speciesProfileId).settings?.quantity_unit ??
      "individuals";
  }

  resolveCapabilities(speciesProfileId: string): Record<string, unknown> {
    return this.resolveById(speciesProfileId).capabilities ?? {};
  }

  resolveSizeClasses(speciesProfileId: string): SizeClassRow[] {
    return this.sizeClassesByProfile.get(speciesProfileId) ?? [];
  }

  /**
   * Build a snapshot record to attach to historical events / orders / AI
   * traces. Snapshots preserve the original runtime context even if the
   * profile is later renamed or deleted.
   */
  buildSnapshot(speciesProfileId: string): {
    species_profile_id_snapshot: string;
    species_code_snapshot: string;
    species_display_name_snapshot: string;
  } {
    const r = this.resolveById(speciesProfileId);
    return {
      species_profile_id_snapshot: r.id,
      species_code_snapshot: r.code,
      species_display_name_snapshot: r.displayName,
    };
  }

  private toResolved(profile: SpeciesProfileRow): ResolvedSpeciesProfile {
    return {
      id: profile.id,
      workspaceId: profile.workspace_id,
      code: profile.code,
      taxonomyKey: profile.taxonomy_key,
      displayName: profile.display_name,
      scientificName: profile.scientific_name,
      taxonomyClass: profile.taxonomy_class,
      capabilities: profile.capability_profile ?? {},
      settings: this.settingsByProfile.get(profile.id) ?? null,
      sizeClasses: this.sizeClassesByProfile.get(profile.id) ?? [],
    };
  }
}
