interface DonutItem {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  title: string;
  subtitle?: string;
  items: DonutItem[];
}

function formatPercent(value: number, total: number) {
  if (total === 0) {
    return '0%';
  }

  return `${Math.round((value / total) * 100)}%`;
}

export default function DonutChart({
  title,
  subtitle,
  items,
}: DonutChartProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const segments =
    total === 0
      ? 'conic-gradient(#cbd5e1 0 100%)'
      : (() => {
          let cursor = 0;
          const parts = items.map((item) => {
            const start = cursor;
            const end = cursor + (item.value / total) * 100;
            cursor = end;
            return `${item.color} ${start}% ${end}%`;
          });
          return `conic-gradient(${parts.join(', ')})`;
        })();

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-gray-950">
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </p>
        {subtitle ? (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="relative mx-auto flex h-44 w-44 items-center justify-center">
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: segments }}
          />
          <div className="absolute inset-6 rounded-full bg-white shadow-inner dark:bg-slate-950" />
          <div className="relative text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Total
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {total}
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatPercent(item.value, total)}
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
