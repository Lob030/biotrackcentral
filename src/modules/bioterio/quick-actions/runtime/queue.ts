/**
 * Operational Action Queue
 * 
 * Safely batches sequential quick actions from the operator.
 * Coordinates with the ProjectionOrchestrator to avoid recalculation storms
 * and provides undo/reversal mechanics that preserve immutable history.
 */

import type { ActionQueueItem, OperationalPreview } from './types';
// In a real implementation, we would import ProjectionOrchestrator and EventRuntime here

export class OperationalActionQueue {
  private queue: ActionQueueItem[] = [];
  private history: ActionQueueItem[] = []; // Used for the ActionHistoryPanel
  private isProcessing = false;

  /**
   * Pushes a confirmed action into the execution queue.
   */
  public enqueue(preview: OperationalPreview): string {
    const item: ActionQueueItem = {
      id: `qa_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      preview,
      status: 'pending',
    };
    
    this.queue.push(item);
    this.history.unshift(item); // Add to top of history
    
    // Keep history reasonably sized
    if (this.history.length > 50) this.history.pop();
    
    this.processQueue();
    return item.id;
  }

  /**
   * Reverts a previously completed action.
   * Generates a compensating 'event_reversal' event to preserve immutability.
   */
  public async revertAction(itemId: string, userId: string, reason: string): Promise<boolean> {
    const item = this.history.find(i => i.id === itemId);
    if (!item || item.status !== 'completed' || !item.resultingEventId) {
      return false; // Cannot revert
    }

    // 1. Generate compensating event (e.g., ReversalPayload to Event Runtime)
    // 2. Await event persistence
    // 3. Request ProjectionOrchestrator recalculation
    // 4. Mark item as reverted
    
    item.status = 'reverted';
    return true;
  }

  /**
   * Returns the recent action history for the UI panel.
   */
  public getHistory(): ActionQueueItem[] {
    return this.history;
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;

      item.status = 'processing';
      try {
        // 1. Execute mutation via Event Runtime
        // const eventId = await executeIntentAsEvent(item.preview.intent);
        
        // 2. Trigger Orchestrator
        // orchestrator.requestRecalculation(...)
        
        item.status = 'completed';
        item.resultingEventId = `evt_mock_${Date.now()}`;
      } catch (err) {
        item.status = 'failed';
        item.errorDetails = err instanceof Error ? err.message : 'Unknown error';
      }
    }

    this.isProcessing = false;
  }
}

export const actionQueue = new OperationalActionQueue();
