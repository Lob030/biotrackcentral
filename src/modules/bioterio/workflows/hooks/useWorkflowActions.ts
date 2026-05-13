/**
 * useWorkflowActions Hook
 * 
 * Centralized hook for accessing all workflow actions.
 * Provides consistent context and error handling.
 */

import { useState, useCallback } from 'react';
import type { WorkflowResult } from '../types';

// Import all workflow actions
import { createLotWorkflow } from '../actions/createLotWorkflow';
import { subdivideLotWorkflow } from '../actions/subdivideLotWorkflow';
import { moveLotWorkflow } from '../actions/moveLotWorkflow';
import { assignLotToCageWorkflow } from '../actions/assignLotToCageWorkflow';
import { registerMortalityWorkflow } from '../actions/registerMortalityWorkflow';
import { createBreedingGroupWorkflow } from '../actions/createBreedingGroupWorkflow';
import { registerLitterWorkflow } from '../actions/registerLitterWorkflow';
import { registerWeaningWorkflow } from '../actions/registerWeaningWorkflow';

export interface WorkflowContext {
  workspaceId: string;
  instanceId: string;
  userId: string;
}

export function useWorkflowActions(context: WorkflowContext) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<WorkflowResult | null>(null);

  const executeWorkflow = useCallback(
    async <T,>(
      actionName: string,
      workflowFn: () => Promise<WorkflowResult<T>>
    ): Promise<WorkflowResult<T>> => {
      setIsLoading(actionName);
      setLastError(null);

      try {
        const result = await workflowFn();
        setLastResult(result);

        if (!result.success && result.error) {
          setLastError(result.error);
        }

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setLastError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(null);
      }
    },
    []
  );

  const createLot = useCallback(
    (input: Parameters<typeof createLotWorkflow>[0]) => {
      return executeWorkflow('createLot', () => createLotWorkflow(input, context));
    },
    [executeWorkflow, context]
  );

  const subdivideLot = useCallback(
    (input: Parameters<typeof subdivideLotWorkflow>[0]) => {
      return executeWorkflow('subdivideLot', () => subdivideLotWorkflow(input, context));
    },
    [executeWorkflow, context]
  );

  const moveLot = useCallback(
    (input: Parameters<typeof moveLotWorkflow>[0]) => {
      return executeWorkflow('moveLot', () => moveLotWorkflow(input, context));
    },
    [executeWorkflow, context]
  );

  const assignLotToCage = useCallback(
    (input: Parameters<typeof assignLotToCageWorkflow>[0]) => {
      return executeWorkflow('assignLotToCage', () => assignLotToCageWorkflow(input, context));
    },
    [executeWorkflow, context]
  );

  const registerMortality = useCallback(
    (input: Parameters<typeof registerMortalityWorkflow>[0]) => {
      return executeWorkflow('registerMortality', () => registerMortalityWorkflow(input, context));
    },
    [executeWorkflow, context]
  );

  const createBreedingGroup = useCallback(
    (input: Parameters<typeof createBreedingGroupWorkflow>[0]) => {
      return executeWorkflow('createBreedingGroup', () => createBreedingGroupWorkflow(input, context));
    },
    [executeWorkflow, context]
  );

  const registerLitter = useCallback(
    (input: Parameters<typeof registerLitterWorkflow>[0]) => {
      return executeWorkflow('registerLitter', () => registerLitterWorkflow(input, context));
    },
    [executeWorkflow, context]
  );

  const registerWeaning = useCallback(
    (input: Parameters<typeof registerWeaningWorkflow>[0]) => {
      return executeWorkflow('registerWeaning', () => registerWeaningWorkflow(input, context));
    },
    [executeWorkflow, context]
  );

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  const clearResult = useCallback(() => {
    setLastResult(null);
  }, []);

  return {
    // Actions
    createLot,
    subdivideLot,
    moveLot,
    assignLotToCage,
    registerMortality,
    createBreedingGroup,
    registerLitter,
    registerWeaning,

    // State
    isLoading,
    lastError,
    lastResult,

    // Utilities
    clearError,
    clearResult,

    // Convenience checks
    isCreatingLot: isLoading === 'createLot',
    isSubdividingLot: isLoading === 'subdivideLot',
    isMovingLot: isLoading === 'moveLot',
    isRegisteringMortality: isLoading === 'registerMortality',
    isCreatingBreedingGroup: isLoading === 'createBreedingGroup',
    isRegisteringLitter: isLoading === 'registerLitter',
    isRegisteringWeaning: isLoading === 'registerWeaning',
  };
}
