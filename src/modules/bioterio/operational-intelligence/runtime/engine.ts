/**
 * Operational Priority Engine
 * 
 * Consumes projections from the Orchestrator to generate dynamic AttentionCards.
 * This is the brain behind the Daily Operational Command Center.
 */

import type { AttentionCard } from './types';
// In a real implementation, we would import the ProjectionOrchestrator outputs here.

export class OperationalPriorityEngine {
  private activeCards: Map<string, AttentionCard> = new Map();

  /**
   * Generates or updates Attention Cards based on current operational state and projections.
   */
  public evaluateOperationalState(
    workspaceId: string,
    speciesProfileId: string,
    // projections: ...
  ): void {
    // 1. Evaluate Shortages
    // If projection shows Hopper availability dropping below threshold in < 7 days:
    // createCard('shortage', 'high', 'Riesgo de Ruptura de Stock', 'Se proyecta falta de stock de Hopper en 5 días.')

    // 2. Evaluate Overcrowding
    // If occupancy projection > overcrowding threshold:
    // createCard('overcrowding', 'critical', 'Hacinamiento Crítico', 'Rack B supera capacidad operativa.')

    // 3. Evaluate Readiness
    // If lots are marked as mature but not subdivided:
    // createCard('readiness', 'medium', 'Lotes listos para subdivisión', 'ASF-12 alcanzó edad de destete.')
  }

  /**
   * Mock generation for UI development
   */
  public generateMockCards(workspaceId: string): AttentionCard[] {
    return [
      {
        id: 'card_1',
        workspaceId,
        category: 'shortage',
        priority: 'high',
        title: 'Riesgo de Ruptura de Stock',
        description: 'Se proyecta que el inventario de Hopper (20-40g) caerá por debajo del mínimo operativo en 4 días.',
        context: { sizeClassId: 'hopper' },
        suggestedActions: [
          { label: 'Subdividir camada', actionType: 'subdivide_lot', prefilledIntentCommand: 'subdividir camada', isPrimary: true },
          { label: 'Ajustar umbral', actionType: 'unknown', isPrimary: false }
        ],
        createdAt: Date.now() - 3600000,
      },
      {
        id: 'card_2',
        workspaceId,
        category: 'readiness',
        priority: 'medium',
        title: 'Lotes listos para destete',
        description: 'Los lotes ASF-44 y ASF-45 han superado los 21 días de lactancia.',
        context: { lotIds: ['ASF-44', 'ASF-45'] },
        suggestedActions: [
          { label: 'Registrar Destete', actionType: 'register_weaning', prefilledIntentCommand: 'destetar ASF-44', isPrimary: true }
        ],
        createdAt: Date.now() - 86400000,
      },
      {
        id: 'card_3',
        workspaceId,
        category: 'overcrowding',
        priority: 'critical',
        title: 'Alerta de Hacinamiento',
        description: 'El rack Rack-A está operando al 115% de su densidad recomendada.',
        context: { cageIds: ['Rack-A'] },
        suggestedActions: [
          { label: 'Mover Lotes', actionType: 'move_lot', prefilledIntentCommand: 'mover lotes Rack-A', isPrimary: true }
        ],
        createdAt: Date.now() - 1800000,
      }
    ];
  }

  /**
   * Retrieves active, non-snoozed cards, sorted by priority.
   */
  public getActiveCards(workspaceId: string): AttentionCard[] {
    const now = Date.now();
    // In dev, use mocks. In prod, read from this.activeCards
    const cards = this.generateMockCards(workspaceId);
    
    return cards
      .filter((c) => !c.snoozedUntil || c.snoozedUntil <= now)
      .sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority));
  }

  /**
   * Snooze a card for a specific duration.
   */
  public snoozeCard(cardId: string, hours: number): void {
    const card = this.activeCards.get(cardId);
    if (card) {
      card.snoozedUntil = Date.now() + (hours * 3600 * 1000);
      this.activeCards.set(cardId, card);
    }
  }

  private getPriorityWeight(priority: AttentionCard['priority']): number {
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
    }
  }
}

export const priorityEngine = new OperationalPriorityEngine();
