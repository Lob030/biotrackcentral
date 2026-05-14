/**
 * Runtime Connection Monitor
 * 
 * Listens to native browser online/offline events to trigger connectivity state changes.
 */

import { useEffect } from 'react';
import { ConnectivityRuntimeManager } from './ConnectivityRuntimeManager';

export function RuntimeConnectionMonitor() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      ConnectivityRuntimeManager.handleEvent({ type: 'NETWORK_ONLINE' });
    };

    const handleOffline = () => {
      ConnectivityRuntimeManager.handleEvent({ type: 'NETWORK_OFFLINE' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null;
}
