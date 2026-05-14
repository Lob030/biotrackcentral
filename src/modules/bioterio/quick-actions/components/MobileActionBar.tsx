import React from 'react';

/**
 * Mobile Action Bar
 * 
 * Persistent, large-touch-target action bar designed for operators
 * standing in the bioterio (often wearing gloves or holding equipment).
 * Replaces complex deep navigation trees.
 */
export const MobileActionBar: React.FC<{
  onOpenCommandPalette: () => void;
  onQuickMortality: () => void;
  onQuickMove: () => void;
}> = ({ onOpenCommandPalette, onQuickMortality, onQuickMove }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border shadow-lg flex items-center justify-around gap-2 z-50">
      {/* Primary Action: Open Command Parser */}
      <button
        onClick={onOpenCommandPalette}
        className="flex-1 h-14 bg-primary text-primary-foreground rounded-xl font-medium text-lg shadow hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        Comando Rápido
      </button>

      {/* Specific Quick Action Targets */}
      <button
        onClick={onQuickMortality}
        className="h-14 w-14 flex items-center justify-center rounded-xl bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
        aria-label="Registrar Baja"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
      </button>

      <button
        onClick={onQuickMove}
        className="h-14 w-14 flex items-center justify-center rounded-xl bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors"
        aria-label="Mover Lote"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9c0-2.2 1.8-4 4-4h8"/><path d="m13 1-4 4 4 4"/><path d="M19 15c0 2.2-1.8 4-4 4H7"/><path d="m11 23 4-4-4-4"/></svg>
      </button>
    </div>
  );
};
