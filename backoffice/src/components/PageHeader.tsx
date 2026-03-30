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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

