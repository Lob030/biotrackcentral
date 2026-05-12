/**
 * Workspace Core Exports
 * Central export point for all workspace system functionality
 */

// Types
export type {
  WorkspacePurpose,
  WorkspaceSubtype,
  EnabledModule,
  NavigationItem,
  DashboardWidget,
  ModuleRoute,
  CapabilityFlags,
  ModuleMetadata,
  WorkspaceCapabilities,
  WorkspaceContext,
} from '@/shared/types/workspace';

// Module Registry
export {
  registerModule,
  getModule,
  getAllModules,
  getModulesForPurpose,
  hasModule,
  clearModuleRegistry,
  getModuleDependencies,
} from './module-registry';

// Capability Registry
export {
  getDefaultCapabilities,
  getDefaultModules,
  overrideCapabilities,
  isModuleAvailableForPurpose,
  getPurposesForModule,
} from './capability-registry';

// Workspace Runtime
export {
  resolveWorkspaceCapabilities,
  isModuleEnabled,
  getWorkspaceNavigation,
  getWorkspaceDashboardWidgets,
  getWorkspaceRoutes,
  hasCapability,
} from './workspace-runtime';
