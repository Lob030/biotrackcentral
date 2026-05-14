import React from 'react';
import type { AttentionCard } from '../runtime/types';

interface AttentionFeedProps {
  cards: AttentionCard[];
  onActionClick: (command: string) => void;
  onSnooze: (cardId: string) => void;
}

export const AttentionFeed: React.FC<AttentionFeedProps> = ({ cards, onActionClick, onSnooze }) => {
  if (cards.length === 0) {
    return (
      <div className="p-8 text-center bg-card border border-border rounded-xl">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto text-muted-foreground mb-4"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        <h3 className="text-lg font-medium text-foreground">Operación Estable</h3>
        <p className="text-sm text-muted-foreground mt-2">No se detectan alertas ni acciones pendientes. El bioterio opera dentro de los umbrales esperados.</p>
      </div>
    );
  }

  const getPriorityColor = (priority: AttentionCard['priority']) => {
    switch (priority) {
      case 'critical': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'high': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'low': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    }
  };

  return (
    <div className="space-y-4">
      {cards.map((card) => (
        <div key={card.id} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider mb-2 border ${getPriorityColor(card.priority)}`}>
                  {card.priority}
                </span>
                <h4 className="text-base font-semibold text-foreground leading-tight">{card.title}</h4>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{card.description}</p>
              </div>
              
              <button 
                onClick={() => onSnooze(card.id)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
                title="Posponer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </button>
            </div>
          </div>
          
          <div className="bg-muted/30 p-3 border-t border-border flex flex-wrap gap-2">
            {card.suggestedActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => onActionClick(action.prefilledIntentCommand || '')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex-1 text-center ${
                  action.isPrimary 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                    : 'bg-background border border-border text-foreground hover:bg-muted'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
