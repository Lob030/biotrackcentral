/**
 * Command Palette Primitive
 * 
 * Keyboard-driven quick command access.
 * Activated via Cmd+K or Ctrl+K.
 */

import React, { useState, useCallback, useEffect } from 'react';

export interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
  icon?: string;
  category?: string;
  action: () => void;
}

export interface CommandPaletteProps {
  commands: CommandItem[];
  isOpen: boolean;
  onClose: () => void;
  placeholder?: string;
}

export function CommandPalette({
  commands,
  isOpen,
  onClose,
  placeholder = 'Type a command...',
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter commands based on search
  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        e.preventDefault();
        filteredCommands[selectedIndex].action();
        onClose();
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [filteredCommands, selectedIndex, onClose]
  );

  // Reset search and selection when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle would be handled by parent
      }
    };

    document.addEventListener('keydown', handleGlobalKey);
    return () => document.removeEventListener('keydown', handleGlobalKey);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Palette */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Search input */}
        <div className="p-4 border-b">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full text-lg px-3 py-2 outline-none"
            autoFocus
          />
        </div>

        {/* Commands list */}
        <div className="max-h-96 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No commands found</div>
          ) : (
            <ul>
              {filteredCommands.map((cmd, index) => (
                <li key={cmd.id}>
                  <button
                    onClick={() => {
                      cmd.action();
                      onClose();
                    }}
                    className={`w-full p-3 flex items-center gap-3 hover:bg-blue-50 ${
                      index === selectedIndex ? 'bg-blue-50' : ''
                    }`}
                  >
                    {cmd.icon && <span className="text-xl">{cmd.icon}</span>}
                    <div className="flex-1 text-left">
                      <div className="font-medium">{cmd.label}</div>
                      {cmd.category && (
                        <div className="text-xs text-gray-400">{cmd.category}</div>
                      )}
                    </div>
                    {cmd.shortcut && (
                      <kbd className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Quick workflow commands for bioterio operations
 */
export function useBioterioCommands(workflowActions: Record<string, () => void>) {
  const commands: CommandItem[] = [
    {
      id: 'create-lot',
      label: 'Create Lot',
      icon: '📦',
      shortcut: 'C L',
      category: 'Lots',
      action: workflowActions.createLot || (() => {}),
    },
    {
      id: 'subdivide-lot',
      label: 'Subdivide Lot',
      icon: '✂️',
      shortcut: 'S L',
      category: 'Lots',
      action: workflowActions.subdivideLot || (() => {}),
    },
    {
      id: 'register-mortality',
      label: 'Register Mortality',
      icon: '⚠️',
      shortcut: 'R M',
      category: 'Operations',
      action: workflowActions.registerMortality || (() => {}),
    },
    {
      id: 'create-breeding-group',
      label: 'Create Breeding Group',
      icon: '🐭',
      shortcut: 'C B',
      category: 'Breeding',
      action: workflowActions.createBreedingGroup || (() => {}),
    },
    {
      id: 'register-litter',
      label: 'Register Litter',
      icon: '🍼',
      shortcut: 'R L',
      category: 'Breeding',
      action: workflowActions.registerLitter || (() => {}),
    },
    {
      id: 'register-weaning',
      label: 'Register Weaning',
      icon: '🎯',
      shortcut: 'R W',
      category: 'Breeding',
      action: workflowActions.registerWeaning || (() => {}),
    },
  ];

  return commands;
}
