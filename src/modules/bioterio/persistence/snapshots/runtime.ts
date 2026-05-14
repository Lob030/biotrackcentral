/**
 * Projection Snapshot System
 * 
 * Prevents infinite event replay costs by checkpointing projection data.
 * Maintains historical operational truth.
 */

export interface ProjectionSnapshot {
  id: string;
  workspaceId: string;
  speciesProfileId: string;
  
  /** Timestamp when the snapshot was generated */
  generatedAt: number;

  /** 
   * The latest event sequence ID incorporated into this snapshot.
   * If the event log has progressed past this sequence, the snapshot is stale.
   */
  lastEventSequenceId: string;

  /** Payload data (serialized projection results) */
  growthSnapshotUrl?: string;
  availabilitySnapshotUrl?: string;
  mortalitySnapshotUrl?: string;
}

export class SnapshotManager {
  /**
   * Retrieves the most recent valid snapshot for a species runtime.
   */
  public async getLatestSnapshot(workspaceId: string, speciesProfileId: string): Promise<ProjectionSnapshot | null> {
    // In a real implementation, fetches from Supabase / DB
    return null;
  }

  /**
   * Persists a newly calculated set of projections as a snapshot checkpoint.
   */
  public async createCheckpoint(
    workspaceId: string,
    speciesProfileId: string,
    lastEventSequenceId: string,
    payloads: Record<string, unknown>
  ): Promise<ProjectionSnapshot> {
    const snapshot: ProjectionSnapshot = {
      id: `snap_${Date.now()}`,
      workspaceId,
      speciesProfileId,
      generatedAt: Date.now(),
      lastEventSequenceId,
    };
    // Persist to DB
    return snapshot;
  }

  /**
   * Checks if the current snapshot is stale relative to the event log.
   */
  public isStale(snapshot: ProjectionSnapshot, currentEventSequenceId: string): boolean {
    return snapshot.lastEventSequenceId !== currentEventSequenceId;
  }
}

export const snapshotManager = new SnapshotManager();
