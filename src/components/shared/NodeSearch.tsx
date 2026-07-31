import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useGraphStore } from '../../store/useGraphStore';
import { NodeRegistry } from '../../engine/registry';
import { Kbd } from '../ui/kbd';

interface NodeSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onFocusNode: (nodeId: string) => void;
}

export function NodeSearch({ isOpen, onClose, onFocusNode }: NodeSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const nodes = useGraphStore((s) => s.nodes);

  const results = query
    ? nodes.filter((n) => {
        const label = NodeRegistry[n.type]?.label || n.type;
        const searchText = `${label} ${n.type} ${n.id}`.toLowerCase();
        return searchText.includes(query.toLowerCase());
      })
    : [];

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, results.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) { onFocusNode(results[selectedIndex].id); onClose(); }
      } else if (e.key === 'Escape') onClose();
    },
    [results, selectedIndex, onFocusNode, onClose]
  );

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 z-[9999] w-[420px] bg-popover rounded-xl shadow-xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} placeholder="Search nodes by name or type..." className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground" />
          <Kbd>Esc</Kbd>
        </div>

        {results.length > 0 ? (
          <div className="max-h-64 overflow-y-auto p-1">
            {results.map((node, i) => {
              const def = NodeRegistry[node.type];
              const label = def?.label || node.type;
              return (
                <button key={node.id} className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2.5 transition-colors ${i === selectedIndex ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50'}`} onClick={() => { onFocusNode(node.id); onClose(); }} onMouseEnter={() => setSelectedIndex(i)}>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">{node.type.split('.')[0]}</span>
                  <span className="flex-1 truncate text-xs font-medium">{label}</span>
                  <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[80px]">{node.id.slice(0, 8)}</span>
                </button>
              );
            })}
          </div>
        ) : query ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No nodes found for "{query}"</div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Type to search {nodes.length} nodes</div>
        )}
      </div>
    </>,
    document.body
  );
}
