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
export function createWorkspaceFromDraft(draft: {
  name: string;
  purpose: WorkspacePurpose;
  subtype: WorkspaceSubtype;
}): Omit<WorkspaceRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    name: draft.name,
    purpose: draft.purpose,
    subtype: draft.subtype,
    owner_id: '', // Will be set by the server
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
