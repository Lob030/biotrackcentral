/**
 * Workspace Capabilities Registry
 * Defines default capabilities and module configurations per workspace purpose
 */

import type {
  WorkspacePurpose,
  WorkspaceSubtype,
  EnabledModule,
  CapabilityFlags,
} from '@/shared/types/workspace';

/**
 * Default capability flags per workspace purpose
 */
const DEFAULT_CAPABILITIES_BY_PURPOSE: Record<WorkspacePurpose, CapabilityFlags> = {
  bioterio: {
    canManageInventory: true,
    canTrackMortality: true,
    canManageBreeding: true,
    canHandleOrders: true,
    canManageCustomers: true,
    canGenerateReports: true,
    canManageAlerts: true,
    canTrackExpenses: true,
    canUseAIPredictions: false,
    canUseAIRecommendations: false,
    canUseAIAutomations: false,
    canIntegrateExternalAPIs: false,
    canExportData: true,
    canImportData: true,
  },
  pet: {
    canManageInventory: false,
    canTrackMortality: false,
    canManageBreeding: false,
    canHandleOrders: false,
    canManageCustomers: false,
    canGenerateReports: false,
    canManageAlerts: true,
    canTrackExpenses: false,
    canUseAIPredictions: false,
    canUseAIRecommendations: false,
    canUseAIAutomations: false,
    canIntegrateExternalAPIs: false,
    canExportData: true,
    canImportData: false,
  },
  vet: {
    canManageInventory: true,
    canTrackMortality: false,
    canManageBreeding: false,
    canHandleOrders: false,
    canManageCustomers: true,
    canGenerateReports: true,
    canManageAlerts: true,
    canTrackExpenses: true,
    canUseAIPredictions: false,
    canUseAIRecommendations: false,
    canUseAIAutomations: false,
    canIntegrateExternalAPIs: false,
    canExportData: true,
    canImportData: true,
  },
  livestock: {
    canManageInventory: true,
    canTrackMortality: true,
    canManageBreeding: true,
    canHandleOrders: true,
    canManageCustomers: true,
    canGenerateReports: true,
    canManageAlerts: true,
    canTrackExpenses: true,
    canUseAIPredictions: false,
    canUseAIRecommendations: false,
    canUseAIAutomations: false,
    canIntegrateExternalAPIs: false,
    canExportData: true,
    canImportData: true,
  },
  commerce: {
    canManageInventory: true,
    canTrackMortality: false,
    canManageBreeding: false,
    canHandleOrders: true,
    canManageCustomers: true,
    canGenerateReports: true,
    canManageAlerts: true,
    canTrackExpenses: true,
    canUseAIPredictions: false,
    canUseAIRecommendations: false,
    canUseAIAutomations: false,
    canIntegrateExternalAPIs: false,
    canExportData: true,
    canImportData: true,
  },
  uma: {
    canManageInventory: true,
    canTrackMortality: true,
    canManageBreeding: true,
    canHandleOrders: false,
    canManageCustomers: false,
    canGenerateReports: true,
    canManageAlerts: true,
    canTrackExpenses: true,
    canUseAIPredictions: false,
    canUseAIRecommendations: false,
    canUseAIAutomations: false,
    canIntegrateExternalAPIs: false,
    canExportData: true,
    canImportData: true,
  },
  pimvs: {
    canManageInventory: true,
    canTrackMortality: true,
    canManageBreeding: true,
    canHandleOrders: false,
    canManageCustomers: false,
    canGenerateReports: true,
    canManageAlerts: true,
    canTrackExpenses: true,
    canUseAIPredictions: false,
    canUseAIRecommendations: false,
    canUseAIAutomations: false,
    canIntegrateExternalAPIs: false,
    canExportData: true,
    canImportData: true,
  },
};

/**
 * Default enabled modules per workspace purpose
 */
const DEFAULT_MODULES_BY_PURPOSE: Record<WorkspacePurpose, EnabledModule[]> = {
  bioterio: [
    'bioterio_lotes',
    'bioterio_cajas',
    'bioterio_mortalidad',
    'bioterio_reproduccion',
    'bioterio_clientes',
    'bioterio_pedidos',
    'bioterio_ventas',
    'bioterio_alertas',
    'bioterio_gastos',
    'bioterio_dashboard',
  ],
  pet: [
    'pet_profiles',
    'pet_health_records',
    'pet_reminders',
  ],
  vet: [
    'vet_appointments',
    'vet_patients',
    'vet_treatments',
    'vet_inventory',
  ],
  livestock: [
    'livestock_herds',
    'livestock_tracking',
    'livestock_production',
  ],
  commerce: [
    'commerce_products',
    'commerce_orders',
    'commerce_customers',
  ],
  uma: [
    'uma_specimens',
    'uma_permits',
    'uma_reports',
  ],
  pimvs: [
    'uma_specimens',
    'uma_permits',
    'uma_reports',
  ],
};

/**
 * Get default capabilities for a workspace purpose
 */
export function getDefaultCapabilities(purpose: WorkspacePurpose): CapabilityFlags {
  return DEFAULT_CAPABILITIES_BY_PURPOSE[purpose] || DEFAULT_CAPABILITIES_BY_PURPOSE.bioterio;
}

/**
 * Get default enabled modules for a workspace purpose
 */
export function getDefaultModules(purpose: WorkspacePurpose): EnabledModule[] {
  return DEFAULT_MODULES_BY_PURPOSE[purpose] || [];
}

/**
 * Override capabilities for a specific purpose (for customization)
 */
export function overrideCapabilities(
  purpose: WorkspacePurpose,
  overrides: Partial<CapabilityFlags>
): CapabilityFlags {
  const base = getDefaultCapabilities(purpose);
  return { ...base, ...overrides };
}

/**
 * Check if a module is available for a given purpose
 */
export function isModuleAvailableForPurpose(
  moduleId: EnabledModule,
  purpose: WorkspacePurpose
): boolean {
  const modules = DEFAULT_MODULES_BY_PURPOSE[purpose];
  return modules.includes(moduleId);
}

/**
 * Get all purposes that support a specific module
 */
export function getPurposesForModule(moduleId: EnabledModule): WorkspacePurpose[] {
  return (Object.keys(DEFAULT_MODULES_BY_PURPOSE) as WorkspacePurpose[]).filter((purpose) =>
    DEFAULT_MODULES_BY_PURPOSE[purpose].includes(moduleId)
  );
}
