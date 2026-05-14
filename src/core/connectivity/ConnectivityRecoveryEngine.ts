/**
 * Connectivity Recovery Engine
 * 
 * Orchestrates the recovery of the operational runtime when connectivity returns.
 * Validates integrity, refreshes projections, and safely unlocks the UI.
 */

import { ConnectivityRuntimeManager } from './ConnectivityRuntimeManager';
import { OperationalInstanceRuntimeManager } from '@/core/runtime/OperationalInstanceRuntimeManager';

class ConnectivityRecoveryEngineClass {
  private isRecovering = false;

  public async startRecovery(): Promise<void> {
    if (this.isRecovering) return;
    this.isRecovering = true;

    try {
      ConnectivityRuntimeManager.handleEvent({ type: 'RECOVERY_STARTED' });
      console.log(`[Connectivity Recovery] Starting recovery sequence...`);

      // 1. Validate active instance exists
      const activeContext = OperationalInstanceRuntimeManager.getActiveContext();
      if (!activeContext) {
        console.warn(`[Connectivity Recovery] No active runtime to recover.`);
        ConnectivityRuntimeManager.handleEvent({ type: 'RECOVERY_SUCCESS' });
        this.isRecovering = false;
        return;
      }

      // 2. Refresh active instance runtime (triggers cleanup of stale subs and hydration)
      console.log(`[Connectivity Recovery] Re-hydrating runtime for ${activeContext.instanceId}...`);
      const success = await OperationalInstanceRuntimeManager.switchInstance(activeContext.instanceId);

      if (!success) {
        throw new Error('Failed to re-hydrate runtime during recovery.');
      }

      // 3. Mark recovery success
      console.log(`[Connectivity Recovery] Recovery successful.`);
      ConnectivityRuntimeManager.handleEvent({ type: 'RECOVERY_SUCCESS' });

    } catch (error) {
      console.error(`[Connectivity Recovery] Recovery failed:`, error);
      ConnectivityRuntimeManager.handleEvent({ 
        type: 'RECOVERY_FAILED', 
        error: error instanceof Error ? error : new Error('Unknown recovery error') 
      });
    } finally {
      this.isRecovering = false;
    }
  }
}

export const ConnectivityRecoveryEngine = new ConnectivityRecoveryEngineClass();
