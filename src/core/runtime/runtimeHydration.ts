/**
 * Runtime Hydration
 * 
 * Handles the spin-up phase of an operational instance runtime.
 * Prepares subscriptions, loads initial state, and establishes the AI context.
 */

import { supabase } from "@/integrations/supabase/client";
import type { OperationalInstanceContext } from "./types";

/**
 * Perform a full hydration of the operational runtime for the given instance.
 * Returns the resolved context.
 */
export async function hydrateOperationalRuntime(instanceId: string): Promise<OperationalInstanceContext> {
  console.log(`[Runtime Hydration] Starting hydration for instance: ${instanceId}`);

  try {
    // 1. Fetch instance metadata from DB
    // Since workspaces are currently representing instances in our DB schema,
    // we fetch from the workspaces table.
    const { data: instanceData, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", instanceId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch instance data: ${error.message}`);
    }

    if (!instanceData) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    const context: OperationalInstanceContext = {
      instanceId: instanceData.id,
      workspaceId: instanceData.id, // For now, 1:1 mapping in the DB
      blueprintId: instanceData.purpose || 'bioterio',
      category: instanceData.purpose || 'business',
      name: instanceData.name || 'Unnamed Instance',
      activatedAt: Date.now(),
    };

    // 2. Establish realtime subscriptions scoped to this instance
    console.log(`[Runtime Hydration] Establishing realtime subscriptions for ${instanceId}.`);
    // Example: supabase.channel(`operational_events_${instanceId}`).on(...).subscribe();
    // This will be managed by specific feature hooks, but we ensure the connection is ready.

    // 3. Pre-fetch critical operational settings
    console.log(`[Runtime Hydration] Pre-fetching operational settings.`);
    // await fetchOperationalSettings(instanceId);

    // 4. Initialize AI Context
    console.log(`[Runtime Hydration] Initializing AI context.`);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`ai_context_${instanceId}`, JSON.stringify({
        initialized: true,
        category: context.category,
      }));
    }

    console.log(`[Runtime Hydration] Hydration complete for instance: ${instanceId}`);
    return context;
  } catch (error) {
    console.error(`[Runtime Hydration Error] Failed to hydrate instance ${instanceId}:`, error);
    throw error;
  }
}
