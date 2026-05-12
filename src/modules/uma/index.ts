/**
 * UMA Module Registration (Placeholder)
 * Placeholder for UMA (Unidades de Manejo para la Conservación de Vida Silvestre) workspace features
 */

import { registerModule } from '@/core/workspace/module-registry';
import type { ModuleMetadata } from '@/shared/types/workspace';

export const umaModuleMetadata: ModuleMetadata = {
  id: 'uma',
  name: 'UMA Management',
  description: 'UMA workspace for managing specimens, permits, and regulatory reports',
  version: '1.0.0',
  supportedPurposes: ['uma'],
  dependencies: [],
  navigationItems: [
    {
      id: 'uma_dashboard',
      label: 'Dashboard',
      icon: 'layout-dashboard',
      path: '/uma/dashboard',
      moduleId: 'uma_specimens',
      order: 1,
    },
    {
      id: 'uma_specimens',
      label: 'Ejemplares',
      icon: 'leaf',
      path: '/uma/specimens',
      moduleId: 'uma_specimens',
      order: 2,
    },
    {
      id: 'uma_permits',
      label: 'Permisos',
      icon: 'file-check',
      path: '/uma/permits',
      moduleId: 'uma_permits',
      order: 3,
    },
    {
      id: 'uma_reports',
      label: 'Reportes',
      icon: 'file-text',
      path: '/uma/reports',
      moduleId: 'uma_reports',
      order: 4,
    },
  ],
  dashboardWidgets: [
    {
      id: 'uma_specimen_overview',
      title: 'Resumen de Ejemplares',
      moduleId: 'uma_specimens',
      component: 'SpecimenOverviewWidget',
      size: 'medium',
      order: 1,
    },
    {
      id: 'uma_permit_status',
      title: 'Estado de Permisos',
      moduleId: 'uma_permits',
      component: 'PermitStatusWidget',
      size: 'medium',
      order: 2,
    },
    {
      id: 'uma_pending_reports',
      title: 'Reportes Pendientes',
      moduleId: 'uma_reports',
      component: 'PendingReportsWidget',
      size: 'small',
      order: 3,
    },
  ],
  routes: [
    {
      path: '/uma/dashboard',
      moduleId: 'uma_specimens',
      component: 'UmaDashboard',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/uma/specimens',
      moduleId: 'uma_specimens',
      component: 'Specimens',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/uma/permits',
      moduleId: 'uma_permits',
      component: 'Permits',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/uma/reports',
      moduleId: 'uma_reports',
      component: 'Reports',
      exact: true,
      requiresAuth: true,
    },
  ],
  capabilities: {
    canManageInventory: true,
    canTrackMortality: true,
    canManageBreeding: true,
    canHandleOrders: false,
    canManageCustomers: false,
    canGenerateReports: true,
    canManageAlerts: true,
    canTrackExpenses: true,
  },
  defaultEnabledForPurposes: ['uma'],
};

export function registerUmaModule(): void {
  registerModule(umaModuleMetadata);
}

registerUmaModule();

export default umaModuleMetadata;
