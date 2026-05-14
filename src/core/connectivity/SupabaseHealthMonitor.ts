/**
 * Supabase Health Monitor
 * 
 * Listens to Supabase connection states (realtime channel disconnects, auth validity).
 */

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ConnectivityRuntimeManager } from './ConnectivityRuntimeManager';

export function SupabaseHealthMonitor() {
  useEffect(() => {
    // Monitor realtime connection state
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        ConnectivityRuntimeManager.handleEvent({ type: 'SUPABASE_DISCONNECTED', reason: 'User signed out' });
      } else if (event === 'SIGNED_IN') {
        ConnectivityRuntimeManager.handleEvent({ type: 'SUPABASE_CONNECTED' });
      }
    });

    // Supabase JS v2 doesn't have a direct global connection status event listener
    // that fires reliably for drops outside of channels.
    // Realtime channel state will be monitored per-channel in the specific hooks.
    // This serves as the foundation.

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return null;
}
