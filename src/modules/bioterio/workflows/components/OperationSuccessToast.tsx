/**
 * Operation Success Toast Component
 * 
 * Brief success notification after workflow completion.
 */

import React, { useEffect } from 'react';

export interface OperationSuccessToastProps {
  message: string;
  action?: string;
  onUndo?: () => void;
  duration?: number;
  onClose: () => void;
}

export function OperationSuccessToast({
  message,
  action,
  onUndo,
  duration = 3000,
  onClose,
}: OperationSuccessToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 touch-target-large">
      <span className="text-xl">✅</span>
      <span>{message}</span>
      {onUndo && action && (
        <>
          <span className="text-green-200">|</span>
          <button
            onClick={onUndo}
            className="text-sm underline hover:text-green-100"
          >
            Undo {action}
          </button>
        </>
      )}
    </div>
  );
}
