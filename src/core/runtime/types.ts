/**
 * Core Types for the Operational Instance Runtime Manager
 */

export type RuntimeStatus = 
  | 'idle'
  | 'hydrating'
  | 'active'
  | 'cleaning'
  | 'error';

export interface OperationalInstanceContext {
  instanceId: string;
  workspaceId: string;
  blueprintId: string;
  category: string; // e.g., 'business', 'pet'
  name: string;
  activatedAt: number;
}

export type RuntimeLifecycleEvent = 
  | { type: 'ACTIVATION_START'; instanceId: string }
  | { type: 'HYDRATION_SUCCESS'; instanceId: string; context: OperationalInstanceContext }
  | { type: 'HYDRATION_ERROR'; instanceId: string; error: Error }
  | { type: 'CLEANUP_START'; instanceId: string }
  | { type: 'CLEANUP_SUCCESS'; instanceId: string }
  | { type: 'DEACTIVATION_COMPLETE'; instanceId: string };

export interface RuntimeMetrics {
  activationDurationMs: number;
  hydrationDurationMs: number;
  cleanupDurationMs: number;
  activeSubscriptionsCount: number;
}
