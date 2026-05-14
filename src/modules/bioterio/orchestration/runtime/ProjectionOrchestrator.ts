/**
 * Projection Orchestrator
 * 
 * Responsible for coordinating recalculations, batching updates,
 * and preventing duplicate projection work / recalculation storms.
 */

export interface ProjectionJob {
  speciesProfileId: string;
  workspaceId: string;
  requestedAt: number;
}

export class ProjectionOrchestrator {
  private static instance: ProjectionOrchestrator;
  private pendingJobs: Map<string, ProjectionJob> = new Map();
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;

  // Wait time to batch multiple fast-arriving events
  private readonly DEBOUNCE_MS = 2500;

  private constructor() {}

  public static getInstance(): ProjectionOrchestrator {
    if (!ProjectionOrchestrator.instance) {
      ProjectionOrchestrator.instance = new ProjectionOrchestrator();
    }
    return ProjectionOrchestrator.instance;
  }

  /**
   * Request a projection recalculation.
   * Debounces identical requests to prevent recalculation storms.
   */
  public requestRecalculation(workspaceId: string, speciesProfileId: string) {
    const jobKey = `${workspaceId}_${speciesProfileId}`;
    
    this.pendingJobs.set(jobKey, {
      workspaceId,
      speciesProfileId,
      requestedAt: Date.now(),
    });

    this.scheduleExecution();
  }

  private scheduleExecution() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(() => {
      this.executeBatch();
    }, this.DEBOUNCE_MS);
  }

  private async executeBatch() {
    const jobsToProcess = Array.from(this.pendingJobs.values());
    this.pendingJobs.clear();

    for (const job of jobsToProcess) {
      try {
        await this.recalculateTopological(job);
      } catch (err) {
        console.error(`[ProjectionOrchestrator] Failed recalculation for ${job.speciesProfileId}`, err);
      }
    }
  }

  /**
   * Recalculates dependencies in the correct topological order.
   * Growth -> Mortality -> Availability -> Breeding Output
   */
  private async recalculateTopological(job: ProjectionJob) {
    // 1. Snapshot the event history / current state
    // 2. Compute Growth (baseline weight/stage logic)
    // 3. Compute Mortality (deducting expected losses)
    // 4. Compute Availability (combining current inventory + growth - mortality)
    // 5. Compute Breeding (future inputs)
    
    // Implementation delegated to operational-settings/runtime/operations
    // In a real execution, this would dispatch events or write to a snapshot cache.
    console.log(`[ProjectionOrchestrator] Recalculating topologically for ${job.speciesProfileId}`);
  }
}

export const orchestrator = ProjectionOrchestrator.getInstance();
