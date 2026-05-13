/**
 * Operational Dashboard Service
 * 
 * Central service for managing dashboard state by consuming operational projections.
 * Integrates with event runtime for real-time updates and workflow execution.
 */

import { OperationalDashboardState, DashboardMetrics, OperationalAlert, DashboardActivityItem } from './types';
import { LotStateProjection, CageOccupancyProjection } from '../persistence/types';
import { BreedingGroupStatus } from '../reproduction/types';
import { OperationalEvent } from '../events/types';

// Mock imports - these would connect to actual runtime services
// import { lotRuntime } from '../lot/runtime';
// import { cageRuntime } from '../cage/runtime';
// import { eventRuntime } from '../events/runtime';
// import { breedingRuntime } from '../reproduction/runtime';

export class DashboardService {
  private state: OperationalDashboardState | null = null;
  private subscribers: Set<(state: OperationalDashboardState) => void> = new Set();
  
  constructor(private workspaceId: string) {
    this.state = this.createInitialState();
  }

  private createInitialState(): OperationalDashboardState {
    return {
      metrics: {
        totalLots: 0,
        activeLots: 0,
        totalCages: 0,
        occupiedCages: 0,
        availableCages: 0,
        overcapacityCages: 0,
        activeBreedingGroups: 0,
        pendingWeanings: 0,
        totalAnimals: 0,
        mortalityLast7Days: 0,
        birthsLast7Days: 0,
      },
      alerts: [],
      recentActivity: [],
      quickActions: this.getDefaultQuickActions(),
      lotStates: [],
      cageOccupancy: [],
      activeBreedingGroups: [],
      lastUpdated: new Date().toISOString(),
      isLoading: false,
      filterWorkspaceId: this.workspaceId,
    };
  }

  private getDefaultQuickActions() {
    return [
      { id: 'create-lot', label: 'Create Lot', icon: 'plus-circle', workflowId: 'create-lot', shortcut: 'Ctrl+L', enabled: true, category: 'LOT' as const },
      { id: 'move-lot', label: 'Move Lot', icon: 'arrow-right', workflowId: 'move-lot', shortcut: 'Ctrl+M', enabled: true, category: 'LOT' as const },
      { id: 'subdivide-lot', label: 'Subdivide', icon: 'split', workflowId: 'subdivide-lot', shortcut: 'Ctrl+S', enabled: true, category: 'LOT' as const },
      { id: 'register-mortality', label: 'Mortality', icon: 'alert-triangle', workflowId: 'register-mortality', shortcut: 'Ctrl+D', enabled: true, category: 'GENERAL' as const },
      { id: 'create-breeding', label: 'Breeding Group', icon: 'users', workflowId: 'create-breeding-group', shortcut: 'Ctrl+B', enabled: true, category: 'BREEDING' as const },
    ];
  }

  /**
   * Subscribe to dashboard state changes
   */
  subscribe(callback: (state: OperationalDashboardState) => void): () => void {
    this.subscribers.add(callback);
    // Immediately call with current state
    if (this.state) {
      callback(this.state);
    }
    return () => this.subscribers.delete(callback);
  }

  /**
   * Update dashboard state from operational projections
   * Called when projections are rebuilt or updated
   */
  updateFromProjections(
    lotStates: LotStateProjection[],
    cageOccupancy: CageOccupancyProjection[],
    breedingGroups: BreedingGroupStatus[]
  ) {
    if (!this.state) return;

    const metrics = this.calculateMetrics(lotStates, cageOccupancy, breedingGroups);
    
    this.state = {
      ...this.state,
      lotStates,
      cageOccupancy,
      activeBreedingGroups: breedingGroups,
      metrics,
      lastUpdated: new Date().toISOString(),
    };

    this.notifySubscribers();
  }

  /**
   * Calculate materialized metrics from projections
   */
  private calculateMetrics(
    lotStates: LotStateProjection[],
    cageOccupancy: CageOccupancyProjection[],
    breedingGroups: BreedingGroupStatus[]
  ): DashboardMetrics {
    const activeLots = lotStates.filter(l => l.status === 'ACTIVE');
    const occupiedCages = cageOccupancy.filter(c => c.occupancyStatus !== 'EMPTY');
    const overcapacityCages = cageOccupancy.filter(c => c.isOvercapacity);
    const activeBreeding = breedingGroups.filter(b => b.status === 'ACTIVE');
    
    const totalAnimals = lotStates.reduce((sum, lot) => sum + lot.currentQuantity, 0);
    
    // Note: mortality and births would come from time-filtered event aggregations
    // For now using placeholder values that would be populated from projection queries
    
    return {
      totalLots: lotStates.length,
      activeLots: activeLots.length,
      totalCages: cageOccupancy.length,
      occupiedCages: occupiedCages.length,
      availableCages: cageOccupancy.length - occupiedCages.length,
      overcapacityCages: overcapacityCages.length,
      activeBreedingGroups: activeBreeding.length,
      pendingWeanings: breedingGroups.filter(b => b.status === 'WEANING_PENDING').length,
      totalAnimals,
      mortalityLast7Days: 0, // Would query mortality events from last 7 days
      birthsLast7Days: 0, // Would query litter events from last 7 days
    };
  }

  /**
   * Process a new operational event and update dashboard accordingly
   * This enables real-time reactivity without full projection rebuilds
   */
  processEvent(event: OperationalEvent) {
    if (!this.state) return;

    // Add to recent activity
    const activityItem = this.eventToActivityItem(event);
    this.state.recentActivity = [activityItem, ...this.state.recentActivity].slice(0, 50);

    // Check if event triggers alerts
    const newAlerts = this.evaluateAlerts(event);
    if (newAlerts.length > 0) {
      this.state.alerts = [...newAlerts, ...this.state.alerts];
    }

    // Update relevant metrics based on event type
    this.updateMetricsForEvent(event);

    this.state.lastUpdated = new Date().toISOString();
    this.notifySubscribers();
  }

  /**
   * Convert operational event to dashboard activity item
   */
  private eventToActivityItem(event: OperationalEvent): DashboardActivityItem {
    const summary = this.generateEventSummary(event);
    
    return {
      id: `activity-${event.id}`,
      eventId: event.id,
      eventType: event.eventType,
      summary,
      timestamp: event.timestamp,
      actorId: event.metadata?.actorId,
      relatedEntities: this.extractRelatedEntities(event),
    };
  }

  /**
   * Generate human-readable summary for event
   */
  private generateEventSummary(event: OperationalEvent): string {
    const summaries: Record<string, (e: OperationalEvent) => string> = {
      'LOT_CREATED': (e) => `Created new lot ${e.payload.lotId}`,
      'LOT_SUBDIVIDED': (e) => `Subdivided lot into ${e.payload.newLotIds?.length || 0} new lots`,
      'LOT_MOVED': (e) => `Moved ${e.payload.quantity || 0} animals to cage ${e.payload.targetCageId}`,
      'MORTALITY_REGISTERED': (e) => `Registered ${e.payload.quantity || 0} mortalities in lot ${e.payload.lotId}`,
      'BREEDING_GROUP_CREATED': (e) => `Created breeding group ${e.payload.breedingGroupId}`,
      'LITTER_REGISTERED': (e) => `Registered litter with ${e.payload.pupCount || 0} pups`,
      'WEANING_COMPLETED': (e) => `Completed weaning for litter ${e.payload.litterId}`,
    };

    const generator = summaries[event.eventType];
    return generator ? generator(event) : `Executed ${event.eventType}`;
  }

  /**
   * Extract related entities from event for activity display
   */
  private extractRelatedEntities(event: OperationalEvent): { type: string; id: string; label?: string }[] {
    const entities: { type: string; id: string; label?: string }[] = [];
    
    if (event.payload.lotId) {
      entities.push({ type: 'LOT', id: event.payload.lotId });
    }
    if (event.payload.cageId) {
      entities.push({ type: 'CAGE', id: event.payload.cageId });
    }
    if (event.payload.breedingGroupId) {
      entities.push({ type: 'BREEDING_GROUP', id: event.payload.breedingGroupId });
    }
    if (event.payload.litterId) {
      entities.push({ type: 'LITTER', id: event.payload.litterId });
    }

    return entities;
  }

  /**
   * Evaluate if an event should trigger operational alerts
   */
  private evaluateAlerts(event: OperationalEvent): OperationalAlert[] {
    const alerts: OperationalAlert[] = [];

    // Check for mortality threshold
    if (event.eventType === 'MORTALITY_REGISTERED') {
      const quantity = event.payload.quantity || 0;
      if (quantity > 5) {
        alerts.push({
          id: `alert-${event.id}`,
          type: 'UNUSUAL_MORTALITY',
          severity: 'warning',
          title: 'Unusual Mortality Detected',
          message: `${quantity} animals died in lot ${event.payload.lotId}. Review required.`,
          relatedEntityId: event.payload.lotId,
          relatedEntityType: 'LOT',
          createdAt: event.timestamp,
          acknowledged: false,
          actionRequired: true,
        });
      }
    }

    // Additional alert rules would go here
    // - Cage overcapacity detection
    // - Overdue breeding cycles
    // - Upcoming weanings

    return alerts;
  }

  /**
   * Incrementally update metrics based on event type
   * Avoids full recalculation for simple operations
   */
  private updateMetricsForEvent(event: OperationalEvent) {
    if (!this.state) return;
    const m = { ...this.state.metrics };

    switch (event.eventType) {
      case 'LOT_CREATED':
        m.totalLots++;
        m.activeLots++;
        break;
      case 'MORTALITY_REGISTERED':
        m.mortalityLast7Days += event.payload.quantity || 0;
        break;
      case 'LITTER_REGISTERED':
        m.birthsLast7Days += event.payload.pupCount || 0;
        break;
      // Additional cases for other event types
    }

    this.state.metrics = m;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string) {
    if (!this.state) return;
    
    this.state.alerts = this.state.alerts.map(alert =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    );
    
    this.notifySubscribers();
  }

  /**
   * Dismiss an alert
   */
  dismissAlert(alertId: string) {
    if (!this.state) return;
    
    this.state.alerts = this.state.alerts.filter(alert => alert.id !== alertId);
    this.notifySubscribers();
  }

  /**
   * Get current state snapshot
   */
  getState(): OperationalDashboardState | null {
    return this.state;
  }

  /**
   * Notify all subscribers of state change
   */
  private notifySubscribers() {
    if (!this.state) return;
    this.subscribers.forEach(callback => callback(this.state));
  }

  /**
   * Trigger full projection rebuild
   * Called periodically or after bulk operations
   */
  async rebuildProjections() {
    if (!this.state) return;
    
    this.state.isLoading = true;
    this.notifySubscribers();

    try {
      // In real implementation, this would call persistence layer
      // to fetch fresh projections from Supabase
      // await persistenceService.rebuildOperationalProjection(this.workspaceId);
      
      console.log('Projection rebuild triggered for workspace:', this.workspaceId);
    } finally {
      if (this.state) {
        this.state.isLoading = false;
        this.state.lastUpdated = new Date().toISOString();
      }
      this.notifySubscribers();
    }
  }
}

// Singleton pattern for workspace-specific instances
const dashboardInstances = new Map<string, DashboardService>();

export function getDashboardService(workspaceId: string): DashboardService {
  if (!dashboardInstances.has(workspaceId)) {
    dashboardInstances.set(workspaceId, new DashboardService(workspaceId));
  }
  return dashboardInstances.get(workspaceId)!;
}
