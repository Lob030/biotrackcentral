/**
 * Operational Instance Runtime Manager
 * 
 * The central Singleton manager for handling the multi-instance operational ecosystem.
 * Acts as the source of truth for runtime activation, state, and isolation.
 */

import { activateOperationalInstance, deactivateOperationalInstance } from './runtimeActivation';
import { getLastActiveInstance, clearLastActiveInstance } from './runtimePersistence';
import type { OperationalInstanceContext, RuntimeStatus, RuntimeLifecycleEvent } from './types';

class OperationalInstanceRuntimeManagerClass {
  private static instance: OperationalInstanceRuntimeManagerClass;
  
  private activeContext: OperationalInstanceContext | null = null;
  private status: RuntimeStatus = 'idle';
  private eventListeners: Set<(event: RuntimeLifecycleEvent) => void> = new Set();
  private statusListeners: Set<(status: RuntimeStatus) => void> = new Set();

  private constructor() {}

  public static getInstance(): OperationalInstanceRuntimeManagerClass {
    if (!OperationalInstanceRuntimeManagerClass.instance) {
      OperationalInstanceRuntimeManagerClass.instance = new OperationalInstanceRuntimeManagerClass();
    }
    return OperationalInstanceRuntimeManagerClass.instance;
  }

  /**
   * Returns the current active operational instance context.
   */
  public getActiveContext(): OperationalInstanceContext | null {
    return this.activeContext;
  }

  /**
   * Returns the current runtime status.
   */
  public getStatus(): RuntimeStatus {
    return this.status;
  }

  /**
   * Switches the runtime to a new operational instance.
   */
  public async switchInstance(newInstanceId: string): Promise<boolean> {
    const currentInstanceId = this.activeContext?.instanceId;
    
    if (currentInstanceId === newInstanceId) {
      console.log(`[Runtime Manager] Instance ${newInstanceId} is already active.`);
      return true;
    }

    this.emitEvent({ type: 'ACTIVATION_START', instanceId: newInstanceId });

    const result = await activateOperationalInstance(
      newInstanceId,
      currentInstanceId,
      (newStatus) => this.updateStatus(newStatus)
    );

    if (result.success && result.context) {
      this.activeContext = result.context;
      this.emitEvent({ type: 'HYDRATION_SUCCESS', instanceId: newInstanceId, context: result.context });
      return true;
    } else {
      this.emitEvent({ type: 'HYDRATION_ERROR', instanceId: newInstanceId, error: result.error || new Error('Unknown error') });
      return false;
    }
  }

  /**
   * Restores the previous operational runtime upon app reload.
   */
  public async restorePreviousOperationalRuntime(): Promise<boolean> {
    const lastActiveId = getLastActiveInstance();
    
    if (!lastActiveId) {
      console.log(`[Runtime Manager] No previous instance to restore.`);
      return false;
    }

    console.log(`[Runtime Manager] Restoring previous instance: ${lastActiveId}`);
    return this.switchInstance(lastActiveId);
  }

  /**
   * Deactivates the current runtime completely.
   */
  public async shutdownRuntime(): Promise<void> {
    const currentInstanceId = this.activeContext?.instanceId;
    
    if (currentInstanceId) {
      this.updateStatus('cleaning');
      this.emitEvent({ type: 'CLEANUP_START', instanceId: currentInstanceId });
      
      await deactivateOperationalInstance(currentInstanceId);
      
      clearLastActiveInstance();
      this.activeContext = null;
      this.updateStatus('idle');
      
      this.emitEvent({ type: 'DEACTIVATION_COMPLETE', instanceId: currentInstanceId });
    }
  }

  // --- Subscriptions ---

  public onStatusChange(callback: (status: RuntimeStatus) => void): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  public onEvent(callback: (event: RuntimeLifecycleEvent) => void): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  private updateStatus(newStatus: RuntimeStatus): void {
    this.status = newStatus;
    this.statusListeners.forEach(listener => listener(newStatus));
  }

  private emitEvent(event: RuntimeLifecycleEvent): void {
    this.eventListeners.forEach(listener => listener(event));
  }
}

export const OperationalInstanceRuntimeManager = OperationalInstanceRuntimeManagerClass.getInstance();
