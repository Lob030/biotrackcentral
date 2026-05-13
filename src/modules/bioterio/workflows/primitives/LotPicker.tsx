/**
 * Lot Picker Primitive
 * 
 * Fast, mobile-optimized lot selection component.
 * Shows current quantity, species, and location.
 * 
 * FEATURES:
 * - Search by code or strain
 * - Filter by status, species, sex
 * - Shows current quantity prominently
 * - Large touch targets for mobile
 * - Keyboard navigation support
 */

import React from 'react';

export interface LotPickerProps {
  value?: string;
  onChange: (lotId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  filter?: {
    status?: string[];
    speciesId?: string[];
    sex?: string[];
    minQuantity?: number;
  };
  showQuantity?: boolean;
  showLocation?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function LotPicker({
  value,
  onChange,
  placeholder = 'Select lot...',
  disabled = false,
  filter,
  showQuantity = true,
  showLocation = true,
  size = 'md',
}: LotPickerProps) {
  // In a real implementation, this would query the projection layer
  // For now, this is a structural component definition
  
  const sizeClasses = {
    sm: 'py-2 px-3 text-sm',
    md: 'py-3 px-4 text-base',
    lg: 'py-4 px-6 text-lg',
  };

  return (
    <div className={`workflow-lot-picker ${sizeClasses[size]}`}>
      <div className="lot-picker-trigger">
        <button
          type="button"
          disabled={disabled}
          className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-target-large"
          aria-label={placeholder}
        >
          {value ? (
            <div className="lot-selected">
              {/* Selected lot display */}
              <span className="lot-code font-medium">Lot Code</span>
              {showQuantity && (
                <span className="lot-quantity text-gray-500 ml-2">Qty: 0</span>
              )}
              {showLocation && (
                <span className="lot-location text-gray-400 ml-2">Cage: -</span>
              )}
            </div>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </button>
      </div>
      
      {/* Dropdown/Modal with lot list would render here */}
      <div className="lot-picker-content hidden">
        <div className="lot-search mb-2">
          <input
            type="text"
            placeholder="Search by code or strain..."
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="lot-list max-h-60 overflow-y-auto">
          {/* Lot items would map here */}
          <div className="lot-item p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0 touch-target-large">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">LOT-001</div>
                <div className="text-sm text-gray-500">Mouse • C57BL/6</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-green-600">24</div>
                <div className="text-xs text-gray-400">Cage A-01</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Quick lot picker with common filters pre-applied
 */
export function QuickLotPicker({
  purpose,
  ...props
}: Omit<LotPickerProps, 'filter'> & { purpose: 'active' | 'breeding' | 'weaning' }) {
  const filters = {
    active: { status: ['active'], minQuantity: 1 },
    breeding: { status: ['active'], sex: ['male', 'female'] },
    weaning: { status: ['active'], minQuantity: 1 },
  }[purpose];

  return <LotPicker filter={filters} {...props} />;
}
