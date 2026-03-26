
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function EmptyState({ title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      {subtitle ? (
        <p className="mt-2 text-xs text-slate-400">{subtitle}</p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

