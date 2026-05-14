/**
 * Runtime Persistence
 * 
 * Manages the persistence of the active instance to allow for seamless
 * re-entry without re-triggering the onboarding flow.
 */

const ACTIVE_INSTANCE_KEY = 'biotrack_active_operational_instance';

/**
 * Saves the last active instance ID locally.
 */
export function saveLastActiveInstance(instanceId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ACTIVE_INSTANCE_KEY, instanceId);
  }
}

/**
 * Retrieves the last active instance ID, if any.
 */
export function getLastActiveInstance(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(ACTIVE_INSTANCE_KEY);
  }
  return null;
}

/**
 * Clears the active instance persistence.
 */
export function clearLastActiveInstance(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ACTIVE_INSTANCE_KEY);
  }
}
