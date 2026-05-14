/**
 * Operational Intelligence Runtime Types
 * 
 * Defines the types for the Daily Operational Command Center.
 * These types structure how operational attention is calculated,
 * prioritized, and presented to the operator.
 */

import type { QuickActionType } from '../../quick-actions/runtime/types';

export type AttentionPriority = 'critical' | 'high' | 'medium' | 'low';

export type AttentionCategory =
  | 'shortage'
  | 'overcrowding'
  | 'mortality'
  | 'readiness'
  | 'breeding'
  | 'cleaning'
  | 'maintenance'
  | 'anomaly';

/**
 * An actionable suggestion linked directly to the Quick Actions runtime.
 */
export interface SuggestedAction {
  label: string;
  actionType: QuickActionType;
  /** Pre-filled intent string for the Command Palette (e.g. "mover ASF-12") */
  prefilledIntentCommand?: string;
  isPrimary: boolean;
}

/**
 * Attention Card
 * 
 * The core unit of Operational Intelligence. Represents a specific issue
 * requiring the operator's attention, along with actionable solutions.
 */
export interface AttentionCard {
  id: string;
  workspaceId: string;
  speciesProfileId?: string; // Optional if it's a global workspace alert
  
  category: AttentionCategory;
  priority: AttentionPriority;
  
  title: string;
  description: string;
  
  /** Entity references relevant to this attention card */
  context: {
    lotIds?: string[];
    cageIds?: string[];
    sizeClassId?: string;
  };
  
  suggestedActions: SuggestedAction[];
  
  createdAt: number;
  
  /** Timestamp until which this card is snoozed. If > Date.now(), card is hidden. */
  snoozedUntil?: number;
}

/**
 * Operational Health Score
 * 
 * Heuristic scores representing the operational stability of a bioterio.
 * Scores are 0.0 to 1.0 (1.0 = perfect stability).
 */
export interface OperationalHealthScore {
  overall: number;
  pillars: {
    inventoryStability: number;  // Lack of projected shortages
    mortalityHealth: number;     // Adherence to expected mortality rates
    occupancyHealth: number;     // Avoidance of overcrowding
    breedingConsistency: number; // Adherence to expected reproduction cycles
  };
  timestamp: number;
}
