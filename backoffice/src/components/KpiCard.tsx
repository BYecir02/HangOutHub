
type Tone = 'brand' | 'slate' | 'rose' | 'emerald';

const toneStyles: Record<Tone, { box: string; label: string; value: string; hint: string }> = {
  brand: {
    box: 'bg-brand-50',
    label: 'text-brand-400',
    value: 'text-brand-700',
    hint: 'text-brand-500',
  },
  slate: {
    box: 'bg-slate-50',
    label: 'text-slate-400',
    value: 'text-slate-700',
    hint: 'text-slate-500',
  },
  rose: {
    box: 'bg-rose-50',
    label: 'text-rose-400',
    value: 'text-rose-700',
    hint: 'text-rose-500',
  },
  emerald: {
    box: 'bg-emerald-50',
    label: 'text-emerald-400',
    value: 'text-emerald-700',
    hint: 'text-emerald-500',
  },
};

interface KpiCardProps {
  label: string;
  value: string | number;
  hint: string;
  tone?: Tone;
}

export default function KpiCard({ label, value, hint, tone = 'slate' }: KpiCardProps) {
  const styles = toneStyles[tone];
  return (
    <div className={`rounded-2xl p-6 ${styles.box}`}>
      <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${styles.label}`}>
        {label}
      </p>
      <p className={`mt-3 text-4xl font-bold ${styles.value}`}>{value}</p>
      <p className={`mt-2 text-sm ${styles.hint}`}>{hint}</p>
    </div>
  );
}

