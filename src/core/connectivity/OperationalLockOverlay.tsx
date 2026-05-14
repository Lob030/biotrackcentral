import React from 'react';
import { WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOperationalLock } from './ConnectivityGuard';
import { ConnectivityRuntimeManager } from './ConnectivityRuntimeManager';
import { ConnectivityRecoveryEngine } from './ConnectivityRecoveryEngine';

interface OperationalLockOverlayProps {
  children: React.ReactNode;
  /**
   * If true, the overlay covers the children completely.
   * If false, it acts as an invisible barrier blocking clicks.
   */
  visual?: boolean;
}

/**
 * A wrapper component that overlays a "Locked" state over its children
 * when the connectivity state is not online.
 */
export function OperationalLockOverlay({ children, visual = true }: OperationalLockOverlayProps) {
  const isLocked = useOperationalLock();
  
  if (!isLocked) {
    return <>{children}</>;
  }

  const status = ConnectivityRuntimeManager.getStatus();
  const isReconnecting = status.state === 'reconnecting';

  return (
    <div className="relative w-full h-full">
      {/* The underlying content, blurred and unclickable */}
      <div className="pointer-events-none select-none blur-[2px] opacity-60 transition-all duration-300">
        {children}
      </div>

      {/* The Lock Overlay */}
      {visual && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-sm rounded-lg border border-destructive/20 p-6">
          <div className="bg-card border border-border shadow-2xl rounded-2xl p-6 max-w-sm w-full flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200">
            
            <div className={`p-4 rounded-full ${isReconnecting ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
              {isReconnecting ? (
                <RefreshCw className="h-8 w-8 animate-spin" />
              ) : (
                <WifiOff className="h-8 w-8" />
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="font-bold text-xl tracking-tight">
                {isReconnecting ? 'Restaurando Conexión' : 'Sin Conexión'}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Las operaciones están temporalmente bloqueadas para prevenir corrupción de datos. 
                {status.reason && <span className="block mt-1 opacity-70 text-xs">{status.reason}</span>}
              </p>
            </div>

            {!isReconnecting && (
              <Button 
                variant="outline" 
                className="w-full mt-2" 
                onClick={() => ConnectivityRecoveryEngine.startRecovery()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reintentar
              </Button>
            )}
            
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full mt-4">
              <AlertTriangle className="h-3 w-3" />
              <span>Modo Sólo Lectura</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Invisible blocker if visual is false */}
      {!visual && (
        <div className="absolute inset-0 z-50 cursor-not-allowed" title="Operación bloqueada sin conexión" />
      )}
    </div>
  );
}
