/**
 * Bioterio Species Module
 * 
 * Workspace Species Profiles Runtime - Allows every workspace/bioterio to define
 * how THEY operationally manage species.
 * 
 * CRITICAL PRINCIPLES:
 * - Species are NOT hardcoded operational behavior
 * - Each workspace can customize classifications, sizes, weights, ages, pricing
 * - Built-in species (ASF, Rat, Mouse) are starter blueprints, not immutable definitions
 * - Species Profiles are WORKSPACE-SCOPED
 */

export * from './runtime';
export * from './data';
export * from './components';
