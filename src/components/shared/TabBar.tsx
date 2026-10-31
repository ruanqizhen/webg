import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';

// Document tabs, one per open VI. Sits above the UI/Logic view tabs in the
// center column. Double-click a tab to rename it inline.
export function TabBar() {
  const vis = useProjectStore(s => s.vis);
  const activeViId = useProjectStore(s => s.activeViId);
  const { switchVI, createVI, renameVI, closeVI } = useProjectStore.getState();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const commitRename = () => {
    if (editingId) renameVI(editingId, draft);
    setEditingId(null);
  };

  return (
    <div className="flex bg-muted/40 border-b border-border shrink-0 px-2 h-9 items-stretch gap-1 select-none overflow-x-auto">
      {vis.map(vi => {
        const active = vi.id === activeViId;
        return (
          <div
            key={vi.id}
            onClick={() => switchVI(vi.id)}
            onDoubleClick={() => {
              setEditingId(vi.id);
              setDraft(vi.name);
            }}
            title="Double-click to rename"
            className={`relative flex items-center gap-1.5 px-3 text-[13px] cursor-pointer border-b-2 -mb-px whitespace-nowrap ${
              active
                ? 'border-foreground text-foreground bg-background'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {editingId === vi.id ? (
              <input
                autoFocus
                value={draft}
                onClick={e => e.stopPropagation()}
                onChange={e => setDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="w-28 bg-transparent outline-none border-b border-foreground"
              />
            ) : (
              <span>{vi.name}</span>
            )}
            <button
              onClick={e => {
                e.stopPropagation();
                closeVI(vi.id);
              }}
              title={`Close ${vi.name}`}
              className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}

      <button
        onClick={createVI}
        title="New VI"
        className="flex items-center px-2 text-muted-foreground hover:text-foreground"
      >
        <Plus size={15} />
      </button>

      {vis.length === 0 && (
        <span className="flex items-center px-2 text-[13px] text-muted-foreground">
          No VI open — press + to create one
        </span>
      )}
    </div>
  );
}
