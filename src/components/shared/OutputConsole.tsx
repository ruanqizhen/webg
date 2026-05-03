import { useRef, useEffect } from 'react';
import { useLogStore } from '../../store/useLogStore';
import { X, Trash2, ChevronDown } from 'lucide-react';

export function OutputConsole() {
  const { logs, isVisible, clearLogs, setVisible } = useLogStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  if (!isVisible) return null;

  const typeStyle: Record<string, string> = {
    log: 'text-gray-700 dark:text-gray-300',
    error: 'text-red-600 dark:text-red-400',
    warn: 'text-yellow-600 dark:text-yellow-400',
    info: 'text-blue-600 dark:text-blue-400',
  };

  const typeIcon: Record<string, string> = {
    log: 'i',
    error: '!',
    warn: '▲',
    info: '▶',
  };

  const typeBadge: Record<string, string> = {
    log: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    error: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    warn: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    info: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col shrink-0" style={{ height: 160 }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-850 shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          <ChevronDown size={12} />
          Output Console
          <span className="text-gray-300 dark:text-gray-600 font-normal">({logs.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearLogs}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Clear console"
          >
            <Trash2 size={12} />
          </button>
          <button
            onClick={() => setVisible(false)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Close console"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-1.5 font-mono text-[11px] leading-relaxed bg-gray-50/50 dark:bg-gray-950/50">
        {logs.length === 0 ? (
          <div className="text-gray-300 dark:text-gray-600 italic text-center py-4">
            Run the graph to see output here. Connect nodes to <span className="font-semibold">Console Log</span> or <span className="font-semibold">Display</span>.
          </div>
        ) : (
          logs.map((entry) => (
            <div key={entry.id} className="flex items-start gap-2 py-0.5 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded px-1 group">
              <span className={`shrink-0 mt-0.5 text-[9px] font-bold w-4 text-center ${typeBadge[entry.type]} rounded-full`}>
                {typeIcon[entry.type]}
              </span>
              <span className="text-gray-300 dark:text-gray-600 shrink-0 w-12 text-right tabular-nums">
                {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false })}
              </span>
              {entry.nodeLabel && (
                <span className="text-gray-400 dark:text-gray-500 shrink-0 bg-gray-100 dark:bg-gray-800 px-1 rounded text-[10px]">
                  {entry.nodeLabel}
                </span>
              )}
              <span className={`${typeStyle[entry.type]} break-all`}>
                {entry.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
