/**
 * Commerce Module Registration (Placeholder)
 * Placeholder for pet commerce store workspace features
 */

import { registerModule } from '@/core/workspace/module-registry';
import type { ModuleMetadata } from '@/shared/types/workspace';

export const commerceModuleMetadata: ModuleMetadata = {
  id: 'commerce',
  name: 'Pet Commerce',
  description: 'Pet commerce store workspace for managing products, orders, and customers',
  version: '1.0.0',
  supportedPurposes: ['commerce'],
  dependencies: [],
  navigationItems: [
    {
      id: 'commerce_dashboard',
      label: 'Dashboard',
      icon: 'layout-dashboard',
      path: '/commerce/dashboard',
      moduleId: 'commerce_products',
      order: 1,
    },
    {
      id: 'commerce_products',
      label: 'Productos',
      icon: 'package',
      path: '/commerce/products',
      moduleId: 'commerce_products',
      order: 2,
    },
    {
      id: 'commerce_orders',
      label: 'Órdenes',
      icon: 'shopping-bag',
      path: '/commerce/orders',
      moduleId: 'commerce_orders',
      order: 3,
    },
    {
      id: 'commerce_customers',
      label: 'Clientes',
      icon: 'users',
      path: '/commerce/customers',
      moduleId: 'commerce_customers',
      order: 4,
    },
  ],
  dashboardWidgets: [
    {
      id: 'commerce_sales_overview',
      title: 'Resumen de Ventas',
      moduleId: 'commerce_orders',
      component: 'SalesOverviewWidget',
      size: 'medium',
      order: 1,
    },
    {
      id: 'commerce_top_products',
      title: 'Productos Más Vendidos',
      moduleId: 'commerce_products',
      component: 'TopProductsWidget',
      size: 'medium',
      order: 2,
    },
    {
      id: 'commerce_recent_orders',
      title: 'Órdenes Recientes',
      moduleId: 'commerce_orders',
      component: 'RecentOrdersWidget',
      size: 'large',
      order: 3,
    },
  ],
  routes: [
    {
      path: '/commerce/dashboard',
      moduleId: 'commerce_products',
      component: 'CommerceDashboard',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/commerce/products',
      moduleId: 'commerce_products',
      component: 'Products',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/commerce/orders',
      moduleId: 'commerce_orders',
      component: 'Orders',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/commerce/customers',
      moduleId: 'commerce_customers',
      component: 'Customers',
      exact: true,
      requiresAuth: true,
    },
  ],
  capabilities: {
    canManageInventory: true,
    canTrackMortality: false,
    canManageBreeding: false,
    canHandleOrders: true,
    canManageCustomers: true,
    canGenerateReports: true,
    canManageAlerts: true,
    canTrackExpenses: true,
  },
  defaultEnabledForPurposes: ['commerce'],
};

export function registerCommerceModule(): void {
  registerModule(commerceModuleMetadata);
}

registerCommerceModule();

export default commerceModuleMetadata;
