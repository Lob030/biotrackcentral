# Bioterio Operational Persistence Layer

## Architecture Overview

This document explains the **Hybrid Event-Driven Operational Model** implemented for the Bioterio system.

---

## Why Hybrid Event-Driven Architecture?

### The Problem with Pure Approaches

**Pure CRUD:**
- Loses historical context
- No audit trail without extra work
- Hard to debug "how did we get here?"
- Difficult temporal queries

**Pure Event Sourcing:**
- Requires full event replay for current state
- Complex query patterns
- Performance overhead for simple reads
- Steep learning curve for developers

### Our Solution: Hybrid Event-Driven

We combine the best of both approaches:

```
┌─────────────────────────────────────────────────────────────┐
│                    OPERATIONAL EVENTS                        │
│                   (Immutable History)                        │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Event 1  │→ │ Event 2  │→ │ Event 3  │→ │ Event N  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│       ↓             ↓             ↓             ↓            │
│  (triggers projection updates)                              │
│       ↓                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          MATERIALIZED PROJECTIONS                    │   │
│  │         (Fast Runtime Access)                        │   │
│  │  • current_lot_state                                 │   │
│  │  • current_cage_occupancy                            │   │
│  │  • active_breeding_groups                            │   │
│  │  • operational_dashboard_snapshot                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Why Projections Are Necessary

### 1. Performance

Querying raw events for dashboards would be prohibitively slow:

```typescript
// ❌ WRONG: Querying raw events for every dashboard render
async function getDashboardData() {
  const allEvents = await supabase
    .from('operational_events')
    .select('*');
  
  // Need to replay thousands of events...
  // This happens on EVERY page load
}

// ✅ CORRECT: Read from materialized projection
async function getDashboardData() {
  const snapshot = await supabase
    .from('operational_dashboard_snapshot')
    .select('*')
    .single();
  
  // Instant response, pre-computed
}
```

### 2. Simplicity

Projections provide intuitive query patterns:

```typescript
// Get current lot status - simple!
const lot = await supabase
  .from('current_lot_state')
  .select('*')
  .eq('lot_id', id)
  .single();

// vs reconstructing from events:
const events = await getLotEvents(id);
let status = 'active';
for (const event of events) {
  if (event.type === 'status_changed') {
    status = event.newStatus;
  }
}
```

### 3. Separation of Concerns

- **Events** = Source of truth, audit trail, compliance
- **Projections** = Fast reads, dashboard data, UI state

---

## How Immutable Operational History Works

### INSERT ONLY Policy

Event tables have RLS policies that prevent UPDATE and DELETE:

```sql
-- Lot events: INSERT only
CREATE POLICY "Workspace members can insert lot events"
ON lot_events FOR INSERT TO authenticated
WITH CHECK (is_immutable = TRUE);

-- NO UPDATE OR DELETE POLICIES
-- Any attempt to modify will fail at database level
```

### Event Structure

Every event includes:

```typescript
interface OperationalEvent {
  id: string;              // UUID
  event_type: string;      // What happened
  event_data: JSONB;       // Full payload
  occurred_at: string;     // When it happened (UTC)
  is_immutable: true;      // Marker
  event_hash?: string;     // Integrity verification
  
  // Context
  lot_id?: string;
  cage_id?: string;
  performed_by?: string;
}
```

### Audit Trail Example

```
Lot ASF-001 Lifecycle:

2025-01-15 10:00 - lot_created
  ├─ quantity: 20
  └─ species: mouse

2025-01-20 14:30 - lot_subdivided
  ├─ child_lots: [ASF-001-M, ASF-001-F]
  └─ quantities: {male: 10, female: 10}

2025-01-25 09:15 - lot_mortality
  ├─ quantity_affected: 2
  └─ reason: respiratory_infection

2025-02-01 16:00 - lot_sold
  └─ customer_id: cust_123

HISTORY PRESERVED FOREVER
```

---

## How AI and Analytics Consume Events

### 1. Training Data

Events provide rich, timestamped training data:

```typescript
// AI can analyze patterns from historical events
const mortalityPatterns = await analyzeEvents({
  eventType: 'lot_mortality',
  timeRange: 'last_6_months',
  groupBy: ['species_id', 'cage_id'],
});

// Result: Identify risk factors
{
  highRiskSpecies: ['species_rat'],
  highRiskCages: ['R2-B-03'],
  commonCauses: ['respiratory', 'age_related']
}
```

### 2. Predictive Analytics

```typescript
// Predict future outcomes based on event history
const prediction = await aiPredict({
  model: 'mortality_risk',
  features: {
    lotHistory: await getLotEvents(lotId),
    cageHistory: await getCageEvents(cageId),
    environmentalData: await getEnvironmentalReadings(),
  },
});

// Returns: { riskScore: 0.23, factors: [...] }
```

### 3. Anomaly Detection

```typescript
// Detect unusual patterns in real-time
const anomalies = await detectAnomalies({
  eventStream: operationalEvents,
  baseline: historicalAverages,
  threshold: 2.0, // standard deviations
});

// Alerts: "Mortality rate 3x normal for strain C57BL/6"
```

### 4. Compliance Reporting

```typescript
// Generate compliance reports from immutable history
const report = await generateComplianceReport({
  period: '2025-Q1',
  requirements: ['IACUC', 'AAALAC'],
  evidenceSource: 'operational_events',
});

// All claims backed by immutable event records
```

---

## Scaling Safely

### Horizontal Scaling Strategy

1. **Write Path**: Events are append-only → easy to shard by workspace_id
2. **Read Path**: Projections can be cached/replicated independently
3. **Rebuild**: Projections can be regenerated from events if needed

### Partitioning Strategy

```sql
-- Future: Partition events by month
CREATE TABLE operational_events_2025_01 PARTITION OF operational_events
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Query recent events efficiently
SELECT * FROM operational_events
WHERE occurred_at > NOW() - INTERVAL '30 days';
```

### Projection Refresh Strategies

```typescript
// Real-time: Update on every event
onEvent('lot_created', async (event) => {
  await rebuildLotStateProjection(event.lotId);
});

// Batch: Periodic refresh for expensive projections
cron('0 * * * *', async () => {  // Every hour
  await generateDashboardSnapshot();
});

// On-demand: For specific queries
async function getHistoricalSnapshot(date: Date) {
  return replayEventsToDate(date);
}
```

---

## Key Design Decisions

### 1. UUIDs Everywhere

```typescript
// ✅ Good: UUIDs
id: '550e8400-e29b-41d4-a716-446655440000'

// ❌ Bad: Incremental IDs
id: 12345  // Reveals business volume, enumerable
```

**Why:**
- Non-enumerable (security)
- Distributed generation possible
- No coordination required

### 2. UTC Timestamps Always

```typescript
// All timestamps stored as ISO 8601 UTC
created_at: '2025-01-15T10:00:00Z'
```

**Why:**
- Consistent across timezones
- Easy arithmetic/comparison
- No DST issues

### 3. Species by Reference, Not Enum

```typescript
// ✅ Flexible: String reference
species_id: 'species_mouse_c57bl6'

// ❌ Rigid: Hardcoded enum
enum Species { Mouse, Rat, Hamster }
```

**Why:**
- Custom strains/varieties
- Integration with external registries
- No code changes for new species

### 4. Archived, Not Deleted

```typescript
// Soft delete pattern
is_archived: boolean
archived_at: TIMESTAMPTZ
archived_reason: TEXT
```

**Why:**
- Preserves referential integrity
- Historical queries still work
- Compliance requirements

---

## Usage Examples

### Recording an Operational Event

```typescript
import { persistenceServices } from '@/modules/bioterio/persistence';

// Record a mortality event
const result = await persistenceServices.persistOperationalEvent(
  'lot_mortality',
  {
    lotId: 'lot-uuid',
    quantityAffected: 2,
    cause: 'respiratory_infection',
    discoveredBy: 'user-uuid',
  },
  { lotId: 'lot-uuid' },
  {
    reason: 'Found deceased during morning check',
    performedBy: 'user-uuid',
    performedByName: 'Dr. Smith',
  }
);

// Automatically updates projections
await persistenceServices.rebuildLotStateProjection('lot-uuid');
```

### Reading Dashboard Data

```typescript
// Dashboard reads from projection, not raw events
const snapshot = await supabase
  .from('operational_dashboard_snapshot')
  .select('*')
  .eq('workspace_id', workspaceId)
  .single();

console.log(snapshot.data);
// {
//   total_animals: 1250,
//   active_lots: 45,
//   mortality_today: 3,
//   events_last_24h: 127
// }
```

### Temporal Query (Point-in-Time)

```typescript
// Where was lot ASF-001 on Jan 22?
const movementHistory = await supabase
  .from('cage_movements')
  .select('*, cages(code)')
  .eq('lot_id', lotId)
  .lte('occurred_at', '2025-01-22T23:59:59Z')
  .order('occurred_at', { ascending: false })
  .limit(1);

// Returns the last movement before that date
```

---

## Summary

| Aspect | Implementation |
|--------|---------------|
| **Source of Truth** | Immutable operational events |
| **Fast Reads** | Materialized projections |
| **Audit Trail** | Complete event history |
| **Temporal Queries** | Event replay + movement history |
| **AI/Analytics** | Direct event consumption |
| **Scaling** | Shard by workspace, cache projections |
| **Compliance** | Immutable records with hashes |

This architecture provides:
- ✅ Historical traceability
- ✅ Fast operational reads
- ✅ AI-ready data foundation
- ✅ Compliance support
- ✅ Scalable design
