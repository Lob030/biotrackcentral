/**
 * Workspace Runtime
 * Resolves workspace configuration based on active workspace context
 */

import type {
  WorkspaceContext,
  WorkspaceCapabilities,
  WorkspacePurpose,
  WorkspaceSubtype,
  EnabledModule,
  NavigationItem,
  DashboardWidget,
  ModuleRoute,
  CapabilityFlags,
} from '@/shared/types/workspace';
import { getAllModules, getModule } from './module-registry';
import { getDefaultCapabilities, getDefaultModules } from './capability-registry';

/**
 * Resolve enabled modules for a workspace
 * Combines default modules with registered module metadata
 */
function resolveEnabledModules(
  purpose: WorkspacePurpose,
  customModules?: EnabledModule[]
): EnabledModule[] {
  const defaultModules = getDefaultModules(purpose);
  
  if (customModules && customModules.length > 0) {
    // Merge custom modules with defaults, avoiding duplicates
    const merged = new Set<EnabledModule>([...defaultModules]);
    customModules.forEach((mod) => merged.add(mod));
    return Array.from(merged);
  }
  
  return defaultModules;
}

/**
 * Aggregate navigation items from all enabled modules
 */
function aggregateNavigation(enabledModules: EnabledModule[]): NavigationItem[] {
  const allModules = getAllModules();
  const navigationItems: NavigationItem[] = [];
  
  for (const module of allModules) {
    if (enabledModules.some((id) => id.startsWith(module.id.replace('bioterio_', 'bioterio_')))) {
      // Check if this module's features are enabled
      for (const item of module.navigationItems) {
        if (enabledModules.includes(item.moduleId)) {
          navigationItems.push(item);
        }
      }
    }
  }
  
  // Sort by order property
  return navigationItems.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

/**
 * Aggregate dashboard widgets from all enabled modules
 */
function aggregateDashboardWidgets(enabledModules: EnabledModule[]): DashboardWidget[] {
  const allModules = getAllModules();
  const widgets: DashboardWidget[] = [];
  
  for (const module of allModules) {
    for (const widget of module.dashboardWidgets) {
      if (enabledModules.includes(widget.moduleId)) {
        widgets.push(widget);
      }
    }
  }
  
  // Sort by order property
  return widgets.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

/**
 * Aggregate routes from all enabled modules
 */
function aggregateRoutes(enabledModules: EnabledModule[]): ModuleRoute[] {
  const allModules = getAllModules();
  const routes: ModuleRoute[] = [];
  
  for (const module of allModules) {
    for (const route of module.routes) {
      if (enabledModules.includes(route.moduleId)) {
        routes.push(route);
      }
    }
  }
  
  return routes;
}

/**
 * Combine capability flags from all enabled modules
 */
function combineCapabilities(
  baseCapabilities: CapabilityFlags,
  enabledModules: EnabledModule[]
): CapabilityFlags {
  const allModules = getAllModules();
  const combined = { ...baseCapabilities };
  
  for (const module of allModules) {
    for (const moduleId of enabledModules) {
      // Check if this module provides capabilities for the requested module
      if (moduleId.startsWith(module.id.split('_')[0])) {
        Object.assign(combined, module.capabilities);
      }
    }
  }
  
  return combined;
}

/**
 * Main workspace runtime resolver
 * Takes workspace context and returns complete capabilities configuration
 */
export function resolveWorkspaceCapabilities(
  workspace: WorkspaceContext,
  customModules?: EnabledModule[]
): WorkspaceCapabilities {
  const { purpose, subtype } = workspace;
  
  // Resolve enabled modules
  const enabledModules = resolveEnabledModules(purpose, customModules);
  
  // Get base capabilities from registry
  const baseCapabilities = getDefaultCapabilities(purpose);
  
  // Aggregate all components from enabled modules
  const navigation = aggregateNavigation(enabledModules);
  const dashboardWidgets = aggregateDashboardWidgets(enabledModules);
  const routes = aggregateRoutes(enabledModules);
  
  // Combine capabilities
  const capabilities = combineCapabilities(baseCapabilities, enabledModules);
  
  // Determine available AI tools based on capabilities
  const aiTools: string[] = [];
  if (capabilities.canUseAIPredictions) {
    aiTools.push('predictions');
  }
  if (capabilities.canUseAIRecommendations) {
    aiTools.push('recommendations');
  }
  if (capabilities.canUseAIAutomations) {
    aiTools.push('automations');
  }
  
  return {
    purpose,
    subtype,
    enabledModules,
    navigation,
    dashboardWidgets,
    routes,
    capabilities,
    aiTools: aiTools.length > 0 ? aiTools : undefined,
  };
}

/**
 * Check if a specific module is enabled for a workspace
 */
export function isModuleEnabled(workspace: WorkspaceContext, moduleId: EnabledModule): boolean {
  const capabilities = resolveWorkspaceCapabilities(workspace);
  return capabilities.enabledModules.includes(moduleId);
}

/**
 * Get navigation items for a workspace
 */
export function getWorkspaceNavigation(workspace: WorkspaceContext): NavigationItem[] {
  const capabilities = resolveWorkspaceCapabilities(workspace);
  return capabilities.navigation;
}

/**
 * Get dashboard widgets for a workspace
 */
export function getWorkspaceDashboardWidgets(workspace: WorkspaceContext): DashboardWidget[] {
  const capabilities = resolveWorkspaceCapabilities(workspace);
  return capabilities.dashboardWidgets;
}

/**
 * Get routes for a workspace
 */
export function getWorkspaceRoutes(workspace: WorkspaceContext): ModuleRoute[] {
  const capabilities = resolveWorkspaceCapabilities(workspace);
  return capabilities.routes;
}

/**
 * Check if a workspace has a specific capability
 */
export function hasCapability(
  workspace: WorkspaceContext,
  capability: keyof CapabilityFlags
): boolean {
  const capabilities = resolveWorkspaceCapabilities(workspace);
  return capabilities.capabilities[capability] || false;
}
