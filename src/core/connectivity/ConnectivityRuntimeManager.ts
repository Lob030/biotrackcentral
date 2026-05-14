/**
 * Connectivity Runtime Manager
 * 
 * The Singleton source of truth for the application's connectivity state.
 * Emits events to the UI and triggers the Recovery Engine when necessary.
 */

import type { ConnectivityState, ConnectivityStatus, ConnectivityEvent } from './types';
import { ConnectivityRecoveryEngine } from './ConnectivityRecoveryEngine';

class ConnectivityRuntimeManagerClass {
  private static instance: ConnectivityRuntimeManagerClass;
  
  private status: ConnectivityStatus = {
    state: 'online',
    lastCheckedAt: Date.now(),
    disconnectDurationMs: 0,
    reconnectAttempts: 0,
    isLocked: false,
  };

  private disconnectedAt: number | null = null;
  private listeners: Set<(status: ConnectivityStatus) => void> = new Set();

  private constructor() {}

  public static getInstance(): ConnectivityRuntimeManagerClass {
    if (!ConnectivityRuntimeManagerClass.instance) {
      ConnectivityRuntimeManagerClass.instance = new ConnectivityRuntimeManagerClass();
    }
    return ConnectivityRuntimeManagerClass.instance;
  }

  public getStatus(): ConnectivityStatus {
    return { ...this.status };
  }

  public isLocked(): boolean {
    return this.status.isLocked;
  }

  public handleEvent(event: ConnectivityEvent): void {
    const prevState = this.status.state;
    
    switch (event.type) {
      case 'NETWORK_OFFLINE':
      case 'SUPABASE_DISCONNECTED':
        this.transitionTo('offline', event.type === 'SUPABASE_DISCONNECTED' ? event.reason : 'Network connection lost');
        break;
        
      case 'HEARTBEAT_FAILED':
        this.transitionTo('runtime_desynced', 'Runtime synchronization lost');
        break;

      case 'NETWORK_ONLINE':
      case 'SUPABASE_CONNECTED':
      case 'HEARTBEAT_RECOVERED':
        if (this.status.state !== 'online') {
          this.transitionTo('reconnecting', 'Attempting recovery...');
          ConnectivityRecoveryEngine.startRecovery();
        }
        break;

      case 'RECOVERY_STARTED':
        this.status.reconnectAttempts += 1;
        this.notifyListeners();
        break;

      case 'RECOVERY_SUCCESS':
        this.transitionTo('online');
        break;

      case 'RECOVERY_FAILED':
        this.transitionTo('offline', `Recovery failed: ${event.error.message}`);
        break;
    }

    if (prevState !== this.status.state) {
      console.log(`[Connectivity] State transition: ${prevState} -> ${this.status.state}`);
    }
  }

  private transitionTo(newState: ConnectivityState, reason?: string) {
    if (newState !== 'online' && this.status.state === 'online') {
      this.disconnectedAt = Date.now();
    } else if (newState === 'online') {
      this.disconnectedAt = null;
      this.status.disconnectDurationMs = 0;
      this.status.reconnectAttempts = 0;
    }

    if (this.disconnectedAt && newState !== 'online') {
      this.status.disconnectDurationMs = Date.now() - this.disconnectedAt;
    }

    this.status.state = newState;
    this.status.isLocked = newState !== 'online';
    this.status.reason = reason;
    this.status.lastCheckedAt = Date.now();
    
    this.notifyListeners();
  }

  public subscribe(callback: (status: ConnectivityStatus) => void): () => void {
    this.listeners.add(callback);
    callback(this.getStatus()); // Immediate emit
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    const currentStatus = this.getStatus();
    this.listeners.forEach(listener => listener(currentStatus));
  }
}

export const ConnectivityRuntimeManager = ConnectivityRuntimeManagerClass.getInstance();
