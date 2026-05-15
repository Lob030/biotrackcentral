/**
 * Workspace Utilities
 * Helper functions for workspace management
 */

import type { WorkspaceContext, WorkspacePurpose, WorkspaceSubtype } from '@/shared/types/workspace';

import { supabase } from '@/integrations/supabase/client';
import { seedWorkspaceSpecies } from '@/modules/bioterio/species/data/initialization';

export const ACTIVE_WORKSPACE_KEY = 'biotrack_active_workspace';
export const PENDING_WORKSPACE_KEY = 'biotrack_pending_workspace';

export interface WorkspaceRow {
  id: string;
  name: string;
  purpose: WorkspacePurpose;
  subtype: WorkspaceSubtype;
  user_id: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

/**
 * Convert a database workspace row to a WorkspaceContext
 */
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

/**
 * Create a workspace from a draft configuration
 */
export async function createWorkspaceFromDraft(draft: {
  name: string;
  purpose: string;
  operation?: string | null;
  animalClass?: string | null;
  species?: string | null;
}): Promise<WorkspaceRow> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("No user authenticated");
  }

  // Map UI labels to DB constraints
  const subtypeMap: Record<string, string> = {
    'Bioterio': 'production',
    'Granja avícola': 'production',
    'Granja cunícola': 'production',
    'Ganadería bovina': 'production',
    'Acuario / Operación acuática': 'production',
    'Comercializadora': 'trading',
    'PIMVS': 'pimvs',
    'UMA': 'uma',
    'Clínica Veterinaria': 'vet_clinic'
  };

  const animalClassMap: Record<string, string> = {
    'Mamíferos': 'mammal',
    'Peces': 'fish',
    'Reptiles': 'reptile',
    'Anfibios': 'amphibian',
    'Aves': 'bird',
    'Artrópodos': 'arthropod',
    'Anélidos': 'annelid'
  };

  const dbSubtype = draft.operation ? (subtypeMap[draft.operation] || 'production') : 'production';
  const dbAnimalClass = draft.animalClass ? (animalClassMap[draft.animalClass] || 'mammal') : 'mammal';

  // 1. Create Workspace
  const { data: ws, error: wsError } = await supabase
    .from("workspaces")
    .insert({
      name: draft.name,
      purpose: draft.purpose,
      subtype: dbSubtype,
      species: draft.species,
      animal_class: dbAnimalClass,
      user_id: user.id,
      is_active: true,
    })
    .select()
    .single();

  if (wsError) {
    console.error("Workspace creation error:", wsError);
    throw new Error(wsError.message || "Error al crear el espacio en la base de datos");
  }

  // 2. Add creator to workspace_members (redundant but safe for immediate access)
  try {
    await supabase.from("workspace_members").insert({
      workspace_id: ws.id,
      user_id: user.id,
      role: 'admin'
    });
  } catch (err) {
    console.warn("Auto-membership insertion failed (might be expected if trigger exists):", err);
  }

  // 3. Initialize species profiles if bioterio
  if (draft.operation === 'Bioterio' && draft.species) {
    console.log(`Seeding species runtime for ${draft.species} in workspace ${ws.id}`);
    try {
      await seedWorkspaceSpecies(ws.id, draft.species);
      console.log("Species runtime seeded successfully");
    } catch (err: any) {
      console.error("Failed to seed workspace species:", err);
      // We don't fail the whole workspace creation if seeding fails
    }
  }
  
  return ws as WorkspaceRow;
}

/**
 * Get the active workspace ID from localStorage
 */
export function getActiveWorkspaceId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(ACTIVE_WORKSPACE_KEY);
}

/**
 * Set the active workspace ID in localStorage
 */
export function setActiveWorkspaceId(workspaceId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
}

/**
 * Clear the active workspace ID from localStorage
 */
export function clearActiveWorkspaceId(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
}
