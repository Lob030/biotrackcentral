import React from 'react';
import type { ActionQueueItem } from '../runtime/types';
import { actionQueue } from '../runtime/queue';

export const ActionHistoryPanel: React.FC = () => {
  const history = actionQueue.getHistory();

  const handleUndo = async (item: ActionQueueItem) => {
    // In a real app, this would show a confirmation dialog or toast
    const success = await actionQueue.revertAction(item.id, 'user_id', 'Reversión rápida desde UI');
    if (success) {
      alert('Acción revertida correctamente.');
    } else {
      alert('No se pudo revertir esta acción (ya fue revertida o falló).');
    }
  };

  if (history.length === 0) {
    return (
      <div className="p-4 border border-border rounded-xl bg-card text-center text-sm text-muted-foreground">
        No hay acciones recientes en esta sesión.
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="p-3 bg-muted/50 border-b border-border flex justify-between items-center">
        <h3 className="font-medium text-sm">Historial Operacional</h3>
        <span className="text-xs text-muted-foreground">{history.length} acciones</span>
      </div>
      
      <div className="divide-y divide-border max-h-64 overflow-y-auto">
        {history.map((item) => (
          <div key={item.id} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
            
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium uppercase text-foreground">
                {item.preview.intent.type.replace('_', ' ')}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {item.preview.intent.rawInput}
              </span>
              
              <div className="flex gap-2 items-center mt-1">
                {item.status === 'completed' && (
                  <span className="inline-flex h-2 w-2 rounded-full bg-green-500" title="Completado" />
                )}
                {item.status === 'reverted' && (
                  <span className="inline-flex h-2 w-2 rounded-full bg-orange-500" title="Revertido" />
                )}
                {item.status === 'failed' && (
                  <span className="inline-flex h-2 w-2 rounded-full bg-red-500" title="Error" />
                )}
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {item.status}
                </span>
              </div>
            </div>

            {item.status === 'completed' && (
              <button
                onClick={() => handleUndo(item)}
                className="text-xs px-2 py-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded"
              >
                Deshacer
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
