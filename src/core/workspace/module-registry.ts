/**
 * Module Registry
 * Central registry for all available modules in the system
 */

import type { ModuleMetadata, WorkspacePurpose } from '@/shared/types/workspace';

// Registry map: moduleId -> ModuleMetadata
const moduleRegistry = new Map<string, ModuleMetadata>();

/**
 * Register a module in the global registry
 */
export function registerModule(metadata: ModuleMetadata): void {
  if (moduleRegistry.has(metadata.id)) {
    console.warn(`Module ${metadata.id} is already registered. Overwriting.`);
  }
  moduleRegistry.set(metadata.id, metadata);
}

/**
 * Get a module by ID
 */
export function getModule(moduleId: string): ModuleMetadata | undefined {
  return moduleRegistry.get(moduleId);
}

/**
 * Get all registered modules
 */
export function getAllModules(): ModuleMetadata[] {
  return Array.from(moduleRegistry.values());
}

/**
 * Get modules enabled for a specific workspace purpose
 */
export function getModulesForPurpose(purpose: WorkspacePurpose): ModuleMetadata[] {
  return Array.from(moduleRegistry.values()).filter((module) =>
    module.supportedPurposes.includes(purpose)
  );
}

/**
 * Check if a module exists
 */
export function hasModule(moduleId: string): boolean {
  return moduleRegistry.has(moduleId);
}

/**
 * Clear all registered modules (useful for testing)
 */
export function clearModuleRegistry(): void {
  moduleRegistry.clear();
}

/**
 * Get module dependencies recursively
 */
export function getModuleDependencies(moduleId: string, visited = new Set<string>()): string[] {
  const module = getModule(moduleId);
  if (!module || visited.has(moduleId)) {
    return [];
  }
  
  visited.add(moduleId);
  const dependencies: string[] = [];
  
  if (module.dependencies) {
    for (const dep of module.dependencies) {
      dependencies.push(dep);
      dependencies.push(...getModuleDependencies(dep, visited));
    }
  }
  
  return [...new Set(dependencies)];
}
