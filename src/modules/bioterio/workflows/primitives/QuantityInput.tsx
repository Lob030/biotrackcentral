/**
 * Quantity Input Primitive
 * 
 * Fast numeric input optimized for operational quantities.
 * Supports quick increment/decrement and direct typing.
 * 
 * FEATURES:
 * - Large touch-friendly buttons
 * - Quick +/- buttons for common adjustments
 * - Direct numeric input support
 * - Min/max validation display
 * - Keyboard shortcuts (arrow keys)
 */

import React, { useState, useCallback } from 'react';

export interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  showQuickActions?: boolean;
  quickValues?: number[];
  size?: 'sm' | 'md' | 'lg';
}

export function QuantityInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  label,
  placeholder = '0',
  disabled = false,
  showQuickActions = true,
  quickValues = [1, 5, 10],
  size = 'md',
}: QuantityInputProps) {
  const [inputValue, setInputValue] = useState(value.toString());

  const sizeClasses = {
    sm: { button: 'w-8 h-8 text-lg', input: 'w-16 h-8 text-center' },
    md: { button: 'w-12 h-12 text-xl', input: 'w-20 h-10 text-center' },
    lg: { button: 'w-16 h-16 text-2xl', input: 'w-24 h-12 text-center' },
  };

  const handleDecrement = useCallback(() => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
    setInputValue(newValue.toString());
  }, [value, step, min, onChange]);

  const handleIncrement = useCallback(() => {
    const newValue = Math.min(max ?? Infinity, value + step);
    if (max === undefined || newValue <= max) {
      onChange(newValue);
      setInputValue(newValue.toString());
    }
  }, [value, step, max, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10) || 0;
    setInputValue(e.target.value);
    
    const clampedValue = Math.max(min, Math.min(max ?? newValue, newValue));
    onChange(clampedValue);
  };

  const handleBlur = () => {
    const parsed = parseInt(inputValue, 10) || 0;
    const clampedValue = Math.max(min, Math.min(max ?? parsed, parsed));
    onChange(clampedValue);
    setInputValue(clampedValue.toString());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleIncrement();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleDecrement();
    }
  };

  return (
    <div className="workflow-quantity-input">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <div className="flex items-center gap-2">
        {/* Decrement button */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          className={`${sizeClasses[size].button} rounded-lg border bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-target-large flex items-center justify-center`}
          aria-label="Decrease quantity"
        >
          −
        </button>

        {/* Numeric input */}
        <input
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          placeholder={placeholder}
          disabled={disabled}
          className={`${sizeClasses[size].input} rounded-lg border px-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100`}
        />

        {/* Increment button */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || (max !== undefined && value >= max)}
          className={`${sizeClasses[size].button} rounded-lg border bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-target-large flex items-center justify-center`}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      {/* Quick action buttons */}
      {showQuickActions && quickValues.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {quickValues.map((qv) => (
            <button
              key={qv}
              type="button"
              onClick={() => {
                const newValue = Math.max(min, Math.min(max ?? qv, qv));
                onChange(newValue);
                setInputValue(newValue.toString());
              }}
              disabled={disabled}
              className={`px-3 py-1 text-sm rounded border bg-gray-50 hover:bg-blue-50 hover:border-blue-300 touch-target-large ${
                value === qv ? 'bg-blue-100 border-blue-400' : ''
              }`}
            >
              {qv}
            </button>
          ))}
        </div>
      )}

      {/* Min/Max display */}
      {(min !== undefined || max !== undefined) && (
        <div className="text-xs text-gray-400 mt-1">
          Range: {min}–{max ?? '∞'}
        </div>
      )}
    </div>
  );
}
