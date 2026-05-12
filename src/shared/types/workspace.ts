/**
 * Workspace Purpose Types
 * Defines the operational context of a workspace
 */
export type WorkspacePurpose =
  | 'bioterio'      // Rodent bioterio management
  | 'pet'           // Pet owners
  | 'vet'           // Veterinarians
  | 'livestock'     // Livestock farms
  | 'commerce'      // Pet commerce stores
  | 'uma'           // UMA (Unidades de Manejo para la Conservación de Vida Silvestre)
  | 'pimvs';        // PIMVS (Predios e Instalaciones para el Manejo de Vida Silvestre)

/**
 * Workspace Subtype
 * More granular classification within a purpose
 */
export type WorkspaceSubtype =
  // Bioterio subtypes
  | 'bioterio_produccion'
  | 'bioterio_experimentacion'
  | 'bioterio_mantenimiento'
  // Pet subtypes
  | 'pet_owner_single'
  | 'pet_owner_multi'
  // Vet subtypes
  | 'vet_clinic_small'
  | 'vet_clinic_large'
  | 'vet_mobile'
  | 'vet_hospital'
  // Livestock subtypes
  | 'livestock_cattle'
  | 'livestock_poultry'
  | 'livestock_pigs'
  | 'livestock_dairy'
  // Commerce subtypes
  | 'commerce_pet_store'
  | 'commerce_online'
  | 'commerce_grooming'
  // UMA/PIMVS subtypes
  | 'uma_conservation'
  | 'uma_production'
  | 'uma_education'
  | 'pimvs_temporal'
  | 'pimvs_permanent'
  | 'general';       // Generic fallback

/**
 * Enabled Module ID
 * Each module has a unique identifier
 */
export type EnabledModule =
  | 'bioterio_lotes'
  | 'bioterio_cajas'
  | 'bioterio_mortalidad'
  | 'bioterio_reproduccion'
  | 'bioterio_clientes'
  | 'bioterio_pedidos'
  | 'bioterio_ventas'
  | 'bioterio_alertas'
  | 'bioterio_gastos'
  | 'bioterio_dashboard'
  | 'pet_profiles'
  | 'pet_health_records'
  | 'pet_reminders'
  | 'vet_appointments'
  | 'vet_patients'
  | 'vet_treatments'
  | 'vet_inventory'
  | 'livestock_herds'
  | 'livestock_tracking'
  | 'livestock_production'
  | 'commerce_products'
  | 'commerce_orders'
  | 'commerce_customers'
  | 'uma_specimens'
  | 'uma_permits'
  | 'uma_reports'
  | string;         // Allow extensibility for future modules

/**
 * Navigation Item Definition
 */
export interface NavigationItem {
  id: string;
  label: string;
  icon?: string;
  path: string;
  moduleId: EnabledModule;
  order?: number;
  requiresPermission?: string;
  hideFromSidebar?: boolean;
}

/**
 * Dashboard Widget Definition
 */
export interface DashboardWidget {
  id: string;
  title: string;
  moduleId: EnabledModule;
  component: string; // Component name to dynamically import
  size: 'small' | 'medium' | 'large' | 'full';
  order?: number;
  requiresData?: string[];
}

/**
 * Route Definition
 */
export interface ModuleRoute {
  path: string;
  moduleId: EnabledModule;
  component: string; // Component name to dynamically import
  exact?: boolean;
  requiresAuth?: boolean;
  requiresPermission?: string;
}

/**
 * Capability Flags
 * Features that may be enabled/disabled per workspace
 */
export interface CapabilityFlags {
  // Core capabilities
  canManageInventory: boolean;
  canTrackMortality: boolean;
  canManageBreeding: boolean;
  canHandleOrders: boolean;
  canManageCustomers: boolean;
  canGenerateReports: boolean;
  canManageAlerts: boolean;
  canTrackExpenses: boolean;
  
  // AI capabilities (future)
  canUseAIPredictions: boolean;
  canUseAIRecommendations: boolean;
  canUseAIAutomations: boolean;
  
  // Integration capabilities
  canIntegrateExternalAPIs: boolean;
  canExportData: boolean;
  canImportData: boolean;
}

/**
 * Module Metadata
 * Exported by each module's index.ts
 */
export interface ModuleMetadata {
  id: string;
  name: string;
  description?: string;
  version: string;
  
  // Which workspace purposes support this module
  supportedPurposes: WorkspacePurpose[];
  
  // Modules this module depends on
  dependencies?: string[];
  
  // Navigation items this module provides
  navigationItems: NavigationItem[];
  
  // Dashboard widgets this module provides
  dashboardWidgets: DashboardWidget[];
  
  // Routes this module provides
  routes: ModuleRoute[];
  
  // Capabilities this module enables
  capabilities: Partial<CapabilityFlags>;
  
  // Default enabled state per purpose
  defaultEnabledForPurposes: WorkspacePurpose[];
}

/**
 * Workspace Capabilities Configuration
 * Complete capability set for a workspace
 */
export interface WorkspaceCapabilities {
  purpose: WorkspacePurpose;
  subtype: WorkspaceSubtype;
  
  // Enabled modules
  enabledModules: EnabledModule[];
  
  // Aggregated navigation from all enabled modules
  navigation: NavigationItem[];
  
  // Aggregated dashboard widgets from all enabled modules
  dashboardWidgets: DashboardWidget[];
  
  // Aggregated routes from all enabled modules
  routes: ModuleRoute[];
  
  // Combined capability flags
  capabilities: CapabilityFlags;
  
  // Available AI tools (future)
  aiTools?: string[];
}

/**
 * Workspace Context
 * Runtime information about the active workspace
 */
export interface WorkspaceContext {
  id: string;
  name: string;
  purpose: WorkspacePurpose;
  subtype: WorkspaceSubtype;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}
