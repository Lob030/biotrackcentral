/**
 * useOperationalValidation Hook
 * 
 * Provides real-time validation for operational workflows.
 * Checks constraints against projection data.
 */

import { useState, useCallback, useMemo } from 'react';
import type { ValidationError } from '../types';

export interface ValidationState {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  canProceed: boolean;
}

export function useOperationalValidation() {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [warnings, setWarnings] = useState<ValidationError[]>([]);

  /**
   * Validate cage capacity constraint
   */
  const validateCageCapacity = useCallback(
    (quantity: number, availableSpace: number, field: string = 'quantity'): ValidationError[] => {
      const newErrors: ValidationError[] = [];

      if (quantity > availableSpace) {
        newErrors.push({
          field,
          message: `Exceeds available space (${availableSpace})`,
          severity: 'error',
        });
      } else if (quantity > availableSpace * 0.8) {
        newErrors.push({
          field,
          message: `Near capacity (${Math.round((quantity / availableSpace) * 100)}%)`,
          severity: 'warning',
        });
      }

      return newErrors;
    },
    []
  );

  /**
   * Validate lot quantity constraint
   */
  const validateLotQuantity = useCallback(
    (quantity: number, available: number, field: string = 'quantity'): ValidationError[] => {
      const newErrors: ValidationError[] = [];

      if (quantity <= 0) {
        newErrors.push({
          field,
          message: 'Quantity must be positive',
          severity: 'error',
        });
      } else if (quantity > available) {
        newErrors.push({
          field,
          message: `Exceeds available (${available})`,
          severity: 'error',
        });
      }

      return newErrors;
    },
    []
  );

  /**
   * Validate subdivision allocation
   */
  const validateSubdivisionAllocation = useCallback(
    (
      subdivisions: Array<{ quantity: number }>,
      totalAvailable: number
    ): ValidationError[] => {
      const newErrors: ValidationError[] = [];
      const totalAllocated = subdivisions.reduce((sum, sub) => sum + sub.quantity, 0);

      if (totalAllocated > totalAvailable) {
        newErrors.push({
          field: 'subdivisions',
          message: `Total (${totalAllocated}) exceeds available (${totalAvailable})`,
          severity: 'error',
        });
      } else if (totalAllocated === 0) {
        newErrors.push({
          field: 'subdivisions',
          message: 'At least one subdivision required',
          severity: 'error',
        });
      } else if (totalAllocated < totalAvailable) {
        newErrors.push({
          field: 'subdivisions',
          message: `${totalAvailable - totalAllocated} animals not allocated`,
          severity: 'warning',
        });
      }

      // Check each subdivision
      subdivisions.forEach((sub, index) => {
        if (sub.quantity <= 0) {
          newErrors.push({
            field: `subdivisions[${index}]`,
            message: 'Positive quantity required',
            severity: 'error',
          });
        }
      });

      return newErrors;
    },
    []
  );

  /**
   * Validate breeding group composition
   */
  const validateBreedingGroup = useCallback(
    (members: Array<{ role: string; quantity: number }>): ValidationError[] => {
      const newErrors: ValidationError[] = [];

      const males = members.filter((m) => m.role === 'male');
      const females = members.filter((m) => m.role === 'female');

      if (males.length === 0 || males.reduce((sum, m) => sum + m.quantity, 0) === 0) {
        newErrors.push({
          field: 'members',
          message: 'At least one male required',
          severity: 'error',
        });
      }

      if (females.length === 0 || females.reduce((sum, m) => sum + m.quantity, 0) === 0) {
        newErrors.push({
          field: 'members',
          message: 'At least one female required',
          severity: 'error',
        });
      }

      return newErrors;
    },
    []
  );

  /**
   * Validate litter data
   */
  const validateLitter = useCallback(
    (litterSize: number, liveBirths: number): ValidationError[] => {
      const newErrors: ValidationError[] = [];

      if (litterSize <= 0) {
        newErrors.push({
          field: 'litterSize',
          message: 'Litter size must be positive',
          severity: 'error',
        });
      }

      if (liveBirths <= 0) {
        newErrors.push({
          field: 'liveBirths',
          message: 'Live births must be positive',
          severity: 'error',
        });
      } else if (liveBirths > litterSize) {
        newErrors.push({
          field: 'liveBirths',
          message: 'Cannot exceed litter size',
          severity: 'error',
        });
      }

      return newErrors;
    },
    []
  );

  /**
   * Get combined validation state
   */
  const getState = useCallback(
    (...errorLists: ValidationError[][]) => {
      const allErrors = errorLists.flat();
      const errorList = allErrors.filter((e) => e.severity === 'error');
      const warningList = allErrors.filter((e) => e.severity === 'warning');

      return {
        isValid: errorList.length === 0,
        errors: errorList,
        warnings: warningList,
        canProceed: errorList.length === 0,
      };
    },
    []
  );

  /**
   * Update errors state
   */
  const setValidationErrors = useCallback((newErrors: ValidationError[]) => {
    setErrors(newErrors.filter((e) => e.severity === 'error'));
    setWarnings(newErrors.filter((e) => e.severity === 'warning'));
  }, []);

  /**
   * Clear all validation state
   */
  const clearValidation = useCallback(() => {
    setErrors([]);
    setWarnings([]);
  }, []);

  return useMemo(
    () => ({
      // Current state
      errors,
      warnings,
      isValid: errors.length === 0,
      hasWarnings: warnings.length > 0,
      canProceed: errors.length === 0,

      // Validation functions
      validateCageCapacity,
      validateLotQuantity,
      validateSubdivisionAllocation,
      validateBreedingGroup,
      validateLitter,
      getState,

      // State management
      setValidationErrors,
      clearValidation,
    }),
    [
      errors,
      warnings,
      validateCageCapacity,
      validateLotQuantity,
      validateSubdivisionAllocation,
      validateBreedingGroup,
      validateLitter,
      getState,
      setValidationErrors,
      clearValidation,
    ]
  );
}
