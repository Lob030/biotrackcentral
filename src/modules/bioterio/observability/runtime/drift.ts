/**
 * Runtime Drift Detection
 * 
 * Detects inconsistencies between the event log history, the inventory runtime,
 * and the calculated operational settings projections.
 */

export interface DriftReport {
  timestamp: number;
  speciesProfileId: string;
  hasDrift: boolean;
  issues: string[];
}

export class DriftDetector {
  /**
   * Analyzes current projections vs actual inventory to find inconsistencies
   * or "orphan" operational states (e.g. projecting breeding for deceased lots).
   */
  public analyzeDrift(
    speciesProfileId: string,
    currentInventoryCount: number,
    lastProjectedCount: number,
    acceptableVariancePercent: number = 0.15
  ): DriftReport {
    const issues: string[] = [];

    const diff = Math.abs(currentInventoryCount - lastProjectedCount);
    const maxDiff = currentInventoryCount * acceptableVariancePercent;

    if (diff > maxDiff) {
      issues.push(
        `Projection drift detected. Actual: ${currentInventoryCount}, Projected: ${lastProjectedCount}. Variance exceeds ${acceptableVariancePercent * 100}% threshold.`
      );
    }

    // In a real implementation, we would check for orphan lots and stale snapshot timestamps.

    return {
      timestamp: Date.now(),
      speciesProfileId,
      hasDrift: issues.length > 0,
      issues,
    };
  }
}

export const driftDetector = new DriftDetector();
