import { createPortal } from 'react-dom';

interface ShortcutCheatsheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  ['Editing', [
    ['Ctrl+Z', 'Undo'],
    ['Ctrl+Shift+Z / Ctrl+Y', 'Redo'],
    ['Ctrl+C', 'Copy selected node(s)'],
    ['Ctrl+V', 'Paste node(s)'],
    ['Ctrl+A', 'Select all nodes'],
    ['Delete / Backspace', 'Delete selected'],
    ['Ctrl+Drag', 'Duplicate node'],
    ['Shift+Click', 'Multi-select nodes'],
  ]],
  ['Navigation', [
    ['Ctrl+0 / Ctrl+=', 'Zoom to fit'],
    ['Ctrl+F / Ctrl+P', 'Search nodes'],
    ['Scroll', 'Zoom in/out'],
    ['Middle-drag', 'Pan canvas'],
  ]],
  ['Execution', [
    ['Run (toolbar)', 'Execute graph'],
    ['Step (toolbar)', 'Step-through debug'],
    ['Stop (toolbar)', 'Abort execution'],
  ]],
  ['General', [
    ['Escape', 'Deselect all'],
    ['?', 'Show this cheatsheet'],
    ['Ctrl+S', 'Save (browser)'],
  ]],
];

export function ShortcutCheatsheet({ isOpen, onClose }: ShortcutCheatsheetProps) {
  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/30 z-[9998]" onClick={onClose} />
      <div className="fixed top-[10%] left-1/2 -translate-x-1/2 z-[9999] w-[520px] max-h-[80vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-200">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-5">
          {SHORTCUTS.map(([category, items]) => (
            <div key={category as string}>
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                {category as string}
              </h3>
              <div className="space-y-1">
                {(items as string[][]).map(([key, desc]) => (
                  <div key={key} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-750 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{desc}</span>
                    <kbd className="text-[11px] font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-center text-[11px] text-gray-400 dark:text-gray-500">
          Press <kbd className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">?</kbd> any time to show this panel
        </div>
      </div>
    </>,
    document.body
  );
}
