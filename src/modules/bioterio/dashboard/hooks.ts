/**
 * Dashboard Integration Hook
 * 
 * React hook for connecting UI components to the operational dashboard service.
 * Provides real-time updates when workflows execute and events are processed.
 */

import { useState, useEffect, useCallback } from 'react';
import { OperationalDashboardState, OperationalAlert, QuickActionDef } from './types';
import { getDashboardService, DashboardService } from './service';

export interface UseDashboardOptions {
  workspaceId: string;
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
}

export interface UseDashboardReturn {
  state: OperationalDashboardState | null;
  isLoading: boolean;
  error?: string;
  
  // Actions
  acknowledgeAlert: (alertId: string) => void;
  dismissAlert: (alertId: string) => void;
  triggerQuickAction: (actionId: string) => void;
  rebuildProjections: () => Promise<void>;
  
  // Derived selectors
  criticalAlerts: OperationalAlert[];
  unacknowledgedAlerts: OperationalAlert[];
  enabledQuickActions: QuickActionDef[];
}

/**
 * Hook for consuming operational dashboard state in React components
 */
export function useDashboard(options: UseDashboardOptions): UseDashboardReturn {
  const { workspaceId, autoRefresh = false, refreshIntervalMs = 30000 } = options;
  
  const [state, setState] = useState<OperationalDashboardState | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [service, setService] = useState<DashboardService | null>(null);

  // Initialize dashboard service
  useEffect(() => {
    try {
      const dashboardService = getDashboardService(workspaceId);
      setService(dashboardService);
      setState(dashboardService.getState());
      setError(undefined);
    } catch (err) {
      setError('Failed to initialize dashboard service');
      console.error('Dashboard initialization error:', err);
    }
  }, [workspaceId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!service) return;

    const unsubscribe = service.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, [service]);

  // Auto-refresh projections if enabled
  useEffect(() => {
    if (!autoRefresh || !service) return;

    const interval = setInterval(() => {
      service.rebuildProjections();
    }, refreshIntervalMs);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshIntervalMs, service]);

  // Action handlers
  const acknowledgeAlert = useCallback((alertId: string) => {
    service?.acknowledgeAlert(alertId);
  }, [service]);

  const dismissAlert = useCallback((alertId: string) => {
    service?.dismissAlert(alertId);
  }, [service]);

  const triggerQuickAction = useCallback((actionId: string) => {
    // This would integrate with workflow execution system
    // For now, just log the action trigger
    console.log('Quick action triggered:', actionId);
    // In real implementation:
    // workflowExecutor.execute(actionId);
  }, []);

  const rebuildProjections = useCallback(async () => {
    await service?.rebuildProjections();
  }, [service]);

  // Derived selectors
  const criticalAlerts = state?.alerts.filter(a => a.severity === 'critical') || [];
  const unacknowledgedAlerts = state?.alerts.filter(a => !a.acknowledged && a.actionRequired) || [];
  const enabledQuickActions = state?.quickActions.filter(a => a.enabled) || [];

  return {
    state,
    isLoading: state?.isLoading ?? true,
    error,
    acknowledgeAlert,
    dismissAlert,
    triggerQuickAction,
    rebuildProjections,
    criticalAlerts,
    unacknowledgedAlerts,
    enabledQuickActions,
  };
}

/**
 * Hook for subscribing to specific dashboard metrics only
 * Optimized for components that only need metrics without full state
 */
export function useDashboardMetrics(workspaceId: string) {
  const [metrics, setMetrics] = useState<UseDashboardReturn['state']['metrics'] | null>(null);
  
  useEffect(() => {
    const service = getDashboardService(workspaceId);
    
    const unsubscribe = service.subscribe((newState) => {
      setMetrics(newState.metrics);
    });

    // Initial value
    setMetrics(service.getState()?.metrics || null);

    return unsubscribe;
  }, [workspaceId]);

  return metrics;
}

/**
 * Hook for subscribing to alerts only
 * Optimized for alert panel components
 */
export function useDashboardAlerts(workspaceId: string) {
  const [alerts, setAlerts] = useState<UseDashboardReturn['state']['alerts'] | null>(null);
  
  useEffect(() => {
    const service = getDashboardService(workspaceId);
    
    const unsubscribe = service.subscribe((newState) => {
      setAlerts(newState.alerts);
    });

    // Initial value
    setAlerts(service.getState()?.alerts || null);

    return unsubscribe;
  }, [workspaceId]);

  return alerts;
}

/**
 * Hook for subscribing to recent activity only
 * Optimized for activity feed components
 */
export function useDashboardActivity(workspaceId: string) {
  const [activity, setActivity] = useState<UseDashboardReturn['state']['recentActivity'] | null>(null);
  
  useEffect(() => {
    const service = getDashboardService(workspaceId);
    
    const unsubscribe = service.subscribe((newState) => {
      setActivity(newState.recentActivity);
    });

    // Initial value
    setActivity(service.getState()?.recentActivity || null);

    return unsubscribe;
  }, [workspaceId]);

  return activity;
}
