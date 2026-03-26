import React from 'react';

interface SectionTitleProps {
  label: string;
  subtitle?: string;
}

export default function SectionTitle({ label, subtitle }: SectionTitleProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
        {label}
      </p>
      {subtitle ? (
        <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      ) : null}
    </div>
  );
}
