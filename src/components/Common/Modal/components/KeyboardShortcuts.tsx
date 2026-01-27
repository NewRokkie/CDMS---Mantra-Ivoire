import React, { useState, useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcut {
  key: string;
  description: string;
  modifier?: 'ctrl' | 'alt' | 'shift';
}

interface KeyboardShortcutsProps {
  shortcuts?: KeyboardShortcut[];
  showByDefault?: boolean;
}

const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  { key: 'Escape', description: 'Close modal' },
  { key: 'Tab', description: 'Navigate between elements' },
  { key: 'Tab', description: 'Navigate backwards', modifier: 'shift' },
  { key: '↑/↓', description: 'Navigate between focusable elements' },
  { key: 'Home', description: 'Jump to first element' },
  { key: 'End', description: 'Jump to last element' },
  { key: 'Enter/Space', description: 'Activate focused button' }
];

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  shortcuts = DEFAULT_SHORTCUTS,
  showByDefault = false
}) => {
  const [isVisible, setIsVisible] = useState(showByDefault);
  const [showHelp, setShowHelp] = useState(false);

  // Show help on ? key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '?' && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setShowHelp(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isVisible && !showHelp) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 p-2 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors z-[9998]"
        aria-label="Show keyboard shortcuts"
        title="Show keyboard shortcuts (Press ? for help)"
      >
        <Keyboard className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-[9998]">
      {!isVisible && (
        <button
          onClick={() => setIsVisible(true)}
          className="p-2 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors"
          aria-label="Show keyboard shortcuts"
        >
          <Keyboard className="h-4 w-4" />
        </button>
      )}

      {(isVisible || showHelp) && (
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <Keyboard className="h-4 w-4 mr-2" />
              Keyboard Shortcuts
            </h3>
            <button
              onClick={() => {
                setIsVisible(false);
                setShowHelp(false);
              }}
              className="text-gray-400 hover:text-gray-600 p-1"
              aria-label="Close shortcuts help"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{shortcut.description}</span>
                <div className="flex items-center space-x-1">
                  {shortcut.modifier && (
                    <>
                      <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
                        {shortcut.modifier}
                      </kbd>
                      <span className="text-gray-400">+</span>
                    </>
                  )}
                  <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
                    {shortcut.key}
                  </kbd>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
            Press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono">?</kbd> to toggle this help
          </div>
        </div>
      )}
    </div>
  );
};