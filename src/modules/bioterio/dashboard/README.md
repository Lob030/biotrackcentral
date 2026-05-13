# Operational Dashboard Integration Layer

## Overview

The Operational Dashboard is the **daily operational command center** for the bioterio. It is NOT an analytics page—it is a reactive, action-oriented interface optimized for daily workflows.

## Architecture

### Key Principles

1. **Projection-Driven**: Dashboard consumes materialized projections, not raw events
2. **Event-Reactive**: Real-time updates when workflows execute
3. **Action-Oriented**: Quick actions embedded directly in the dashboard
4. **Mobile-First**: Large touch targets, minimal complexity

### Data Flow

```
Workflow Execution → Operational Event → Dashboard Service → UI Update
                          ↓
                   Projection Update
                          ↓
                   Metrics Recalculation
```

## Components

### Core Components

| Component | Purpose |
|-----------|---------|
| `OperationalDashboard` | Main dashboard container |
| `MetricsOverview` | At-a-glance operational metrics |
| `AlertsPanel` | Attention-required alerts with actions |
| `ActivityFeed` | Recent operational events timeline |
| `QuickActions` | Fast workflow triggers |

### Hooks

| Hook | Purpose |
|------|---------|
| `useDashboard` | Full dashboard state subscription |
| `useDashboardMetrics` | Metrics-only subscription (optimized) |
| `useDashboardAlerts` | Alerts-only subscription (optimized) |
| `useDashboardActivity` | Activity feed subscription (optimized) |

## How It Works

### Real-Time Reactivity

The dashboard becomes operationally reactive through:

1. **Service Subscription**: Components subscribe to `DashboardService`
2. **Event Processing**: When workflows execute, events are processed
3. **Incremental Updates**: Metrics and activity update without full reloads
4. **Projection Sync**: Periodic projection rebuilds ensure consistency

### Workflow Integration

When a workflow executes (e.g., "Move Lot"):

```typescript
// 1. Workflow executes
await moveLotWorkflow.execute({ lotId, targetCageId, quantity });

// 2. Event is created and persisted
const event = await persistOperationalEvent({
  eventType: 'LOT_MOVED',
  payload: { lotId, targetCageId, quantity }
});

// 3. Dashboard service processes the event
dashboardService.processEvent(event);

// 4. Subscribers receive updated state automatically
// - Activity feed shows new entry
// - Metrics incrementally update
// - Alerts evaluated for triggers
```

### Projection Benefits

Using projections instead of raw events provides:

| Benefit | Explanation |
|---------|-------------|
| **Performance** | No event replay needed for current state |
| **Simplicity** | Direct queries instead of complex aggregations |
| **Scalability** | Projections scale independently of event volume |
| **Consistency** | Single source of materialized truth |

## Alert System

### Alert Types

- `CAGE_OVERCAPACITY` - Cage exceeds capacity limits
- `UNUSUAL_MORTALITY` - Mortality threshold exceeded
- `UPCOMING_WEANING` - Weaning due within timeframe
- `OVERDUE_BREEDING_CYCLE` - Breeding cycle overdue
- `QUARANTINE_WARNING` - Quarantine status alerts

### Alert Lifecycle

1. **Triggered** - Event evaluation creates alert
2. **Acknowledged** - User acknowledges awareness
3. **Resolved** - Underlying issue resolved
4. **Dismissed** - Alert removed from view

## Mobile Optimization

All components are designed for mobile usage:

- **Touch Targets**: Minimum 44px height for buttons
- **Compact Modes**: All components support `compact` prop
- **Responsive Layout**: Grid adapts to screen size
- **Keyboard Shortcuts**: Desktop power-user support

## Future AI Integration

The dashboard architecture naturally supports AI assistants:

### Current Foundation

```typescript
interface QuickActionDef {
  id: string;
  label: string;
  workflowId: string;
  // ... metadata
}
```

### Future AI Enhancement

```typescript
// AI can recommend actions based on state
const recommendations = await aiAssistant.recommendActions({
  currentMetrics,
  recentAlerts,
  historicalPatterns,
});

// AI can surface context-aware quick actions
dashboardService.setRecommendedActions(recommendations);
```

### AI Use Cases

1. **Predictive Alerts**: "Breeding group likely to birth in 2 days"
2. **Anomaly Detection**: "Mortality rate 3x higher than usual"
3. **Workflow Suggestions**: "Consider subdividing lot - approaching capacity"
4. **Natural Language**: "Show me all cages with newborn litters"

## Usage Example

```tsx
import { OperationalDashboard } from '@/modules/bioterio/dashboard';

function BioterioPage() {
  return (
    <OperationalDashboard
      workspaceId="ws-123"
      autoRefresh={true}
      compact={false}
    />
  );
}
```

### Custom Dashboard Panel

```tsx
import { useDashboardMetrics, MetricsOverview } from '@/modules/bioterio/dashboard';

function CustomMetricsPanel({ workspaceId }) {
  const metrics = useDashboardMetrics(workspaceId);
  
  if (!metrics) return <Loading />;
  
  return (
    <div>
      <h3>Animal Count: {metrics.totalAnimals}</h3>
      <p>Active Lots: {metrics.activeLots}</p>
    </div>
  );
}
```

## Performance Considerations

1. **Selective Subscriptions**: Use specific hooks (`useDashboardMetrics`) when full state isn't needed
2. **Auto-Refresh Tuning**: Adjust `refreshIntervalMs` based on operational tempo
3. **Activity Limits**: Limit activity feed items with `limit` prop
4. **Projection Rebuilds**: Trigger manually after bulk operations, not after every event

## Files Created

```
src/modules/bioterio/dashboard/
├── types.ts              # Type definitions
├── service.ts            # Dashboard state management
├── hooks.ts              # React hooks for subscriptions
├── index.ts              # Module exports
└── components/
    ├── Dashboard.tsx     # Main dashboard component
    ├── MetricsOverview.tsx
    ├── AlertsPanel.tsx
    ├── ActivityFeed.tsx
    └── QuickActions.tsx
```
