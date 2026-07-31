import { createPortal } from 'react-dom';
import { Kbd } from '../ui/kbd';
import { Button } from '../ui/button';

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
  ]],
];

export function ShortcutCheatsheet({ isOpen, onClose }: ShortcutCheatsheetProps) {
  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/30 z-[9998] backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed top-[10%] left-1/2 -translate-x-1/2 z-[9999] w-[480px] max-h-[80vh] bg-popover rounded-xl shadow-xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h2 className="text-sm font-semibold tracking-tight">Keyboard Shortcuts</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></Button>
        </div>
        <div className="p-4 overflow-y-auto space-y-5 flex-1">
          {SHORTCUTS.map(([category, items]) => (
            <div key={category as string}>
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{category as string}</h3>
              <div className="space-y-0.5">
                {(items as string[][]).map(([key, desc]) => (
                  <div key={key} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-accent text-sm transition-colors">
                    <span className="text-muted-foreground text-xs">{desc}</span>
                    <Kbd>{key}</Kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-2.5 border-t border-border text-center text-[11px] text-muted-foreground">
          Press <Kbd className="mx-1">?</Kbd> any time to show this panel
        </div>
      </div>
    </>,
    document.body
  );
}
