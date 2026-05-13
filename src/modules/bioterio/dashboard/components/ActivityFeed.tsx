/**
 * Activity Feed Component
 * 
 * Displays recent operational events as a chronological activity feed.
 * Provides real-time visibility into bioterio operations.
 */

import React from 'react';
import { DashboardActivityItem } from '../types';

interface ActivityFeedProps {
  activity: DashboardActivityItem[];
  limit?: number;
  compact?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activity,
  limit = 20,
  compact = false,
}) => {
  const displayedActivity = activity.slice(0, limit);

  if (displayedActivity.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>📋</div>
        <div style={styles.emptyText}>No recent activity</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {!compact && <h2 style={styles.title}>Recent Activity</h2>}
      <div style={styles.list}>
        {displayedActivity.map((item, index) => (
          <ActivityItem key={item.id} item={item} isLatest={index === 0} />
        ))}
      </div>
    </div>
  );
};

interface ActivityItemProps {
  item: DashboardActivityItem;
  isLatest: boolean;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ item, isLatest }) => {
  const iconMap: Record<string, string> = {
    'LOT_CREATED': '📦',
    'LOT_SUBDIVIDED': '🔀',
    'LOT_MOVED': '🚚',
    'MORTALITY_REGISTERED': '⚰️',
    'BREEDING_GROUP_CREATED': '👥',
    'LITTER_REGISTERED': '🐭',
    'WEANING_COMPLETED': '🎉',
    'CAGE_ASSIGNED': '🏠',
    'QUARANTINE_STARTED': '⚠️',
    'QUARANTINE_ENDED': '✅',
  };

  const icon = iconMap[item.eventType] || '📝';

  return (
    <div
      style={{
        ...styles.item,
        backgroundColor: isLatest ? '#f0fdf4' : 'transparent',
        borderLeft: isLatest ? '3px solid #22c55e' : '3px solid transparent',
      }}
    >
      <div style={styles.itemIcon}>{icon}</div>
      <div style={styles.itemContent}>
        <div style={styles.itemSummary}>{item.summary}</div>
        <div style={styles.itemMeta}>
          <span style={styles.itemTime}>
            {formatTimestamp(item.timestamp)}
          </span>
          {item.relatedEntities.length > 0 && (
            <span style={styles.itemEntities}>
              {item.relatedEntities.map(e => e.label || e.id).join(', ')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Format timestamp for display
 * Shows relative time for recent events, full date for older ones
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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
  },
  emptyState: {
    padding: '32px',
    textAlign: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  emptyIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: '14px',
  },
  item: {
    display: 'flex',
    gap: '12px',
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.2s',
  },
  itemIcon: {
    fontSize: '20px',
    width: '24px',
    textAlign: 'center',
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    minWidth: 0, // Allow text truncation
  },
  itemSummary: {
    fontSize: '14px',
    color: '#1f2937',
    marginBottom: '4px',
    lineHeight: 1.4,
  },
  itemMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: '#9ca3af',
  },
  itemTime: {
    fontWeight: 500,
  },
  itemEntities: {
    color: '#6b7280',
  },
};
