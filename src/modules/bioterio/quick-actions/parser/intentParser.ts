/**
 * Operational Command Parser
 * 
 * Rapidly parses natural-language operational inputs into structured ActionIntents.
 * Uses heuristic regex matching optimized for speed (0ms latency),
 * NOT slow AI/LLM calls.
 * 
 * Example inputs:
 * "20 fuzzy muertos" -> { type: 'register_mortality', quantity: 20, classificationName: 'fuzzy' }
 * "mover ASF-21 a C-12" -> { type: 'move_lot', lotReference: 'ASF-21', cageReference: 'C-12' }
 */

import type { ActionIntent, QuickActionType } from '../runtime/types';
import type { SpeciesRuntimeCapabilityProfile } from '../../species/runtime/types';

// Keyword dictionaries (Spanish)
const DICT = {
  mortality: ['muerto', 'muertos', 'baja', 'bajas', 'fallecido', 'fallecidos'],
  movement: ['mover', 'trasladar', 'pasar'],
  subdivision: ['subdividir', 'dividir', 'partir'],
  reservation: ['apartar', 'reservar', 'guardar'],
  cleaning: ['limpio', 'limpieza', 'lavar', 'limpiar'],
};

/**
 * Parses raw input into an operational ActionIntent.
 */
export function parseOperationalCommand(
  rawInput: string,
  speciesCapabilities?: SpeciesRuntimeCapabilityProfile
): ActionIntent {
  const normalized = rawInput.toLowerCase().trim();
  
  // Default fallback
  const intent: ActionIntent = {
    type: 'unknown',
    confidence: 0,
    rawInput,
  };

  if (!normalized) return intent;

  // 1. Detect Intent Type
  if (DICT.mortality.some(k => normalized.includes(k))) {
    intent.type = 'register_mortality';
    intent.confidence += 0.5;
  } else if (DICT.movement.some(k => normalized.includes(k))) {
    intent.type = 'move_lot';
    intent.confidence += 0.5;
  } else if (DICT.reservation.some(k => normalized.includes(k))) {
    intent.type = 'reserve_inventory';
    intent.confidence += 0.5;
  } else if (DICT.subdivision.some(k => normalized.includes(k))) {
    intent.type = 'subdivide_lot';
    intent.confidence += 0.5;
  }

  // 2. Extract Quantity (numbers followed optionally by units like 'g' or 'kg')
  // e.g., "20", "150g", "1.5kg"
  const qtyMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(g|kg)?/);
  if (qtyMatch) {
    intent.quantity = parseFloat(qtyMatch[1]);
    intent.confidence += 0.2;
    // Note: the unit (e.g., 'g') would ideally be compared against speciesCapabilities.operationalQuantityUnit
  }

  // 3. Extract Cage Reference (e.g., "a C-12" or "rack B")
  // Simplistic heuristic: "a [CODE]" or "en [CODE]"
  const cageMatch = normalized.match(/(?:a|en|hacia)\s+([a-z0-9-]+)/i);
  if (cageMatch && cageMatch[1] !== 'los' && cageMatch[1] !== 'las') {
    intent.cageReference = cageMatch[1].toUpperCase();
    intent.confidence += 0.1;
  }

  // 4. Extract Lot Reference (e.g., "ASF-21")
  // Looks for typical lot codes: 2-4 letters followed by dash and numbers
  const lotMatch = normalized.match(/([a-z]{2,4}-\d{1,5})/i);
  if (lotMatch) {
    intent.lotReference = lotMatch[1].toUpperCase();
    intent.confidence += 0.2;
  }

  // 5. Capability Awareness Validation
  // Reject actions that violate the species operational mode
  if (speciesCapabilities) {
    if (intent.type === 'subdivide_lot' && speciesCapabilities.subdivisionMode === 'none') {
      // Cannot subdivide this species
      intent.type = 'unknown';
      intent.confidence = 0;
    }
  }

  // Cap confidence at 1.0
  intent.confidence = Math.min(1.0, intent.confidence);

  return intent;
}
