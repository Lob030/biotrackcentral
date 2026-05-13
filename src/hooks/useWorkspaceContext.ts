/**
 * Workspace Context Hook
 * Provides the active workspace context with resolved capabilities
 */

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { WorkspaceContext, WorkspaceCapabilities } from '@/shared/types/workspace';
import { resolveWorkspaceCapabilities } from '@/core/workspace/workspace-runtime';
import { rowToWorkspaceContext, getActiveWorkspaceId, ACTIVE_WORKSPACE_KEY } from '@/lib/workspace';

interface UseWorkspaceContextReturn {
  workspace: WorkspaceContext | null;
  capabilities: WorkspaceCapabilities | null;
  isLoading: boolean;
  error: Error | null;
  refreshWorkspace: () => Promise<void>;
}

export function useWorkspaceContext(): UseWorkspaceContextReturn {
  const [workspace, setWorkspace] = useState<WorkspaceContext | null>(null);
  const [capabilities, setCapabilities] = useState<WorkspaceCapabilities | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadWorkspace = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get active workspace ID from localStorage
      const workspaceId = getActiveWorkspaceId();

      if (!workspaceId) {
        setWorkspace(null);
        setCapabilities(null);
        setIsLoading(false);
        return;
      }

      // Fetch workspace from database
      const { data, error: fetchError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (!data) {
        // Workspace not found, clear localStorage
        localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
        setWorkspace(null);
        setCapabilities(null);
        setIsLoading(false);
        return;
      }

      // Convert to WorkspaceContext
      const workspaceContext = rowToWorkspaceContext(data);
      setWorkspace(workspaceContext);

      // Resolve capabilities based on workspace purpose
      const resolvedCapabilities = resolveWorkspaceCapabilities(workspaceContext);
      setCapabilities(resolvedCapabilities);
    } catch (err) {
      console.error('Failed to load workspace:', err);
      setError(err instanceof Error ? err : new Error('Failed to load workspace'));
      setWorkspace(null);
      setCapabilities(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();

    // Listen for storage changes (workspace switching in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ACTIVE_WORKSPACE_KEY) {
        loadWorkspace();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const refreshWorkspace = async () => {
    await loadWorkspace();
  };

  return {
    workspace,
    capabilities,
    isLoading,
    error,
    refreshWorkspace,
  };
}

/**
 * Helper hook to check if a specific module is enabled
 */
export function useIsModuleEnabled(moduleId: string): boolean {
  const { capabilities } = useWorkspaceContext();
  
  return useMemo(() => {
    if (!capabilities) return false;
    return capabilities.enabledModules.includes(moduleId as any);
  }, [capabilities, moduleId]);
}

/**
 * Helper hook to check if a specific capability is available
 */
export function useHasCapability(capabilityName: keyof import('@/shared/types/workspace').CapabilityFlags): boolean {
  const { capabilities } = useWorkspaceContext();
  
  return useMemo(() => {
    if (!capabilities) return false;
    return capabilities.capabilities[capabilityName] || false;
  }, [capabilities, capabilityName]);
}
