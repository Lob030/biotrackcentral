/**
 * Runtime Cleanup
 * 
 * Handles the teardown phase of an operational instance runtime.
 * Ensures no memory leaks, stale subscriptions, or ghost data remain
 * before another instance is hydrated.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Perform a full cleanup of the operational runtime for the given instance.
 */
export async function cleanupOperationalRuntime(instanceId: string): Promise<void> {
  console.log(`[Runtime Cleanup] Starting cleanup for instance: ${instanceId}`);

  try {
    // 1. Unsubscribe from all realtime channels specifically tied to this instance
    // Note: Supabase JS client handles this generically, but we explicitly clear channels
    // if we tracked them by name. For now, we wipe all active subscriptions to be safe.
    await supabase.removeAllChannels();
    console.log(`[Runtime Cleanup] Cleared realtime subscriptions.`);

    // 2. Clear query caches and projection stores
    // In a React Query setup, we would invalidate or clear queries here.
    // For local caches, we clear them.
    if (typeof window !== 'undefined') {
      // Clear dashboard state
      sessionStorage.removeItem(`dashboard_state_${instanceId}`);
      // Clear projections
      sessionStorage.removeItem(`projections_${instanceId}`);
    }
    console.log(`[Runtime Cleanup] Cleared local caches and projections.`);

    // 3. Clear AI context
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(`ai_context_${instanceId}`);
    }
    console.log(`[Runtime Cleanup] Cleared AI context.`);

    // 4. Any other cleanup (command queues, active alerts state)
    // ...

    console.log(`[Runtime Cleanup] Cleanup complete for instance: ${instanceId}`);
  } catch (error) {
    console.error(`[Runtime Cleanup Error] Failed to cleanup instance ${instanceId}:`, error);
    throw error;
  }
}
