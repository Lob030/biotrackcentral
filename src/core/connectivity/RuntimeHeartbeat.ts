/**
 * Runtime Heartbeat
 * 
 * Periodically pings to ensure the operational context isn't stale or desynced.
 */

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ConnectivityRuntimeManager } from './ConnectivityRuntimeManager';

export function RuntimeHeartbeat() {
  useEffect(() => {
    // Ping every 30 seconds
    const PING_INTERVAL = 30000;
    
    const ping = async () => {
      // Only ping if we think we are online
      if (ConnectivityRuntimeManager.getStatus().state !== 'online') return;

      try {
        // A simple lightweight query to verify DB connection is alive
        const { error } = await supabase.from('organizations').select('id').limit(1);
        
        if (error) {
          throw error;
        }
        
        // If we were previously desynced but ping succeeded, we recovered
        if (ConnectivityRuntimeManager.getStatus().state === 'runtime_desynced') {
          ConnectivityRuntimeManager.handleEvent({ type: 'HEARTBEAT_RECOVERED' });
        }

      } catch (err) {
        console.warn(`[Runtime Heartbeat] Ping failed:`, err);
        ConnectivityRuntimeManager.handleEvent({ type: 'HEARTBEAT_FAILED' });
      }
    };

    const intervalId = setInterval(ping, PING_INTERVAL);

    return () => clearInterval(intervalId);
  }, []);

  return null;
}
