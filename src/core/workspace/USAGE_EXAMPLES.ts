/**
 * Workspace System Usage Examples
 * 
 * This file demonstrates how to use the Workspace Capability System
 * in different parts of the application.
 */

import type { WorkspaceContext, EnabledModule } from '@/core/workspace';
import {
  resolveWorkspaceCapabilities,
  getWorkspaceNavigation,
  getWorkspaceDashboardWidgets,
  hasCapability,
  isModuleEnabled,
} from '@/core/workspace';

// ============================================
// EXAMPLE 1: Getting workspace capabilities
// ============================================

/**
 * Example workspace context (would typically come from auth/database)
 */
const exampleWorkspace: WorkspaceContext = {
  id: 'ws-123',
  name: 'Bioterio Central',
  purpose: 'bioterio',
  subtype: 'bioterio_produccion',
  ownerId: 'user-456',
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
};

/**
 * Resolve complete capabilities for a workspace
 */
function initializeWorkspace(workspace: WorkspaceContext) {
  const capabilities = resolveWorkspaceCapabilities(workspace);
  
  console.log('Enabled modules:', capabilities.enabledModules);
  console.log('Navigation items:', capabilities.navigation.length);
  console.log('Dashboard widgets:', capabilities.dashboardWidgets.length);
  console.log('Available routes:', capabilities.routes.length);
  console.log('Can manage inventory:', capabilities.capabilities.canManageInventory);
  console.log('AI tools available:', capabilities.aiTools);
  
  return capabilities;
}

// ============================================
// EXAMPLE 2: Dynamic navigation rendering
// ============================================

/**
 * Get navigation items for sidebar rendering
 * Only returns navigation for enabled modules
 */
function renderSidebarNavigation(workspace: WorkspaceContext) {
  const navigation = getWorkspaceNavigation(workspace);
  
  // Sort by order and filter hidden items
  const visibleNav = navigation
    .filter((item) => !item.hideFromSidebar)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  
  return visibleNav.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    path: item.path,
  }));
}

// ============================================
// EXAMPLE 3: Dynamic dashboard rendering
// ============================================

/**
 * Get dashboard widgets for dynamic dashboard rendering
 * Widgets are automatically filtered based on enabled modules
 */
function renderDashboard(workspace: WorkspaceContext) {
  const widgets = getWorkspaceDashboardWidgets(workspace);
  
  // Group widgets by size for layout
  const fullSize = widgets.filter((w) => w.size === 'full');
  const largeSize = widgets.filter((w) => w.size === 'large');
  const mediumSize = widgets.filter((w) => w.size === 'medium');
  const smallSize = widgets.filter((w) => w.size === 'small');
  
  return {
    full: fullSize.sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
    large: largeSize.sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
    medium: mediumSize.sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
    small: smallSize.sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
  };
}

// ============================================
// EXAMPLE 4: Feature flags / capability checks
// ============================================

/**
 * Check if a specific feature is available before rendering
 */
function canShowFeature(workspace: WorkspaceContext, feature: string): boolean {
  switch (feature) {
    case 'mortality-tracking':
      return hasCapability(workspace, 'canTrackMortality');
    case 'breeding-management':
      return hasCapability(workspace, 'canManageBreeding');
    case 'order-management':
      return hasCapability(workspace, 'canHandleOrders');
    case 'ai-predictions':
      return hasCapability(workspace, 'canUseAIPredictions');
    default:
      return false;
  }
}

// ============================================
// EXAMPLE 5: Conditional module rendering
// ============================================

/**
 * Check if a specific module is enabled before loading its components
 */
function shouldLoadModule(workspace: WorkspaceContext, moduleId: EnabledModule): boolean {
  return isModuleEnabled(workspace, moduleId);
}

/**
 * Example: Conditionally render bioterio-specific features
 */
function renderBioterioFeatures(workspace: WorkspaceContext) {
  if (!shouldLoadModule(workspace, 'bioterio_lotes')) {
    return null;
  }
  
  // Render lotes-specific UI
  return {
    showLotes: true,
    showCajas: shouldLoadModule(workspace, 'bioterio_cajas'),
    showMortalidad: shouldLoadModule(workspace, 'bioterio_mortalidad'),
    showReproduccion: shouldLoadModule(workspace, 'bioterio_reproduccion'),
  };
}

// ============================================
// EXAMPLE 6: Multi-workspace switching
// ============================================

/**
 * When user switches workspaces, re-resolve all capabilities
 */
function switchWorkspace(newWorkspace: WorkspaceContext) {
  // Store previous workspace if needed
  const previousCapabilities = resolveWorkspaceCapabilities(exampleWorkspace);
  
  // Resolve new workspace capabilities
  const newCapabilities = resolveWorkspaceCapabilities(newWorkspace);
  
  // Compare and determine what changed
  const changes = {
    modulesChanged: JSON.stringify(previousCapabilities.enabledModules) !== 
                    JSON.stringify(newCapabilities.enabledModules),
    navigationChanged: previousCapabilities.navigation.length !== 
                       newCapabilities.navigation.length,
    widgetsChanged: previousCapabilities.dashboardWidgets.length !== 
                    newCapabilities.dashboardWidgets.length,
    aiToolsChanged: JSON.stringify(previousCapabilities.aiTools) !== 
                    JSON.stringify(newCapabilities.aiTools),
  };
  
  return {
    capabilities: newCapabilities,
    changes,
  };
}

// ============================================
// EXAMPLE 7: Future AI Tools Integration
// ============================================

/**
 * Get available AI tools for the current workspace
 * AI tools are enabled based on capability flags
 */
function getAvailableAITools(workspace: WorkspaceContext): string[] {
  const capabilities = resolveWorkspaceCapabilities(workspace);
  
  const tools: string[] = [];
  
  if (capabilities.capabilities.canUseAIPredictions) {
    tools.push('mortality-prediction');
    tools.push('breeding-optimization');
    tools.push('inventory-forecasting');
  }
  
  if (capabilities.capabilities.canUseAIRecommendations) {
    tools.push('feeding-recommendations');
    tools.push('genetic-selection');
    tools.push('health-alerts');
  }
  
  if (capabilities.capabilities.canUseAIAutomations) {
    tools.push('auto-ordering');
    tools.push('auto-reporting');
    tools.push('smart-alerts');
  }
  
  return tools;
}

// ============================================
// EXAMPLE 8: Different workspace purposes
// ============================================

const workspaces: WorkspaceContext[] = [
  {
    id: 'ws-bioterio',
    name: 'Bioterio de Producción',
    purpose: 'bioterio',
    subtype: 'bioterio_produccion',
    ownerId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
  },
  {
    id: 'ws-vet',
    name: 'Clínica Veterinaria',
    purpose: 'vet',
    subtype: 'vet_clinic_small',
    ownerId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
  },
  {
    id: 'ws-pet',
    name: 'Mis Mascotas',
    purpose: 'pet',
    subtype: 'pet_owner_multi',
    ownerId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
  },
];

/**
 * Compare capabilities across different workspace types
 */
function compareWorkspaceTypes() {
  return workspaces.map((ws) => {
    const caps = resolveWorkspaceCapabilities(ws);
    return {
      name: ws.name,
      purpose: ws.purpose,
      moduleCount: caps.enabledModules.length,
      navigationCount: caps.navigation.length,
      widgetCount: caps.dashboardWidgets.length,
      canManageInventory: caps.capabilities.canManageInventory,
      canTrackMortality: caps.capabilities.canTrackMortality,
      aiTools: caps.aiTools || [],
    };
  });
}

// Export examples for use in other files
export {
  initializeWorkspace,
  renderSidebarNavigation,
  renderDashboard,
  canShowFeature,
  shouldLoadModule,
  renderBioterioFeatures,
  switchWorkspace,
  getAvailableAITools,
  compareWorkspaceTypes,
};
