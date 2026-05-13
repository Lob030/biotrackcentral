/**
 * Quick Selector Primitive
 * 
 * Fast single-selection from predefined options.
 * Optimized for mobile with large touch targets.
 */

import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: string;
  description?: string;
  disabled?: boolean;
}

export interface QuickSelectorProps {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
}

export function QuickSelector({
  options,
  value,
  onChange,
  label,
  orientation = 'horizontal',
  size = 'md',
  showDescription = false,
}: QuickSelectorProps) {
  const sizeClasses = {
    sm: 'py-2 px-3 text-sm',
    md: 'py-3 px-4 text-base',
    lg: 'py-4 px-6 text-lg',
  };

  const orientationClass = orientation === 'horizontal' ? 'flex-row flex-wrap' : 'flex-col';

  return (
    <div className="workflow-quick-selector">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      <div className={`flex gap-2 ${orientationClass}`}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => !option.disabled && onChange(option.value)}
            disabled={option.disabled}
            className={`${sizeClasses[size]} rounded-lg border-2 transition-all touch-target-large flex items-center gap-2 ${
              value === option.value
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white hover:border-gray-300'
            } ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {option.icon && <span className="text-xl">{option.icon}</span>}
            <div className="text-left">
              <div className="font-medium">{option.label}</div>
              {showDescription && option.description && (
                <div className="text-xs text-gray-500">{option.description}</div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Sex selector - common use case
 */
export function SexSelector({
  value,
  onChange,
}: {
  value: 'mixed' | 'male' | 'female';
  onChange: (value: 'mixed' | 'male' | 'female') => void;
}) {
  const options: SelectOption[] = [
    { value: 'mixed', label: 'Mixed', icon: '🔀', description: 'Both sexes' },
    { value: 'male', label: 'Male', icon: '♂️', description: 'Males only' },
    { value: 'female', label: 'Female', icon: '♀️', description: 'Females only' },
  ];

  return (
    <QuickSelector
      options={options}
      value={value}
      onChange={onChange as (value: string) => void}
      showDescription
      orientation="horizontal"
    />
  );
}

/**
 * Source type selector - common use case
 */
export function SourceTypeSelector({
  value,
  onChange,
}: {
  value: 'internal_birth' | 'external_purchase' | 'transfer';
  onChange: (value: 'internal_birth' | 'external_purchase' | 'transfer') => void;
}) {
  const options: SelectOption[] = [
    { value: 'internal_birth', label: 'Born Here', icon: '🏠', description: 'Internal birth' },
    { value: 'external_purchase', label: 'Purchased', icon: '🛒', description: 'External supplier' },
    { value: 'transfer', label: 'Transfer', icon: '🔄', description: 'From another lot' },
  ];

  return (
    <QuickSelector
      options={options}
      value={value}
      onChange={onChange as (value: string) => void}
      showDescription
      orientation="vertical"
    />
  );
}
