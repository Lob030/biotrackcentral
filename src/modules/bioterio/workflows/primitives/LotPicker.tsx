/**
 * Lot Picker Primitive
 *
 * Filters reference `speciesProfileId` exclusively.
 */

import React from "react";

export interface LotPickerProps {
  value?: string;
  onChange: (lotId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  filter?: {
    status?: string[];
    speciesProfileId?: string[];
    sex?: string[];
    minQuantity?: number;
  };
  showQuantity?: boolean;
  showLocation?: boolean;
  size?: "sm" | "md" | "lg";
}

export function LotPicker({
  value,
  onChange,
  placeholder = "Select lot...",
  disabled = false,
  filter,
  showQuantity = true,
  showLocation = true,
  size = "md",
}: LotPickerProps) {
  const sizeClasses = {
    sm: "py-2 px-3 text-sm",
    md: "py-3 px-4 text-base",
    lg: "py-4 px-6 text-lg",
  };

  return (
    <div className={`workflow-lot-picker ${sizeClasses[size]}`}>
      <div className="lot-picker-trigger">
        <button
          type="button"
          disabled={disabled}
          className="w-full text-left p-3 border rounded-lg hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary touch-target-large"
          aria-label={placeholder}
        >
          {value ? (
            <div className="lot-selected">
              <span className="lot-code font-medium">Lot Code</span>
              {showQuantity && (
                <span className="lot-quantity text-muted-foreground ml-2">Qty: 0</span>
              )}
              {showLocation && (
                <span className="lot-location text-muted-foreground ml-2">Cage: -</span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </button>
      </div>
    </div>
  );
}

export function QuickLotPicker({
  purpose,
  ...props
}: Omit<LotPickerProps, "filter"> & {
  purpose: "active" | "breeding" | "weaning";
}) {
  const filters = {
    active: { status: ["active"], minQuantity: 1 },
    breeding: { status: ["active"], sex: ["male", "female"] },
    weaning: { status: ["active"], minQuantity: 1 },
  }[purpose];

  return <LotPicker filter={filters} {...props} />;
}
