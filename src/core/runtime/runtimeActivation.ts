/**
 * Runtime Activation Workflow
 * 
 * Orchestrates the lifecycle of an operational instance:
 * 1. Deactivates current instance (if any)
 * 2. Cleans up stale runtime data
 * 3. Hydrates the new instance
 * 4. Activates the new runtime
 */

import { cleanupOperationalRuntime } from './runtimeCleanup';
import { hydrateOperationalRuntime } from './runtimeHydration';
import { saveLastActiveInstance } from './runtimePersistence';
import type { OperationalInstanceContext, RuntimeStatus } from './types';

export interface ActivationResult {
  success: boolean;
  context?: OperationalInstanceContext;
  error?: Error;
}

/**
 * Safely deactivates an operational instance.
 */
export async function deactivateOperationalInstance(instanceId: string): Promise<void> {
  console.log(`[Runtime Deactivation] Deactivating instance: ${instanceId}`);
  await cleanupOperationalRuntime(instanceId);
}

/**
 * Safely activates an operational instance, ensuring proper teardown of any existing context.
 */
export async function activateOperationalInstance(
  newInstanceId: string, 
  currentInstanceId?: string | null,
  onStatusChange?: (status: RuntimeStatus) => void
): Promise<ActivationResult> {
  
  try {
    if (currentInstanceId && currentInstanceId !== newInstanceId) {
      onStatusChange?.('cleaning');
      await deactivateOperationalInstance(currentInstanceId);
    }

    onStatusChange?.('hydrating');
    const context = await hydrateOperationalRuntime(newInstanceId);

    saveLastActiveInstance(newInstanceId);
    onStatusChange?.('active');

    return {
      success: true,
      context,
    };
  } catch (error) {
    console.error(`[Runtime Activation Error] Failed to activate instance ${newInstanceId}:`, error);
    onStatusChange?.('error');
    
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown activation error'),
    };
  }
}
