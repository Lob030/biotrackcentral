/**
 * Operational Confirm Dialog Primitive
 * 
 * Simple confirmation dialog for operational actions.
 * Shows action summary and requires explicit confirmation.
 */

import React from 'react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger' | 'warning';
  details?: Array<{ label: string; value: string | number }>;
}

export function OperationalConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  details,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantClasses = {
    default: {
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      icon: '🔵',
    },
    danger: {
      button: 'bg-red-600 hover:bg-red-700 text-white',
      icon: '⚠️',
    },
    warning: {
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      icon: '⚡',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 touch-target-large"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center gap-3">
          <span className="text-2xl">{variantClasses[variant].icon}</span>
          <h2 id="dialog-title" className="text-lg font-semibold text-gray-800">
            {title}
          </h2>
        </div>

        {/* Content */}
        <div className="p-4">
          {description && (
            <p className="text-gray-600 mb-4">{description}</p>
          )}

          {details && details.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              {details.map((detail, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-500">{detail.label}</span>
                  <span className="font-medium text-gray-800">{detail.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 border rounded-lg hover:bg-gray-50 text-gray-700 touch-target-large"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-3 px-4 rounded-lg touch-target-large ${variantClasses[variant].button}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Quick confirmation for destructive actions
 */
export function DestructiveConfirmDialog(props: Omit<ConfirmDialogProps, 'variant'>) {
  return <OperationalConfirmDialog {...props} variant="danger" confirmLabel="Yes, Proceed" />;
}

/**
 * Quick confirmation for warnings
 */
export function WarningConfirmDialog(props: Omit<ConfirmDialogProps, 'variant'>) {
  return <OperationalConfirmDialog {...props} variant="warning" confirmLabel="Proceed" />;
}
