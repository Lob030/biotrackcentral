import React, { useEffect, useState } from 'react';
import { ConnectivityRuntimeManager } from './ConnectivityRuntimeManager';
import { WifiOff, AlertCircle, RefreshCw } from 'lucide-react';

export function ConnectivityStatusBanner() {
  const [status, setStatus] = useState(ConnectivityRuntimeManager.getStatus());

  useEffect(() => {
    return ConnectivityRuntimeManager.subscribe(setStatus);
  }, []);

  if (status.state === 'online') {
    return null;
  }

  let bgColor = 'bg-destructive/90';
  let Icon = WifiOff;
  let title = 'Sin conexión a internet';

  if (status.state === 'reconnecting') {
    bgColor = 'bg-primary/90';
    Icon = RefreshCw;
    title = 'Restaurando conexión operativa...';
  } else if (status.state === 'runtime_desynced') {
    bgColor = 'bg-amber-500/90';
    Icon = AlertCircle;
    title = 'Sincronización pausada. Validando runtime...';
  } else if (status.state === 'degraded') {
    bgColor = 'bg-amber-600/90';
    Icon = AlertCircle;
    title = 'Conexión inestable. Algunas operaciones podrían fallar.';
  }

  return (
    <div className={`w-full ${bgColor} text-white px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium shadow-md z-[100] relative animate-in slide-in-from-top-2 duration-300`}>
      <Icon className={`h-4 w-4 ${status.state === 'reconnecting' ? 'animate-spin' : ''}`} />
      <span>{title}</span>
      {status.reason && status.state === 'offline' && (
        <span className="opacity-80 text-xs hidden sm:inline ml-2 border-l border-white/20 pl-2">
          {status.reason}
        </span>
      )}
    </div>
  );
}
