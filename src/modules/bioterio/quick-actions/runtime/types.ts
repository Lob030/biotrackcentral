/**
 * Operational Quick Actions Runtime Types
 * 
 * Defines the core types for rapid, mobile-first operational actions.
 * These actions bypass complex enterprise forms in favor of command parsing
 * and swipe-to-confirm flows.
 */

export type QuickActionType =
  | 'create_lot'
  | 'register_mortality'
  | 'subdivide_lot'
  | 'move_lot'
  | 'reserve_inventory'
  | 'assign_to_cage'
  | 'register_birth'
  | 'register_weaning'
  | 'mark_cleaning'
  | 'create_breeding_group'
  | 'unknown';

/**
 * Action Intent
 * The structured result of parsing an operational command.
 */
export interface ActionIntent {
  type: QuickActionType;
  confidence: number; // 0 to 1 score of parser confidence
  
  // Extracted entities
  quantity?: number;
  lotReference?: string;
  cageReference?: string;
  classificationName?: string;
  
  // Context resolution (filled by the parser runtime)
  resolvedLotId?: string;
  resolvedCageId?: string;
  resolvedSizeClassId?: string;
  
  // Raw string for audit
  rawInput: string;
}

/**
 * Operational Preview
 * What the operator sees BEFORE confirming the action.
 * No mutation occurs until this is confirmed.
 */
export interface OperationalPreview {
  intent: ActionIntent;
  
  // Operational impact
  affectedInventory: {
    sizeClassId: string;
    sizeClassName: string;
    previousQuantity: number;
    newQuantity: number;
  }[];
  
  affectedOccupancy?: {
    cageId: string;
    previousDensity: number;
    newDensity: number;
    isOvercrowded: boolean;
  };

  warnings: string[];
  isDestructive: boolean; // e.g., mortality, deletion
  canProceed: boolean; // false if invalid or physically impossible (e.g., negative stock)
}

/**
 * Action Queue Item
 * Represents a batched quick action waiting for execution.
 */
export interface ActionQueueItem {
  id: string;
  timestamp: number;
  preview: OperationalPreview;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reverted';
  errorDetails?: string;
  resultingEventId?: string; // Link to the immutable Event Runtime event
}

/**
 * Quick Action Definition
 * Metadata about an action for UI rendering.
 */
export interface QuickActionDefinition {
  type: QuickActionType;
  label: string;
  icon: string;
  color: string;
  requiresLot: boolean;
  requiresQuantity: boolean;
  isDestructive: boolean;
}
