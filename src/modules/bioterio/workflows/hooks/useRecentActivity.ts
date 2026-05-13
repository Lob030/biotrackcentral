/**
 * useRecentActivity Hook
 * 
 * Manages recent operational activity state.
 */

import { useState, useCallback } from 'react';
import type { OperationalActivity } from '../types';

export function useRecentActivity(maxItems = 50) {
  const [activities, setActivities] = useState<OperationalActivity[]>([]);

  /**
   * Add a new activity
   */
  const addActivity = useCallback((activity: Omit<OperationalActivity, 'id' | 'timestamp'>) => {
    const newActivity: OperationalActivity = {
      ...activity,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    setActivities((prev) => [newActivity, ...prev].slice(0, maxItems));
    return newActivity;
  }, [maxItems]);

  /**
   * Add activities from workflow results
   */
  const addFromWorkflow = useCallback(
    (
      type: string,
      description: string,
      metadata?: Record<string, unknown>,
      userId?: string
    ) => {
      return addActivity({
        type,
        description,
        userId: userId || 'system',
        metadata,
      });
    },
    [addActivity]
  );

  /**
   * Clear all activities
   */
  const clearActivities = useCallback(() => {
    setActivities([]);
  }, []);

  /**
   * Get activities filtered by type
   */
  const getActivitiesByType = useCallback(
    (type: string): OperationalActivity[] => {
      return activities.filter((a) => a.type === type);
    },
    [activities]
  );

  /**
   * Get recent activities within time window
   */
  const getRecentActivities = useCallback(
    (minutes: number): OperationalActivity[] => {
      const cutoff = new Date(Date.now() - minutes * 60 * 1000);
      return activities.filter((a) => a.timestamp >= cutoff);
    },
    [activities]
  );

  return {
    activities,
    addActivity,
    addFromWorkflow,
    clearActivities,
    getActivitiesByType,
    getRecentActivities,
    count: activities.length,
  };
}
