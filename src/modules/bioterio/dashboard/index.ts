/**
 * Dashboard Module Index
 * 
 * Exports all dashboard components, hooks, and services.
 */

export { OperationalDashboard } from './components/Dashboard';
export { MetricsOverview } from './components/MetricsOverview';
export { AlertsPanel } from './components/AlertsPanel';
export { ActivityFeed } from './components/ActivityFeed';
export { QuickActions } from './components/QuickActions';

export { useDashboard, useDashboardMetrics, useDashboardAlerts, useDashboardActivity } from './hooks';
export { getDashboardService, DashboardService } from './service';

export type {
  OperationalDashboardState,
  DashboardMetrics,
  OperationalAlert,
  AlertSeverity,
  AlertType,
  DashboardActivityItem,
  QuickActionDef,
  DashboardWidgetConfig,
} from './types';
