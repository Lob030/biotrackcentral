/**
 * Main Operational Dashboard Component
 * 
 * Composes all dashboard widgets into a unified operational command center.
 * Connects to the dashboard service for real-time updates.
 */

import React from 'react';
import { useDashboard } from '../hooks';
import { MetricsOverview } from './MetricsOverview';
import { AlertsPanel } from './AlertsPanel';
import { ActivityFeed } from './ActivityFeed';
import { QuickActions } from './QuickActions';

interface OperationalDashboardProps {
  workspaceId: string;
  autoRefresh?: boolean;
  compact?: boolean;
}

export const OperationalDashboard: React.FC<OperationalDashboardProps> = ({
  workspaceId,
  autoRefresh = true,
  compact = false,
}) => {
  const {
    state,
    isLoading,
    error,
    acknowledgeAlert,
    dismissAlert,
    triggerQuickAction,
  } = useDashboard({ workspaceId, autoRefresh });

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <div style={styles.loadingText}>Loading operational data...</div>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <div style={styles.errorTitle}>Failed to load dashboard</div>
        <div style={styles.errorMessage}>{error || 'Unknown error'}</div>
      </div>
    );
  }

  if (compact) {
    return (
      <div style={styles.compactDashboard}>
        <MetricsOverview metrics={state.metrics} compact />
        <AlertsPanel
          alerts={state.alerts.filter(a => !a.acknowledged)}
          onAcknowledge={acknowledgeAlert}
          onDismiss={dismissAlert}
          compact
        />
        <QuickActions
          actions={state.quickActions.filter(a => a.enabled)}
          onTrigger={triggerQuickAction}
          compact
        />
      </div>
    );
  }

  return (
    <div style={styles.dashboard}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Operational Dashboard</h1>
        <div style={styles.headerMeta}>
          <span style={styles.lastUpdated}>
            Updated: {new Date(state.lastUpdated).toLocaleTimeString()}
          </span>
        </div>
      </header>

      {/* Metrics Overview - Full Width */}
      <section style={styles.section}>
        <MetricsOverview metrics={state.metrics} />
      </section>

      {/* Two Column Layout */}
      <div style={styles.twoColumn}>
        {/* Left Column - Alerts & Quick Actions */}
        <div style={styles.leftColumn}>
          <section style={styles.section}>
            <AlertsPanel
              alerts={state.alerts}
              onAcknowledge={acknowledgeAlert}
              onDismiss={dismissAlert}
            />
          </section>
          
          <section style={styles.section}>
            <QuickActions
              actions={state.quickActions.filter(a => a.enabled)}
              onTrigger={triggerQuickAction}
            />
          </section>
        </div>

        {/* Right Column - Activity Feed */}
        <div style={styles.rightColumn}>
          <section style={styles.section}>
            <ActivityFeed activity={state.recentActivity} limit={15} />
          </section>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  dashboard: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#111827',
    margin: 0,
  },
  headerMeta: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  lastUpdated: {
    fontSize: '13px',
    color: '#6b7280',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    padding: '0 24px 24px',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '16px',
    fontSize: '14px',
    color: '#6b7280',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    padding: '24px',
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  errorTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '8px',
  },
  errorMessage: {
    fontSize: '14px',
    color: '#6b7280',
  },
  compactDashboard: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
};

// Add CSS animation for spinner
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
