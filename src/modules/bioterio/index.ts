/**
 * Bioterio Module Registration
 * Registers all bioterio-specific features with the workspace system
 */

import { registerModule } from '@/core/workspace/module-registry';
import type { ModuleMetadata } from '@/shared/types/workspace';

/**
 * Bioterio Module Metadata
 * Defines all routes, navigation items, dashboard widgets, and capabilities
 * for the bioterio operational context
 */
export const bioterioModuleMetadata: ModuleMetadata = {
  id: 'bioterio',
  name: 'Bioterio Management',
  description: 'Complete rodent bioterio management system including lots, cages, breeding, mortality, and sales',
  version: '1.0.0',
  
  // Supported workspace purposes
  supportedPurposes: ['bioterio'],
  
  // No dependencies for now
  dependencies: [],
  
  // Navigation items provided by this module
  navigationItems: [
    {
      id: 'bioterio_dashboard',
      label: 'Dashboard',
      icon: 'layout-dashboard',
      path: '/bioterio/dashboard',
      moduleId: 'bioterio_dashboard',
      order: 1,
    },
    {
      id: 'bioterio_lotes',
      label: 'Lotes',
      icon: 'folder',
      path: '/bioterio/lotes',
      moduleId: 'bioterio_lotes',
      order: 2,
    },
    {
      id: 'bioterio_cajas',
      label: 'Cajas',
      icon: 'package',
      path: '/bioterio/cajas',
      moduleId: 'bioterio_cajas',
      order: 3,
    },
    {
      id: 'bioterio_clientes',
      label: 'Clientes',
      icon: 'users',
      path: '/bioterio/clientes',
      moduleId: 'bioterio_clientes',
      order: 4,
    },
    {
      id: 'bioterio_pedidos',
      label: 'Pedidos',
      icon: 'shopping-cart',
      path: '/bioterio/pedidos',
      moduleId: 'bioterio_pedidos',
      order: 5,
    },
    {
      id: 'bioterio_ventas',
      label: 'Ventas',
      icon: 'dollar-sign',
      path: '/bioterio/ventas',
      moduleId: 'bioterio_ventas',
      order: 6,
    },
    {
      id: 'bioterio_alertas',
      label: 'Alertas',
      icon: 'bell',
      path: '/bioterio/alertas',
      moduleId: 'bioterio_alertas',
      order: 7,
    },
    {
      id: 'bioterio_gastos',
      label: 'Gastos',
      icon: 'trending-down',
      path: '/bioterio/gastos',
      moduleId: 'bioterio_gastos',
      order: 8,
    },
  ],
  
  // Dashboard widgets provided by this module
  dashboardWidgets: [
    {
      id: 'bioterio_stock_summary',
      title: 'Resumen de Stock',
      moduleId: 'bioterio_dashboard',
      component: 'StockSummaryWidget',
      size: 'medium',
      order: 1,
    },
    {
      id: 'bioterio_recent_activity',
      title: 'Actividad Reciente',
      moduleId: 'bioterio_dashboard',
      component: 'RecentActivityWidget',
      size: 'medium',
      order: 2,
    },
    {
      id: 'bioterio_alerts_preview',
      title: 'Alertas',
      moduleId: 'bioterio_alertas',
      component: 'AlertsPreviewWidget',
      size: 'small',
      order: 3,
    },
    {
      id: 'bioterio_sales_chart',
      title: 'Ventas del Mes',
      moduleId: 'bioterio_ventas',
      component: 'SalesChartWidget',
      size: 'large',
      order: 4,
    },
  ],
  
  // Routes provided by this module
  routes: [
    {
      path: '/bioterio/dashboard',
      moduleId: 'bioterio_dashboard',
      component: 'Dashboard',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/bioterio/lotes',
      moduleId: 'bioterio_lotes',
      component: 'Lotes',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/bioterio/lotes/:id',
      moduleId: 'bioterio_lotes',
      component: 'LoteDetalle',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/bioterio/cajas',
      moduleId: 'bioterio_cajas',
      component: 'Cajas',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/bioterio/clientes',
      moduleId: 'bioterio_clientes',
      component: 'Clientes',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/bioterio/clientes/:id',
      moduleId: 'bioterio_clientes',
      component: 'ClientePerfil',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/bioterio/pedidos',
      moduleId: 'bioterio_pedidos',
      component: 'Pedidos',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/bioterio/ventas',
      moduleId: 'bioterio_ventas',
      component: 'Ventas',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/bioterio/alertas',
      moduleId: 'bioterio_alertas',
      component: 'Alertas',
      exact: true,
      requiresAuth: true,
    },
  ],
  
  // Capabilities enabled by this module
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
  
  // Default enabled for bioterio workspaces
  defaultEnabledForPurposes: ['bioterio'],
};

/**
 * Register the bioterio module
 * This should be called during application initialization
 */
export function registerBioterioModule(): void {
  registerModule(bioterioModuleMetadata);
}

// Auto-register when this file is imported
registerBioterioModule();

export default bioterioModuleMetadata;
