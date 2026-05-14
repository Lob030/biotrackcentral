/**
 * Runtime Isolation Utilities
 * 
 * Enforces strict boundaries between operational instances to prevent
 * cross-contamination of queries, events, and AI contexts.
 */

/**
 * Validates that a given query context explicitly contains the instance ID.
 * Throws a fatal error if isolation is breached.
 */
export function enforceInstanceScope(instanceId: string, contextId: string | undefined | null): void {
  if (!contextId) {
    throw new Error(`[Runtime Isolation Breach] Missing instanceId in query/context.`);
  }
  
  if (instanceId !== contextId) {
    throw new Error(`[Runtime Isolation Breach] Attempted to access data for instance ${contextId} from active runtime ${instanceId}.`);
  }
}

/**
 * Decorates a payload with the current instance ID to ensure
 * all outbound events/commands are strongly typed to the active instance.
 */
export function scopePayload<T extends object>(payload: T, instanceId: string): T & { instance_id: string } {
  return {
    ...payload,
    instance_id: instanceId,
  };
}

/**
 * Validates AI operational context to ensure it does not bleed into other instances.
 */
export function validateAIContextIsolation(activeInstanceId: string, aiContextInstanceId: string): boolean {
  return activeInstanceId === aiContextInstanceId;
}
