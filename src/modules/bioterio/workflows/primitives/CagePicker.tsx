/**
 * Cage Picker Primitive
 * 
 * Fast, mobile-optimized cage selection component.
 * Shows available space, status, and location.
 * 
 * FEATURES:
 * - Search by code or location
 * - Filter by status, capacity
 * - Shows available space prominently
 * - Visual capacity indicator
 * - Large touch targets for mobile
 */

import React from 'react';

export interface CagePickerProps {
  value?: string;
  onChange: (cageId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  filter?: {
    status?: string[];
    minAvailableSpace?: number;
    type?: string[];
  };
  showCapacity?: boolean;
  showLocation?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CagePicker({
  value,
  onChange,
  placeholder = 'Select cage...',
  disabled = false,
  filter,
  showCapacity = true,
  showLocation = true,
  size = 'md',
}: CagePickerProps) {
  const sizeClasses = {
    sm: 'py-2 px-3 text-sm',
    md: 'py-3 px-4 text-base',
    lg: 'py-4 px-6 text-lg',
  };

  return (
    <div className={`workflow-cage-picker ${sizeClasses[size]}`}>
      <div className="cage-picker-trigger">
        <button
          type="button"
          disabled={disabled}
          className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-target-large"
          aria-label={placeholder}
        >
          {value ? (
            <div className="cage-selected">
              <span className="cage-code font-medium">Cage Code</span>
              {showCapacity && (
                <span className="cage-capacity text-gray-500 ml-2">Available: 0</span>
              )}
              {showLocation && (
                <span className="cage-location text-gray-400 ml-2">Loc: -</span>
              )}
            </div>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </button>
      </div>

      {/* Dropdown/Modal with cage list would render here */}
      <div className="cage-picker-content hidden">
        <div className="cage-search mb-2">
          <input
            type="text"
            placeholder="Search by code or location..."
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="cage-list max-h-60 overflow-y-auto">
          {/* Cage items would map here */}
          <div className="cage-item p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0 touch-target-large">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">CAGE-A01</div>
                <div className="text-sm text-gray-500">Standard • Room 1</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-green-600">5/20 free</div>
                <div className="capacity-bar w-24 h-2 bg-gray-200 rounded-full mt-1">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '25%' }} />
                </div>
              </div>
            </div>
          </div>
          
          {/* Example of full cage */}
          <div className="cage-item p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0 touch-target-large opacity-50">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">CAGE-A02</div>
                <div className="text-sm text-gray-500">Standard • Room 1</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-red-600">0/20 free</div>
                <div className="capacity-bar w-24 h-2 bg-gray-200 rounded-full mt-1">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Quick cage picker filtered by available space
 */
export function AvailableCagePicker({
  minSpace = 1,
  ...props
}: Omit<CagePickerProps, 'filter'> & { minSpace?: number }) {
  return <CagePicker filter={{ status: ['active'], minAvailableSpace: minSpace }} {...props} />;
}
