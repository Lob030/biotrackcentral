/**
 * Connectivity Guard
 * 
 * Provides utilities and hooks to block operational mutations when
 * the system is not in an 'online' state.
 */

import { useState, useEffect } from 'react';
import { ConnectivityRuntimeManager } from './ConnectivityRuntimeManager';
import { toast } from 'sonner';

/**
 * Hook that returns the current locked status.
 * Can be used to disable UI elements.
 */
export function useOperationalLock() {
  const [isLocked, setIsLocked] = useState(ConnectivityRuntimeManager.isLocked());

  useEffect(() => {
    return ConnectivityRuntimeManager.subscribe((status) => {
      setIsLocked(status.isLocked);
    });
  }, []);

  return isLocked;
}

/**
 * Wraps an async operational function. If the runtime is locked,
 * it aborts the execution and shows a toast warning.
 */
export function withConnectivityGuard<T extends (...args: any[]) => Promise<any>>(
  operation: T,
  customWarning?: string
): (...args: Parameters<T>) => Promise<ReturnType<T> | void> {
  return async (...args: Parameters<T>) => {
    if (ConnectivityRuntimeManager.isLocked()) {
      toast.error(customWarning || 'Operación bloqueada: Sin conexión a la base de datos.');
      return;
    }
    return operation(...args);
  };
}

/**
 * Simple synchronous check. Throws an error if locked.
 * Useful inside contexts where you want to hard-abort.
 */
export function assertConnectivity(): void {
  if (ConnectivityRuntimeManager.isLocked()) {
    throw new Error('OPERATIONAL_LOCK: Cannot execute mutations while offline or desynced.');
  }
}
