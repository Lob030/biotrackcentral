/**
 * Forecast Confidence System
 * 
 * Prevents "fake precision" in operational projections by enforcing estimation bands.
 * Defines the boundaries and terminology for uncertainty modeling.
 */

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface EstimationRange {
  min: number;
  expected: number;
  max: number;
  unit: string;
}

export interface ForecastConfidence {
  level: ConfidenceLevel;
  score: number; // 0.0 to 1.0
  range: EstimationRange;
  decayFactor: number; // How quickly confidence decays over time
}

/**
 * Derives an estimation band based on a base value and a confidence score.
 * Example: 100 with 0.8 confidence -> +/- 20% -> 80 to 120.
 */
export function deriveEstimationRange(
  baseValue: number,
  confidenceScore: number,
  unit: string
): EstimationRange {
  const margin = Math.max(0, 1 - confidenceScore);
  return {
    min: Math.floor(baseValue * (1 - margin)),
    expected: Math.round(baseValue),
    max: Math.ceil(baseValue * (1 + margin)),
    unit,
  };
}

/**
 * Formats an estimation range into a human-readable string to avoid fake precision.
 * DO NOT render decimal values for discrete units.
 */
export function formatEstimationBand(range: EstimationRange, discrete: boolean = true): string {
  if (range.min === range.max) {
    return `${discrete ? Math.round(range.expected) : range.expected.toFixed(1)} ${range.unit}`;
  }
  return `${discrete ? Math.round(range.min) : range.min.toFixed(1)} - ${
    discrete ? Math.round(range.max) : range.max.toFixed(1)
  } ${range.unit}`;
}

/**
 * Calculates a confidence level classification from a numeric score.
 */
export function classifyConfidence(score: number): ConfidenceLevel {
  if (score >= 0.85) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}
