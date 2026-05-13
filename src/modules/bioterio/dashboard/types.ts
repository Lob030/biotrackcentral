/**
 * Operational Dashboard Types
 * 
 * Defines the shape of data consumed by the operational dashboard.
 * Prioritizes materialized state and projection data over raw events.
 */

import { LotStateProjection } from '../../persistence/types';
import { CageOccupancyProjection } from '../../persistence/types';
import { OperationalEvent } from '../../events/types';
import { BreedingGroupStatus } from '../../reproduction/types';

// -----------------------------------------------------------------------------
// Dashboard Summary Metrics (Materialized)
// -----------------------------------------------------------------------------

export interface DashboardMetrics {
  totalLots: number;
  activeLots: number;
  totalCages: number;
  occupiedCages: number;
  availableCages: number;
  overcapacityCages: number;
  activeBreedingGroups: number;
  pendingWeanings: number;
  totalAnimals: number;
  mortalityLast7Days: number;
  birthsLast7Days: number;
}

// -----------------------------------------------------------------------------
// Alert Definitions
// -----------------------------------------------------------------------------

export type AlertSeverity = 'critical' | 'warning' | 'info';

export type AlertType = 
  | 'CAGE_OVERCAPACITY'
  | 'UNUSUAL_MORTALITY'
  | 'UPCOMING_WEANING'
  | 'OVERDUE_BREEDING_CYCLE'
  | 'QUARANTINE_WARNING'
  | 'LOW_STOCK'
  | 'SYSTEM_ERROR';

export interface OperationalAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  relatedEntityId?: string; // lotId, cageId, breedingGroupId
  relatedEntityType?: 'LOT' | 'CAGE' | 'BREEDING_GROUP' | 'LITTER';
  createdAt: string; // UTC
  acknowledged: boolean;
  actionRequired?: boolean;
  suggestedActionId?: string; // Links to a workflow action
}

// -----------------------------------------------------------------------------
// Recent Activity Item (Derived from Operational Events)
// -----------------------------------------------------------------------------

export interface DashboardActivityItem {
  id: string;
  eventId: string;
  eventType: string;
  summary: string; // Human-readable summary e.g., "Moved 10 animals from Lot A to Lot B"
  timestamp: string; // UTC
  actorId?: string;
  relatedEntities: {
    type: string;
    id: string;
    label?: string;
  }[];
}

// -----------------------------------------------------------------------------
// Quick Action Definition
// -----------------------------------------------------------------------------

export interface QuickActionDef {
  id: string;
  label: string;
  icon: string; // Icon identifier
  workflowId: string; // Matches workflow module ID
  shortcut?: string; // Keyboard shortcut e.g., "Ctrl+L"
  enabled: boolean;
  category: 'LOT' | 'CAGE' | 'BREEDING' | 'GENERAL';
}

// -----------------------------------------------------------------------------
// Main Dashboard State
// -----------------------------------------------------------------------------

export interface OperationalDashboardState {
  metrics: DashboardMetrics;
  alerts: OperationalAlert[];
  recentActivity: DashboardActivityItem[];
  quickActions: QuickActionDef[];
  
  // Projections snapshots for immediate rendering
  lotStates: LotStateProjection[];
  cageOccupancy: CageOccupancyProjection[];
  activeBreedingGroups: BreedingGroupStatus[];
  
  // UI State
  lastUpdated: string; // UTC
  isLoading: boolean;
  error?: string;
  filterWorkspaceId: string;
}

// -----------------------------------------------------------------------------
// Widget Configuration
// -----------------------------------------------------------------------------

export interface DashboardWidgetConfig {
  id: string;
  type: 'METRIC_CARD' | 'ALERT_LIST' | 'ACTIVITY_FEED' | 'OCCUPANCY_GRID' | 'QUICK_ACTIONS';
  title: string;
  visible: boolean;
  order: number;
  size: 'small' | 'medium' | 'large' | 'full';
}

export const DEFAULT_DASHBOARD_LAYOUT: DashboardWidgetConfig[] = [
  { id: 'metrics-overview', type: 'METRIC_CARD', title: 'Operational Overview', visible: true, order: 1, size: 'full' },
  { id: 'alerts-panel', type: 'ALERT_LIST', title: 'Attention Required', visible: true, order: 2, size: 'medium' },
  { id: 'quick-actions', type: 'QUICK_ACTIONS', title: 'Quick Actions', visible: true, order: 3, size: 'medium' },
  { id: 'activity-feed', type: 'ACTIVITY_FEED', title: 'Recent Activity', visible: true, order: 4, size: 'full' },
  { id: 'occupancy-grid', type: 'OCCUPANCY_GRID', title: 'Cage Occupancy', visible: true, order: 5, size: 'full' },
];
