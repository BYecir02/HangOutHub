
interface SectionTitleProps {
  label?: string;
  subtitle?: string;
}

export default function SectionTitle({ label, subtitle }: SectionTitleProps) {
  return (
    <div className="mb-4">
      {label ? (
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
          {label}
        </p>
      ) : null}
      {subtitle ? (
        <p className={label ? 'mt-2 text-sm text-slate-500' : 'text-sm text-slate-500'}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

