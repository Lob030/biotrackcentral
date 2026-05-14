/**
 * Connectivity Types
 */

export type ConnectivityState = 
  | 'online'
  | 'degraded'
  | 'reconnecting'
  | 'offline'
  | 'runtime_desynced'
  | 'maintenance';

export interface ConnectivityStatus {
  state: ConnectivityState;
  lastCheckedAt: number;
  disconnectDurationMs: number;
  reconnectAttempts: number;
  isLocked: boolean; // Computed: true if state !== 'online'
  reason?: string;
}

export type ConnectivityEvent =
  | { type: 'NETWORK_ONLINE' }
  | { type: 'NETWORK_OFFLINE' }
  | { type: 'SUPABASE_CONNECTED' }
  | { type: 'SUPABASE_DISCONNECTED'; reason?: string }
  | { type: 'HEARTBEAT_FAILED' }
  | { type: 'HEARTBEAT_RECOVERED' }
  | { type: 'RECOVERY_STARTED' }
  | { type: 'RECOVERY_SUCCESS' }
  | { type: 'RECOVERY_FAILED'; error: Error };
