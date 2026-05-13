/**
 * Alerts Panel Component
 * 
 * Displays operational alerts requiring attention.
 * Supports acknowledgment and dismissal actions.
 * Optimized for mobile with large touch targets.
 */

import React from 'react';
import { OperationalAlert, AlertSeverity } from '../types';

interface AlertsPanelProps {
  alerts: OperationalAlert[];
  onAcknowledge: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
  compact?: boolean;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  onAcknowledge,
  onDismiss,
  compact = false,
}) => {
  if (alerts.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>✓</div>
        <div style={styles.emptyText}>No alerts requiring attention</div>
      </div>
    );
  }

  const sortedAlerts = [...alerts].sort((a, b) => {
    // Critical first, then warning, then info
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  if (compact) {
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const warningCount = alerts.filter(a => a.severity === 'warning' && !a.acknowledged).length;

    return (
      <div style={styles.compactContainer}>
        {criticalCount > 0 && (
          <div style={{ ...styles.compactBadge, backgroundColor: '#ef4444', color: 'white' }}>
            {criticalCount} Critical
          </div>
        )}
        {warningCount > 0 && (
          <div style={{ ...styles.compactBadge, backgroundColor: '#f97316', color: 'white' }}>
            {warningCount} Warning{warningCount > 1 ? 's' : ''}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Attention Required</h2>
      <div style={styles.list}>
        {sortedAlerts.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onAcknowledge={() => onAcknowledge(alert.id)}
            onDismiss={() => onDismiss(alert.id)}
          />
        ))}
      </div>
    </div>
  );
};

interface AlertCardProps {
  alert: OperationalAlert;
  onAcknowledge: () => void;
  onDismiss: () => void;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert, onAcknowledge, onDismiss }) => {
  const severityStyles = {
    critical: { border: '#ef4444', bg: '#fef2f2', icon: '⚠️' },
    warning: { border: '#f97316', bg: '#fff7ed', icon: '⚡' },
    info: { border: '#3b82f6', bg: '#eff6ff', icon: 'ℹ️' },
  };

  const style = severityStyles[alert.severity];

  return (
    <div
      style={{
        ...styles.alertCard,
        backgroundColor: style.bg,
        borderLeft: `4px solid ${style.border}`,
        opacity: alert.acknowledged ? 0.7 : 1,
      }}
    >
      <div style={styles.alertHeader}>
        <span style={styles.alertIcon}>{style.icon}</span>
        <div style={styles.alertTitle}>{alert.title}</div>
        <span style={{ ...styles.badge, backgroundColor: alert.severity === 'critical' ? '#ef4444' : alert.severity === 'warning' ? '#f97316' : '#3b82f6' }}>
          {alert.severity.toUpperCase()}
        </span>
      </div>
      
      <div style={styles.alertMessage}>{alert.message}</div>
      
      <div style={styles.alertFooter}>
        <div style={styles.alertTime}>
          {new Date(alert.createdAt).toLocaleString()}
        </div>
        <div style={styles.alertActions}>
          {!alert.acknowledged && alert.actionRequired && (
            <button
              onClick={onAcknowledge}
              style={styles.acknowledgeButton}
              aria-label="Acknowledge alert"
            >
              Acknowledge
            </button>
          )}
          <button
            onClick={onDismiss}
            style={styles.dismissButton}
            aria-label="Dismiss alert"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '16px',
    color: '#1f2937',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  emptyState: {
    padding: '32px',
    textAlign: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  emptyIcon: {
    fontSize: '32px',
    color: '#22c55e',
    marginBottom: '8px',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: '14px',
  },
  compactContainer: {
    display: 'flex',
    gap: '8px',
  },
  compactBadge: {
    padding: '6px 12px',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: 600,
  },
  alertCard: {
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  alertHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  alertIcon: {
    fontSize: '18px',
  },
  alertTitle: {
    flex: 1,
    fontSize: '15px',
    fontWeight: 600,
    color: '#1f2937',
  },
  badge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 700,
    color: 'white',
    textTransform: 'uppercase',
  },
  alertMessage: {
    fontSize: '14px',
    color: '#4b5563',
    marginBottom: '12px',
    lineHeight: 1.5,
  },
  alertFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertTime: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  alertActions: {
    display: 'flex',
    gap: '8px',
  },
  acknowledgeButton: {
    padding: '8px 16px',
    backgroundColor: '#22c55e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    minHeight: '40px', // Mobile-friendly touch target
  },
  dismissButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    minHeight: '40px', // Mobile-friendly touch target
  },
};
