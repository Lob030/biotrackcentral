/**
 * AI Operational Safety Context
 * 
 * Ensures the AI Runtime NEVER invents biological assumptions.
 * The AI MUST operate strictly within this approved operational boundary.
 */

import type { OperationalSettingsProfile } from '../../operational-settings/runtime/types';
import type { ForecastConfidence } from '../../operational-settings/runtime/confidence';

export interface AIOperationalContext {
  /** The current time of context generation */
  generatedAt: number;

  /** Identifies the strict workspace boundary */
  workspaceId: string;
  speciesProfileId: string;

  /** Operational settings dictating behavior heuristics */
  operationalSettings: OperationalSettingsProfile;

  /**
   * The current projection bands provided by the Orchestrator.
   * AI MUST relay confidence levels and estimation ranges, NOT precise floats.
   */
  currentProjections: {
    availability: {
      range: { min: number; expected: number; max: number; unit: string };
      confidence: ForecastConfidence;
    };
    mortality: {
      expectedLosses: number;
      confidence: ForecastConfidence;
    };
  };

  /** The AI must strictly abide by these system-level constraints */
  safetyDirectives: string[];
}

/**
 * Builds the strict context layer that the LLM agent is allowed to see.
 */
export function buildAIContext(
  workspaceId: string,
  speciesProfileId: string,
  settings: OperationalSettingsProfile,
  // in reality these would be passed from orchestrator
  availabilityRange: { min: number; expected: number; max: number; unit: string },
  availabilityConfidence: ForecastConfidence,
  mortalityExpected: number,
  mortalityConfidence: ForecastConfidence
): AIOperationalContext {
  return {
    generatedAt: Date.now(),
    workspaceId,
    speciesProfileId,
    operationalSettings: settings,
    currentProjections: {
      availability: {
        range: availabilityRange,
        confidence: availabilityConfidence,
      },
      mortality: {
        expectedLosses: mortalityExpected,
        confidence: mortalityConfidence,
      },
    },
    safetyDirectives: [
      "DO NOT invent biological assumptions.",
      "ONLY recommend actions based on provided OperationalThresholds.",
      "NEVER state projections as absolute certainty. Always communicate ranges (min-max).",
      "Explain the 'confidence.level' when providing forecasting answers.",
    ],
  };
}
