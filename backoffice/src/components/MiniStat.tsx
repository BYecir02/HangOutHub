
interface MiniStatProps {
  label: string;
  value: string | number;
}

export default function MiniStat({ label, value }: MiniStatProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-3 sm:px-4">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}

