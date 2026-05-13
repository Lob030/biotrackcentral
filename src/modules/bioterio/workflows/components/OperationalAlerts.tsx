/**
 * Operational Alerts Component
 * 
 * Displays operational alerts and warnings.
 */

import React from 'react';
import type { OperationalAlert } from '../types';

export interface OperationalAlertsProps {
  alerts: OperationalAlert[];
  onAcknowledge?: (alertId: string) => void;
  limit?: number;
}

export function OperationalAlerts({
  alerts,
  onAcknowledge,
  limit = 5,
}: OperationalAlertsProps) {
  const recentAlerts = alerts.slice(0, limit);

  const alertStyles = {
    warning: 'bg-yellow-50 border-yellow-300 text-yellow-800',
    error: 'bg-red-50 border-red-300 text-red-800',
    info: 'bg-blue-50 border-blue-300 text-blue-800',
  };

  const alertIcons = {
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️',
  };

  return (
    <div className="operational-alerts space-y-2">
      {recentAlerts.length === 0 ? (
        <div className="text-gray-400 text-sm text-center py-4">No alerts</div>
      ) : (
        recentAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-3 rounded-lg border ${alertStyles[alert.type]} flex gap-3 items-start`}
          >
            <span className="text-xl">{alertIcons[alert.type]}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{alert.title}</div>
              <div className="text-sm opacity-80">{alert.message}</div>
            </div>
            {onAcknowledge && !alert.acknowledged && (
              <button
                onClick={() => onAcknowledge(alert.id)}
                className="text-sm underline whitespace-nowrap"
              >
                Dismiss
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
