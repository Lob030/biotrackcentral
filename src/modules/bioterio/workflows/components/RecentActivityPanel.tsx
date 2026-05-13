/**
 * Recent Activity Panel Component
 * 
 * Shows recent operational activities in real-time.
 * Provides immediate feedback on workflow executions.
 * 
 * FEATURES:
 * - Real-time activity updates
 * - Undo/ reversal suggestions
 * - Filter by activity type
 * - Mobile-optimized layout
 */

import React from 'react';

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  userId: string;
  metadata?: Record<string, unknown>;
  reversible?: boolean;
  reversalAction?: string;
}

export interface RecentActivityPanelProps {
  activities: ActivityItem[];
  onUndo?: (activityId: string) => void;
  limit?: number;
  showFilter?: boolean;
}

export function RecentActivityPanel({
  activities,
  onUndo,
  limit = 10,
  showFilter = true,
}: RecentActivityPanelProps) {
  const recentActivities = activities.slice(0, limit);

  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      lot_created: '📦',
      lot_subdivided: '✂️',
      lot_moved: '🔄',
      mortality_registered: '⚠️',
      breeding_group_created: '🐭',
      litter_registered: '🍼',
      lot_weaned: '🎯',
      lot_assigned_to_cage: '🏠',
    };
    return icons[type] || '•';
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="recent-activity-panel bg-white rounded-lg shadow-sm border">
      <div className="panel-header p-4 border-b flex justify-between items-center">
        <h3 className="font-semibold text-gray-800">Recent Activity</h3>
        {showFilter && (
          <select className="text-sm border rounded px-2 py-1">
            <option value="all">All Types</option>
            <option value="lots">Lots</option>
            <option value="breeding">Breeding</option>
            <option value="mortality">Mortality</option>
          </select>
        )}
      </div>

      <div className="panel-content">
        {recentActivities.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No recent activity
          </div>
        ) : (
          <ul className="divide-y">
            {recentActivities.map((activity) => (
              <li
                key={activity.id}
                className="activity-item p-3 hover:bg-gray-50 flex gap-3"
              >
                <div className="activity-icon text-xl w-8 h-8 flex items-center justify-center">
                  {getActivityIcon(activity.type)}
                </div>

                <div className="activity-content flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {activity.description}
                    </p>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                  </div>

                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {activity.metadata.quantity && (
                        <span>Qty: {activity.metadata.quantity} • </span>
                      )}
                      {activity.metadata.reason && (
                        <span>Reason: {activity.metadata.reason}</span>
                      )}
                    </div>
                  )}

                  {onUndo && activity.reversible && (
                    <button
                      onClick={() => onUndo(activity.id)}
                      className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                    >
                      Undo ({activity.reversalAction})
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
