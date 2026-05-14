import React, { useState, useEffect } from 'react';
import { priorityEngine } from '../runtime/engine';
import { AttentionFeed } from './AttentionFeed';
import { ForecastWidget } from './ForecastWidgets';
import { ReadinessWidget } from './ReadinessWidgets';
import type { AttentionCard } from '../runtime/types';
import type { SpeciesRuntimeCapabilityProfile } from '../../species/runtime/types';

interface OperationalCommandCenterProps {
  workspaceId: string;
  speciesCapabilities: SpeciesRuntimeCapabilityProfile;
  onQuickActionRequest: (intentStr: string) => void;
}

export const OperationalCommandCenter: React.FC<OperationalCommandCenterProps> = ({
  workspaceId,
  speciesCapabilities,
  onQuickActionRequest
}) => {
  const [cards, setCards] = useState<AttentionCard[]>([]);
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    // In reality, this would be a subscription to the Orchestrator / Store
    setCards(priorityEngine.getActiveCards(workspaceId));
  }, [workspaceId]);

  const handleSnooze = (cardId: string) => {
    priorityEngine.snoozeCard(cardId, 24); // Snooze for 24 hours
    setCards(priorityEngine.getActiveCards(workspaceId));
  };

  const visibleCards = focusMode 
    ? cards.filter(c => c.priority === 'critical' || c.priority === 'high')
    : cards;

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* Header & Focus Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Centro de Comando</h2>
          <p className="text-muted-foreground text-sm">Estado Operacional Diario</p>
        </div>
        
        <button
          onClick={() => setFocusMode(!focusMode)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 ${
            focusMode 
              ? 'bg-primary text-primary-foreground border-primary' 
              : 'bg-background text-muted-foreground border-border hover:bg-muted'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Modo Foco {focusMode && '(Activo)'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Main Feed: Operational Attention */}
        <div className="md:col-span-8 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Atención Requerida</h3>
            <AttentionFeed 
              cards={visibleCards} 
              onActionClick={onQuickActionRequest}
              onSnooze={handleSnooze}
            />
          </div>

          {/* Operational Timeline (Simplified) */}
          <div className="bg-muted/20 border border-border rounded-xl p-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Línea de Tiempo Operacional (7 Días)</h3>
            <div className="relative border-l-2 border-muted ml-3 space-y-4">
              <div className="relative pl-4">
                <div className="absolute w-3 h-3 bg-green-500 rounded-full -left-[7px] top-1" />
                <span className="text-xs font-mono text-muted-foreground">Mañana</span>
                <p className="text-sm font-medium">Ventana de Nacimientos Esperados (ASF-1)</p>
              </div>
              <div className="relative pl-4">
                <div className="absolute w-3 h-3 bg-orange-500 rounded-full -left-[7px] top-1" />
                <span className="text-xs font-mono text-muted-foreground">En 4 días</span>
                <p className="text-sm font-medium">Límite de Stock Hopper Mínimo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Widgets */}
        <div className="md:col-span-4 space-y-4">
          
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Proyecciones</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <ForecastWidget 
              title="Disponibilidad Pinky"
              metricLabel="Proyección Estimada"
              estimation={{ min: 120, expected: 135, max: 150, unit: speciesCapabilities.operationalQuantityUnit }}
              confidence="high"
              daysOut={7}
              trend="stable"
            />
            
            <ForecastWidget 
              title="Mortalidad Esperada"
              metricLabel="Límite Máximo"
              estimation={{ min: 2, expected: 4, max: 8, unit: speciesCapabilities.operationalQuantityUnit }}
              confidence="medium"
              daysOut={7}
              trend="up"
            />
          </div>

          <div className="pt-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Prontitud (Readiness)</h3>
            
            <div className="space-y-4">
              <ReadinessWidget 
                title="Lotes para Destete"
                icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9c0-2.2 1.8-4 4-4h8"/><path d="m13 1-4 4 4 4"/><path d="M19 15c0 2.2-1.8 4-4 4H7"/><path d="m11 23 4-4-4-4"/></svg>}
                items={[
                  { id: '1', entityReference: 'ASF-44', label: 'Lactancia > 21 días', actionIntent: 'destetar ASF-44' },
                  { id: '2', entityReference: 'ASF-45', label: 'Lactancia > 21 días', actionIntent: 'destetar ASF-45' }
                ]}
                onActionClick={onQuickActionRequest}
              />
              
              {/* Contextual Adaptation: Only show sex separation if supported */}
              {speciesCapabilities.subdivisionMode === 'sex_separated' && (
                <ReadinessWidget 
                  title="Separación por Sexo"
                  icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"/><path d="m21 3-6 6"/><path d="M9 11a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/><path d="M9 21v-6"/></svg>}
                  items={[
                    { id: '3', entityReference: 'LOTE-77', label: 'Alcanzó edad de madurez', actionIntent: 'separar LOTE-77' }
                  ]}
                  onActionClick={onQuickActionRequest}
                />
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};
