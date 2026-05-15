/**
 * Workspace Utilities
 *
 * `createWorkspaceFromDraft` is now TRANSACTIONAL with respect to species
 * seeding: if the species profile cannot be created we roll back the
 * workspace insert. There is no fallback species — onboarding fails loudly
 * if a Bioterio is missing its species seed.
 */

import type { WorkspaceContext, WorkspacePurpose, WorkspaceSubtype } from "@/shared/types/workspace";
import type { SpeciesSeed } from "@/features/onboarding/lib/types";

import { supabase } from "@/integrations/supabase/client";
import { seedWorkspaceSpecies } from "@/modules/bioterio/species/data/initialization";

export const ACTIVE_WORKSPACE_KEY = "biotrack_active_workspace";
export const PENDING_WORKSPACE_KEY = "biotrack_pending_workspace";

export interface WorkspaceRow {
  id: string;
  name: string;
  purpose: WorkspacePurpose;
  subtype: WorkspaceSubtype;
  user_id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export function rowToWorkspaceContext(row: WorkspaceRow): WorkspaceContext {
  return {
    id: row.id,
    name: row.name,
    purpose: row.purpose,
    subtype: row.subtype,
    ownerId: row.user_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    isActive: row.is_active,
  };
}

export interface CreateWorkspaceDraft {
  name: string;
  purpose: string;
  operation?: string | null;
  animalClass?: string | null;
  speciesSeed?: SpeciesSeed | null;
}

export async function createWorkspaceFromDraft(
  draft: CreateWorkspaceDraft,
): Promise<WorkspaceRow> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No user authenticated");

  const subtypeMap: Record<string, string> = {
    Bioterio: "production",
    "Granja avícola": "production",
    "Granja cunícola": "production",
    "Ganadería bovina": "production",
    "Acuario / Operación acuática": "production",
    Comercializadora: "trading",
    PIMVS: "pimvs",
    UMA: "uma",
    "Clínica Veterinaria": "vet_clinic",
  };

  const animalClassMap: Record<string, string> = {
    Mamíferos: "mammal",
    Peces: "fish",
    Reptiles: "reptile",
    Anfibios: "amphibian",
    Aves: "bird",
    Artrópodos: "arthropod",
    Anélidos: "annelid",
  };

  const dbSubtype = draft.operation ? subtypeMap[draft.operation] ?? "production" : "production";
  const dbAnimalClass = draft.animalClass ? animalClassMap[draft.animalClass] ?? "mammal" : "mammal";

  // Bioterio MUST have a species seed — no fallback.
  if (draft.operation === "Bioterio" && !draft.speciesSeed) {
    throw new Error("Bioterio workspaces require a species seed");
  }

  // Resolve organization_id from profile (workspaces.organization_id is NOT NULL).
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile?.organization_id) {
    throw new Error("No organization context for current user");
  }

  // 1. Insert workspace.
  const { data: ws, error: wsError } = await supabase
    .from("workspaces")
    .insert({
      name: draft.name,
      purpose: draft.purpose,
      subtype: dbSubtype,
      animal_class: dbAnimalClass,
      user_id: user.id,
      organization_id: profile.organization_id,
      is_active: true,
    })
    .select()
    .single();

  if (wsError || !ws) {
    throw new Error(wsError?.message ?? "Error al crear el espacio");
  }

  // 2. Transactionally seed the species profile. On any failure roll back.
  if (draft.operation === "Bioterio" && draft.speciesSeed) {
    try {
      await seedWorkspaceSpecies(ws.id, draft.speciesSeed);
    } catch (err) {
      await supabase.from("workspaces").delete().eq("id", ws.id);
      const msg = err instanceof Error ? err.message : "Error al sembrar especie";
      throw new Error(`Workspace rolled back: ${msg}`);
    }
  }

  return ws as WorkspaceRow;
}

export function getActiveWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_WORKSPACE_KEY);
}

export function setActiveWorkspaceId(workspaceId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
}

export function clearActiveWorkspaceId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
}
