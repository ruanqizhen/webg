import { useRef, useEffect } from 'react';
import { useLogStore } from '../../store/useLogStore';
import { X, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { PanelHeader } from '../ui/panel';
import { BadgeDot } from '../ui/badge-dot';

export function OutputConsole() {
  const { logs, isVisible, clearLogs, setVisible } = useLogStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs.length]);

  if (!isVisible) return null;

  return (
    <div className="border-t border-panel-border bg-panel flex flex-col shrink-0 h-[160px]">
      <PanelHeader className="h-8 justify-between px-3">
        <span className="flex items-center gap-2">
          Output Console
          <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full bg-muted text-[10px] font-mono text-muted-foreground">{logs.length}</span>
        </span>
        <span className="flex items-center gap-0.5">
          <Button size="sm" variant="ghost" onClick={clearLogs} className="h-6 w-6 p-0" title="Clear"><Trash2 size={12} /></Button>
          <Button size="sm" variant="ghost" onClick={() => setVisible(false)} className="h-6 w-6 p-0" title="Close"><X size={12} /></Button>
        </span>
      </PanelHeader>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 py-1.5 font-mono text-[12px] leading-6 bg-card/50">
        {logs.length === 0 ? (
          <div className="text-muted-foreground text-xs text-center py-8">Run the graph to see output here. Connect nodes to <span className="font-semibold text-foreground">Console Log</span> or <span className="font-semibold text-foreground">Display</span>.</div>
        ) : (
          logs.map((entry) => (
            <div key={entry.id} className="flex items-start gap-2 py-0.5 hover:bg-accent/50 rounded px-1">
              <BadgeDot status={entry.type as any} className="mt-1.5" />
              <span className="text-muted-foreground/60 shrink-0 w-[52px] text-right tabular-nums text-[11px]">{new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false })}</span>
              {entry.nodeLabel && <span className="shrink-0 bg-muted px-1.5 py-0 rounded text-[10px] text-muted-foreground">{entry.nodeLabel}</span>}
              <span className={`${entry.type === 'error' ? 'text-destructive' : entry.type === 'warn' ? 'text-amber-600 dark:text-amber-400' : entry.type === 'info' ? 'text-sky-600 dark:text-sky-400' : 'text-foreground/80'} break-all`}>{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
