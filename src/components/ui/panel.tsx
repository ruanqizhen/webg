import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function Panel({ className, children, ...props }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col h-full shrink-0 bg-panel border-panel-border', className)} {...props}>
      {children}
    </div>
  );
}

export function PanelHeader({ className, children, ...props }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center h-9 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-panel-header border-b border-panel-border shrink-0 select-none', className)} {...props}>
      {children}
    </div>
  );
}

export function PanelBody({ className, children, ...props }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex-1 overflow-y-auto', className)} {...props}>
      {children}
    </div>
  );
}

export function PanelSection({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">{label}</div>
      {children}
    </div>
  );
}
