/**
 * Quick Actions Component
 * 
 * Provides fast access to common operational workflows.
 * Supports keyboard shortcuts and mobile-friendly touch targets.
 */

import React, { useEffect, useCallback } from 'react';
import { QuickActionDef } from '../types';

interface QuickActionsProps {
  actions: QuickActionDef[];
  onTrigger: (actionId: string) => void;
  compact?: boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  actions,
  onTrigger,
  compact = false,
}) => {
  // Register keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl/Cmd + shortcut
      if (!event.ctrlKey && !event.metaKey) return;

      const key = event.key.toLowerCase();
      const action = actions.find(a => {
        if (!a.shortcut) return false;
        const shortcutKey = a.shortcut.split('+').pop()?.toLowerCase();
        return shortcutKey === key;
      });

      if (action) {
        event.preventDefault();
        onTrigger(action.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions, onTrigger]);

  if (compact) {
    return (
      <div style={styles.compactContainer}>
        {actions.slice(0, 3).map((action) => (
          <button
            key={action.id}
            onClick={() => onTrigger(action.id)}
            style={styles.compactButton}
            title={`${action.label}${action.shortcut ? ` (${action.shortcut})` : ''}`}
            aria-label={action.label}
          >
            <span style={styles.compactIcon}>{getIconForAction(action.icon)}</span>
          </button>
        ))}
      </div>
    );
  }

  // Group actions by category
  const grouped = actions.reduce((acc, action) => {
    if (!acc[action.category]) {
      acc[action.category] = [];
    }
    acc[action.category].push(action);
    return acc;
  }, {} as Record<string, typeof actions>);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Quick Actions</h2>
      <div style={styles.grid}>
        {actions.map((action) => (
          <ActionButton
            key={action.id}
            action={action}
            onClick={() => onTrigger(action.id)}
          />
        ))}
      </div>
      {actions.some(a => a.shortcut) && (
        <div style={styles.hint}>
          💡 Tip: Use keyboard shortcuts for faster operations
        </div>
      )}
    </div>
  );
};

interface ActionButtonProps {
  action: QuickActionDef;
  onClick: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ action, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.actionButton,
        opacity: action.enabled ? 1 : 0.5,
      }}
      disabled={!action.enabled}
      aria-label={action.label}
      title={`${action.label}${action.shortcut ? ` (${action.shortcut})` : ''}`}
    >
      <div style={styles.actionIcon}>{getIconForAction(action.icon)}</div>
      <div style={styles.actionLabel}>{action.label}</div>
      {action.shortcut && (
        <div style={styles.actionShortcut}>{formatShortcut(action.shortcut)}</div>
      )}
    </button>
  );
};

/**
 * Map icon identifiers to emoji or unicode symbols
 * In production, this would use an icon library
 */
function getIconForAction(iconName: string): string {
  const iconMap: Record<string, string> = {
    'plus-circle': '➕',
    'arrow-right': '➡️',
    'split': '🔀',
    'alert-triangle': '⚠️',
    'users': '👥',
    'trash': '🗑️',
    'edit': '✏️',
    'check': '✅',
    'x': '❌',
    'search': '🔍',
    'filter': '🔬',
    'home': '🏠',
    'settings': '⚙️',
  };
  return iconMap[iconName] || '📌';
}

/**
 * Format keyboard shortcut for display
 */
function formatShortcut(shortcut: string): string {
  return shortcut
    .replace('Ctrl', '⌃')
    .replace('Cmd', '⌘')
    .replace('Shift', '⇧')
    .replace('Alt', '⌥')
    .replace('+', '');
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '16px',
    color: '#1f2937',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '12px',
  },
  actionButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '20px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    minHeight: '100px', // Mobile-friendly touch target
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  actionIcon: {
    fontSize: '28px',
  },
  actionLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#1f2937',
    textAlign: 'center',
  },
  actionShortcut: {
    fontSize: '11px',
    color: '#9ca3af',
    marginTop: '2px',
  },
  hint: {
    marginTop: '16px',
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'center',
  },
  compactContainer: {
    display: 'flex',
    gap: '8px',
  },
  compactButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '44px',
    height: '44px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  compactIcon: {
    fontSize: '20px',
  },
};
