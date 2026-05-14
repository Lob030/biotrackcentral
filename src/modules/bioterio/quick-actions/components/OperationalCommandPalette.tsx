import React, { useState, useEffect } from 'react';
import { parseOperationalCommand } from '../parser/intentParser';
import type { ActionIntent, OperationalPreview } from '../runtime/types';
import type { SpeciesRuntimeCapabilityProfile } from '../../species/runtime/types';

interface OperationalCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (preview: OperationalPreview) => void;
  speciesCapabilities?: SpeciesRuntimeCapabilityProfile;
}

export const OperationalCommandPalette: React.FC<OperationalCommandPaletteProps> = ({
  isOpen,
  onClose,
  onConfirm,
  speciesCapabilities,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [parsedIntent, setParsedIntent] = useState<ActionIntent | null>(null);

  // Parse command on every keystroke for instant feedback
  useEffect(() => {
    if (inputValue.length > 2) {
      const intent = parseOperationalCommand(inputValue, speciesCapabilities);
      setParsedIntent(intent.confidence > 0.3 ? intent : null);
    } else {
      setParsedIntent(null);
    }
  }, [inputValue, speciesCapabilities]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!parsedIntent) return;
    
    // In reality, this would query current stock to build the full preview
    const mockPreview: OperationalPreview = {
      intent: parsedIntent,
      affectedInventory: [],
      warnings: [],
      isDestructive: parsedIntent.type === 'register_mortality',
      canProceed: true,
    };
    
    onConfirm(mockPreview);
    setInputValue('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
        
        {/* Input Area */}
        <div className="p-4 border-b border-border flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
          <input
            autoFocus
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ej: 20 fuzzy muertos"
            className="flex-1 bg-transparent border-none outline-none text-xl placeholder:text-muted-foreground/50"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && parsedIntent) {
                handleConfirm();
              }
              if (e.key === 'Escape') onClose();
            }}
          />
        </div>

        {/* Live Preview Area */}
        <div className="p-4 bg-muted/30 min-h-[120px]">
          {!parsedIntent ? (
            <p className="text-sm text-muted-foreground text-center mt-6">
              Escribe un comando operacional para comenzar.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded font-mono uppercase">
                  {parsedIntent.type.replace('_', ' ')}
                </span>
                <span className="text-sm font-medium text-foreground">
                  Confianza: {Math.round(parsedIntent.confidence * 100)}%
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                {parsedIntent.quantity !== undefined && (
                  <div className="bg-background p-2 rounded border border-border">
                    <span className="text-muted-foreground block text-xs">Cantidad</span>
                    <span className="font-medium text-lg">{parsedIntent.quantity}</span>
                  </div>
                )}
                {parsedIntent.lotReference && (
                  <div className="bg-background p-2 rounded border border-border">
                    <span className="text-muted-foreground block text-xs">Lote Ref</span>
                    <span className="font-medium">{parsedIntent.lotReference}</span>
                  </div>
                )}
                {parsedIntent.cageReference && (
                  <div className="bg-background p-2 rounded border border-border">
                    <span className="text-muted-foreground block text-xs">Destino</span>
                    <span className="font-medium">{parsedIntent.cageReference}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        {parsedIntent && (
          <div className="p-4 border-t border-border bg-card flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Presiona Enter para confirmar</span>
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 rounded-lg font-medium text-sm ${
                parsedIntent.type === 'register_mortality' 
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' 
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              Confirmar Acción
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
