/**
 * Metrics Overview Component
 * 
 * Displays operational metrics in a compact, at-a-glance format.
 * Optimized for quick scanning during daily operations.
 */

import React from 'react';
import { DashboardMetrics } from '../types';

interface MetricsOverviewProps {
  metrics: DashboardMetrics;
  compact?: boolean;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ metrics, compact = false }) => {
  const metricCards = [
    { label: 'Active Lots', value: metrics.activeLots, total: metrics.totalLots, color: 'blue' },
    { label: 'Occupied Cages', value: metrics.occupiedCages, total: metrics.totalCages, color: 'green' },
    { label: 'Available Cages', value: metrics.availableCages, color: 'gray' },
    { label: 'Overcapacity', value: metrics.overcapacityCages, color: metrics.overcapacityCages > 0 ? 'red' : 'green' },
    { label: 'Breeding Groups', value: metrics.activeBreedingGroups, color: 'purple' },
    { label: 'Pending Weanings', value: metrics.pendingWeanings, color: metrics.pendingWeanings > 0 ? 'orange' : 'gray' },
    { label: 'Total Animals', value: metrics.totalAnimals, color: 'blue' },
    { label: 'Mortality (7d)', value: metrics.mortalityLast7Days, color: metrics.mortalityLast7Days > 10 ? 'red' : 'gray' },
    { label: 'Births (7d)', value: metrics.birthsLast7Days, color: 'green' },
  ];

  if (compact) {
    return (
      <div className="metrics-compact" style={styles.compactContainer}>
        {metricCards.slice(0, 5).map((card) => (
          <div key={card.label} style={styles.compactCard}>
            <div style={styles.compactValue}>{card.value}</div>
            <div style={styles.compactLabel}>{card.label}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="metrics-overview" style={styles.container}>
      <h2 style={styles.title}>Operational Overview</h2>
      <div style={styles.grid}>
        {metricCards.map((card) => (
          <div
            key={card.label}
            style={{
              ...styles.card,
              borderLeft: `4px solid var(--color-${card.color}, ${card.color === 'red' ? '#ef4444' : card.color === 'green' ? '#22c55e' : card.color === 'blue' ? '#3b82f6' : card.color === 'purple' ? '#a855f7' : card.color === 'orange' ? '#f97316' : '#6b7280'})`,
            }}
          >
            <div style={styles.cardValue}>{card.value}</div>
            <div style={styles.cardLabel}>{card.label}</div>
            {card.total !== undefined && (
              <div style={styles.cardTotal}>of {card.total}</div>
            )}
          </div>
        ))}
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#111827',
  },
  cardLabel: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '4px',
  },
  cardTotal: {
    fontSize: '11px',
    color: '#9ca3af',
    marginTop: '2px',
  },
  compactContainer: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  compactCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    padding: '12px 16px',
    minWidth: '100px',
  },
  compactValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#111827',
  },
  compactLabel: {
    fontSize: '11px',
    color: '#6b7280',
    marginTop: '2px',
  },
};
