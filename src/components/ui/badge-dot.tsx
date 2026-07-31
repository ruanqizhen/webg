import { cn } from '@/lib/utils';

type Status = 'idle' | 'running' | 'paused' | 'error' | 'success' | 'warning' | 'info' | 'log';

const statusMap: Record<Status, string> = {
  idle: 'bg-[var(--status-idle)]',
  running: 'bg-[var(--status-running)]',
  paused: 'bg-[var(--status-paused)]',
  error: 'bg-[var(--status-error)]',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
  log: 'bg-muted-foreground/50',
};

export function BadgeDot({ status = 'idle', pulse, className }: { status?: Status; pulse?: boolean; className?: string }) {
  return <span className={cn('inline-block w-2 h-2 rounded-full shrink-0', statusMap[status], pulse && 'animate-pulse', className)} />;
}

export function StatusIndicator({ status, label, pulse }: { status: Status; label: string; pulse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <BadgeDot status={status} pulse={pulse} />
      <span className={status === 'error' ? 'text-destructive font-medium' : ''}>{label}</span>
    </span>
  );
}
