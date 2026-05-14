/**
 * Blueprint Availability Configuration
 * 
 * Centralized configuration to manage which operational blueprints
 * are active and available in the current version of the platform.
 */

export interface BlueprintAvailability {
  enabled: boolean;
  label?: string;
  badge?: string;
}

export const BLUEPRINT_AVAILABILITY: Record<string, BlueprintAvailability> = {
  "Bioterio": {
    enabled: true,
  },
  "Granja avícola": {
    enabled: false,
    badge: "Próximamente",
    label: "Disponible en futuras versiones",
  },
  "Comercializadora": {
    enabled: false,
    badge: "Próximamente",
    label: "Disponible en futuras versiones",
  },
  "Granja cunícola": {
    enabled: false,
    badge: "Próximamente",
    label: "Disponible en futuras versiones",
  },
  "Ganadería bovina": {
    enabled: false,
    badge: "Próximamente",
    label: "Disponible en futuras versiones",
  },
  "PIMVS": {
    enabled: false,
    badge: "Próximamente",
    label: "Disponible en futuras versiones",
  },
  "UMA": {
    enabled: false,
    badge: "Próximamente",
    label: "Disponible en futuras versiones",
  },
  "Acuario / Operación acuática": {
    enabled: false,
    badge: "Próximamente",
    label: "Disponible en futuras versiones",
  },
  "Clínica Veterinaria": {
    enabled: false,
    badge: "Próximamente",
    label: "Disponible en futuras versiones",
  },
};

/**
 * Helper to check if a specific blueprint is enabled
 */
export function isBlueprintEnabled(blueprintId: string): boolean {
  return BLUEPRINT_AVAILABILITY[blueprintId]?.enabled === true;
}

/**
 * High-level purpose availability
 */
export const PURPOSE_AVAILABILITY: Record<string, BlueprintAvailability> = {
  "business": {
    enabled: true,
  },
  "pet": {
    enabled: false,
    badge: "Próximamente",
    label: "Disponible en futuras versiones",
  },
  "vet": {
    enabled: false,
    badge: "Próximamente",
    label: "Disponible en futuras versiones",
  },
};
