/**
 * Livestock Module Registration (Placeholder)
 * Placeholder for livestock farm workspace features
 */

import { registerModule } from '@/core/workspace/module-registry';
import type { ModuleMetadata } from '@/shared/types/workspace';

export const livestockModuleMetadata: ModuleMetadata = {
  id: 'livestock',
  name: 'Livestock Management',
  description: 'Livestock farm workspace for managing herds, tracking, and production',
  version: '1.0.0',
  supportedPurposes: ['livestock'],
  dependencies: [],
  navigationItems: [
    {
      id: 'livestock_dashboard',
      label: 'Dashboard',
      icon: 'layout-dashboard',
      path: '/livestock/dashboard',
      moduleId: 'livestock_herds',
      order: 1,
    },
    {
      id: 'livestock_herds',
      label: 'Rebaños',
      icon: 'layers',
      path: '/livestock/herds',
      moduleId: 'livestock_herds',
      order: 2,
    },
    {
      id: 'livestock_tracking',
      label: 'Seguimiento',
      icon: 'map',
      path: '/livestock/tracking',
      moduleId: 'livestock_tracking',
      order: 3,
    },
    {
      id: 'livestock_production',
      label: 'Producción',
      icon: 'trending-up',
      path: '/livestock/production',
      moduleId: 'livestock_production',
      order: 4,
    },
  ],
  dashboardWidgets: [
    {
      id: 'livestock_herd_overview',
      title: 'Resumen de Rebaños',
      moduleId: 'livestock_herds',
      component: 'HerdOverviewWidget',
      size: 'large',
      order: 1,
    },
    {
      id: 'livestock_production_metrics',
      title: 'Métricas de Producción',
      moduleId: 'livestock_production',
      component: 'ProductionMetricsWidget',
      size: 'medium',
      order: 2,
    },
    {
      id: 'livestock_health_alerts',
      title: 'Alertas de Salud',
      moduleId: 'livestock_tracking',
      component: 'HealthAlertsWidget',
      size: 'small',
      order: 3,
    },
  ],
  routes: [
    {
      path: '/livestock/dashboard',
      moduleId: 'livestock_herds',
      component: 'LivestockDashboard',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/livestock/herds',
      moduleId: 'livestock_herds',
      component: 'Herds',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/livestock/tracking',
      moduleId: 'livestock_tracking',
      component: 'Tracking',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/livestock/production',
      moduleId: 'livestock_production',
      component: 'Production',
      exact: true,
      requiresAuth: true,
    },
  ],
  capabilities: {
    canManageInventory: true,
    canTrackMortality: true,
    canManageBreeding: true,
    canHandleOrders: true,
    canManageCustomers: true,
    canGenerateReports: true,
    canManageAlerts: true,
    canTrackExpenses: true,
  },
  defaultEnabledForPurposes: ['livestock'],
};

export function registerLivestockModule(): void {
  registerModule(livestockModuleMetadata);
}

registerLivestockModule();

export default livestockModuleMetadata;
