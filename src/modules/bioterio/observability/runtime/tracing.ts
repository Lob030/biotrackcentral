/**
 * Runtime Tracing Utilities
 * 
 * Provides "explain" mechanics so the user and developers can understand
 * exactly *why* a projection or alert fired without treating the runtime as a black box.
 */

export interface ProjectionTrace {
  timestamp: number;
  speciesProfileId: string;
  projectionType: 'growth' | 'mortality' | 'availability' | 'breeding';
  inputsUsed: Record<string, unknown>;
  confidenceFactor: number;
  outputSummary: string;
}

export class RuntimeTracer {
  private traces: ProjectionTrace[] = [];

  /**
   * Logs a computation trace.
   */
  public traceComputation(trace: Omit<ProjectionTrace, 'timestamp'>) {
    this.traces.push({
      ...trace,
      timestamp: Date.now(),
    });
  }

  /**
   * Retrieves an audit trail explaining why an availability number was reached.
   */
  public explainProjection(speciesProfileId: string, projectionType: ProjectionTrace['projectionType']): ProjectionTrace[] {
    return this.traces.filter(
      (t) => t.speciesProfileId === speciesProfileId && t.projectionType === projectionType
    );
  }

  /**
   * Clears in-memory traces (for debug usage).
   */
  public clearTraces() {
    this.traces = [];
  }
}

export const runtimeTracer = new RuntimeTracer();
