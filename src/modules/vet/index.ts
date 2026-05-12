/**
 * Vet Module Registration (Placeholder)
 * Placeholder for veterinarian workspace features
 */

import { registerModule } from '@/core/workspace/module-registry';
import type { ModuleMetadata } from '@/shared/types/workspace';

export const vetModuleMetadata: ModuleMetadata = {
  id: 'vet',
  name: 'Veterinary Management',
  description: 'Veterinarian workspace for managing appointments, patients, treatments, and inventory',
  version: '1.0.0',
  supportedPurposes: ['vet'],
  dependencies: [],
  navigationItems: [
    {
      id: 'vet_dashboard',
      label: 'Dashboard',
      icon: 'layout-dashboard',
      path: '/vet/dashboard',
      moduleId: 'vet_appointments',
      order: 1,
    },
    {
      id: 'vet_appointments',
      label: 'Citas',
      icon: 'calendar',
      path: '/vet/appointments',
      moduleId: 'vet_appointments',
      order: 2,
    },
    {
      id: 'vet_patients',
      label: 'Pacientes',
      icon: 'activity',
      path: '/vet/patients',
      moduleId: 'vet_patients',
      order: 3,
    },
    {
      id: 'vet_treatments',
      label: 'Tratamientos',
      icon: 'clipboard',
      path: '/vet/treatments',
      moduleId: 'vet_treatments',
      order: 4,
    },
    {
      id: 'vet_inventory',
      label: 'Inventario',
      icon: 'package',
      path: '/vet/inventory',
      moduleId: 'vet_inventory',
      order: 5,
    },
  ],
  dashboardWidgets: [
    {
      id: 'vet_today_appointments',
      title: 'Citas de Hoy',
      moduleId: 'vet_appointments',
      component: 'TodayAppointmentsWidget',
      size: 'medium',
      order: 1,
    },
    {
      id: 'vet_pending_treatments',
      title: 'Tratamientos Pendientes',
      moduleId: 'vet_treatments',
      component: 'PendingTreatmentsWidget',
      size: 'medium',
      order: 2,
    },
    {
      id: 'vet_low_stock_alerts',
      title: 'Stock Bajo',
      moduleId: 'vet_inventory',
      component: 'LowStockAlertsWidget',
      size: 'small',
      order: 3,
    },
  ],
  routes: [
    {
      path: '/vet/dashboard',
      moduleId: 'vet_appointments',
      component: 'VetDashboard',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/vet/appointments',
      moduleId: 'vet_appointments',
      component: 'Appointments',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/vet/patients',
      moduleId: 'vet_patients',
      component: 'Patients',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/vet/treatments',
      moduleId: 'vet_treatments',
      component: 'Treatments',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/vet/inventory',
      moduleId: 'vet_inventory',
      component: 'Inventory',
      exact: true,
      requiresAuth: true,
    },
  ],
  capabilities: {
    canManageInventory: true,
    canTrackMortality: false,
    canManageBreeding: false,
    canHandleOrders: false,
    canManageCustomers: true,
    canGenerateReports: true,
    canManageAlerts: true,
    canTrackExpenses: true,
  },
  defaultEnabledForPurposes: ['vet'],
};

export function registerVetModule(): void {
  registerModule(vetModuleMetadata);
}

registerVetModule();

export default vetModuleMetadata;
