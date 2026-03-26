import type { ReactNode } from 'react';

import Card from './Card';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <Card className={className}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-2 text-2xl font-bold text-slate-900">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </Card>
  );
}

