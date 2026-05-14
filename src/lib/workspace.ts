/**
 * Workspace Utilities
 * Helper functions for workspace management
 */

import type { WorkspaceContext, WorkspacePurpose, WorkspaceSubtype } from '@/shared/types/workspace';

export const ACTIVE_WORKSPACE_KEY = 'biotrack_active_workspace';
export const PENDING_WORKSPACE_KEY = 'biotrack_pending_workspace';

export interface WorkspaceRow {
  id: string;
  name: string;
  purpose: WorkspacePurpose;
  subtype: WorkspaceSubtype;
  owner_id: string;
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
    ownerId: row.owner_id,
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
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    id: `ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name: draft.name,
    purpose: draft.purpose as WorkspacePurpose,
    subtype: draft.operation as WorkspaceSubtype || 'other',
    owner_id: 'mock_user_id',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_active: true,
  };
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
