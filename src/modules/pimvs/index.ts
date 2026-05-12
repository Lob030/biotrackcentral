/**
 * PIMVS Module Registration (Placeholder)
 * Placeholder for PIMVS (Predios e Instalaciones para el Manejo de Vida Silvestre) workspace features
 */

import { registerModule } from '@/core/workspace/module-registry';
import type { ModuleMetadata } from '@/shared/types/workspace';

export const pimvsModuleMetadata: ModuleMetadata = {
  id: 'pimvs',
  name: 'PIMVS Management',
  description: 'PIMVS workspace for managing specimens, permits, and regulatory reports',
  version: '1.0.0',
  supportedPurposes: ['pimvs'],
  dependencies: [],
  navigationItems: [
    {
      id: 'pimvs_dashboard',
      label: 'Dashboard',
      icon: 'layout-dashboard',
      path: '/pimvs/dashboard',
      moduleId: 'uma_specimens',
      order: 1,
    },
    {
      id: 'pimvs_specimens',
      label: 'Ejemplares',
      icon: 'leaf',
      path: '/pimvs/specimens',
      moduleId: 'uma_specimens',
      order: 2,
    },
    {
      id: 'pimvs_permits',
      label: 'Permisos',
      icon: 'file-check',
      path: '/pimvs/permits',
      moduleId: 'uma_permits',
      order: 3,
    },
    {
      id: 'pimvs_reports',
      label: 'Reportes',
      icon: 'file-text',
      path: '/pimvs/reports',
      moduleId: 'uma_reports',
      order: 4,
    },
  ],
  dashboardWidgets: [
    {
      id: 'pimvs_specimen_overview',
      title: 'Resumen de Ejemplares',
      moduleId: 'uma_specimens',
      component: 'SpecimenOverviewWidget',
      size: 'medium',
      order: 1,
    },
    {
      id: 'pimvs_permit_status',
      title: 'Estado de Permisos',
      moduleId: 'uma_permits',
      component: 'PermitStatusWidget',
      size: 'medium',
      order: 2,
    },
    {
      id: 'pimvs_pending_reports',
      title: 'Reportes Pendientes',
      moduleId: 'uma_reports',
      component: 'PendingReportsWidget',
      size: 'small',
      order: 3,
    },
  ],
  routes: [
    {
      path: '/pimvs/dashboard',
      moduleId: 'uma_specimens',
      component: 'PimvsDashboard',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/pimvs/specimens',
      moduleId: 'uma_specimens',
      component: 'Specimens',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/pimvs/permits',
      moduleId: 'uma_permits',
      component: 'Permits',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/pimvs/reports',
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
  defaultEnabledForPurposes: ['pimvs'],
};

export function registerPimvsModule(): void {
  registerModule(pimvsModuleMetadata);
}

registerPimvsModule();

export default pimvsModuleMetadata;
