/**
 * Pet Module Registration (Placeholder)
 * Placeholder for pet owner workspace features
 */

import { registerModule } from '@/core/workspace/module-registry';
import type { ModuleMetadata } from '@/shared/types/workspace';

export const petModuleMetadata: ModuleMetadata = {
  id: 'pet',
  name: 'Pet Management',
  description: 'Pet owner workspace for managing pet profiles, health records, and reminders',
  version: '1.0.0',
  supportedPurposes: ['pet'],
  dependencies: [],
  navigationItems: [
    {
      id: 'pet_dashboard',
      label: 'Dashboard',
      icon: 'layout-dashboard',
      path: '/pet/dashboard',
      moduleId: 'pet_profiles',
      order: 1,
    },
    {
      id: 'pet_profiles',
      label: 'Mis Mascotas',
      icon: 'heart',
      path: '/pet/profiles',
      moduleId: 'pet_profiles',
      order: 2,
    },
    {
      id: 'pet_health_records',
      label: 'Historial Médico',
      icon: 'file-text',
      path: '/pet/health',
      moduleId: 'pet_health_records',
      order: 3,
    },
    {
      id: 'pet_reminders',
      label: 'Recordatorios',
      icon: 'bell',
      path: '/pet/reminders',
      moduleId: 'pet_reminders',
      order: 4,
    },
  ],
  dashboardWidgets: [
    {
      id: 'pet_upcoming_reminders',
      title: 'Próximos Recordatorios',
      moduleId: 'pet_reminders',
      component: 'UpcomingRemindersWidget',
      size: 'medium',
      order: 1,
    },
    {
      id: 'pet_recent_activities',
      title: 'Actividades Recientes',
      moduleId: 'pet_profiles',
      component: 'RecentActivitiesWidget',
      size: 'medium',
      order: 2,
    },
  ],
  routes: [
    {
      path: '/pet/dashboard',
      moduleId: 'pet_profiles',
      component: 'PetDashboard',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/pet/profiles',
      moduleId: 'pet_profiles',
      component: 'PetProfiles',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/pet/health',
      moduleId: 'pet_health_records',
      component: 'HealthRecords',
      exact: true,
      requiresAuth: true,
    },
    {
      path: '/pet/reminders',
      moduleId: 'pet_reminders',
      component: 'Reminders',
      exact: true,
      requiresAuth: true,
    },
  ],
  capabilities: {
    canManageInventory: false,
    canTrackMortality: false,
    canManageBreeding: false,
    canHandleOrders: false,
    canManageCustomers: false,
    canGenerateReports: false,
    canManageAlerts: true,
    canTrackExpenses: false,
  },
  defaultEnabledForPurposes: ['pet'],
};

export function registerPetModule(): void {
  registerModule(petModuleMetadata);
}

registerPetModule();

export default petModuleMetadata;
