interface TrendChartSeries {
  key: string;
  label: string;
  color: string;
}

interface TrendChartPoint {
  label: string;
  [key: string]: string | number;
}

interface TrendChartProps {
  title: string;
  subtitle?: string;
  data: TrendChartPoint[];
  series: TrendChartSeries[];
}

const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 320;
const PADDING_TOP = 24;
const PADDING_RIGHT = 24;
const PADDING_BOTTOM = 42;
const PADDING_LEFT = 48;

function toNumber(value: string | number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export default function TrendChart({
  title,
  subtitle,
  data,
  series,
}: TrendChartProps) {
  const normalizedSeries = series.filter((item) => item.key.trim().length > 0);
  const values = data.flatMap((point) =>
    normalizedSeries.map((item) => toNumber(point[item.key])),
  );
  const maxValue = Math.max(1, ...values);
  const plotWidth = VIEW_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = VIEW_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const safeDenominator = Math.max(data.length - 1, 1);
  const yTicks = 4;

  const yAxisTicks = Array.from({ length: yTicks + 1 }, (_, index) => {
    const ratio = index / yTicks;
    const value = Math.round(maxValue * (1 - ratio));
    const y = PADDING_TOP + plotHeight * ratio;

    return {
      value,
      y,
    };
  });

  const xPositions = data.map((point, index) => {
    const x =
      PADDING_LEFT + (plotWidth * (data.length === 1 ? 0.5 : index)) / safeDenominator;
    return {
      x,
      label: point.label,
    };
  });
  const labelStep = Math.max(1, Math.ceil(data.length / 8));

  const paths = normalizedSeries.map((item) => {
    const points = data.map((point, index) => {
      const value = toNumber(point[item.key]);
      const x =
        PADDING_LEFT + (plotWidth * (data.length === 1 ? 0.5 : index)) / safeDenominator;
      const y = PADDING_TOP + plotHeight - (value / maxValue) * plotHeight;
      return `${x},${y}`;
    });

    const d = points.length > 0 ? `M ${points.join(' L ')}` : '';

    return {
      ...item,
      d,
      points,
    };
  });

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-gray-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
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
        <div className="flex flex-wrap items-center gap-2">
          {normalizedSeries.map((item) => (
            <span
              key={item.key}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/70">
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          className="h-72 w-full text-slate-300 dark:text-slate-700"
          role="img"
          aria-label={title}
        >
          <defs>
            {normalizedSeries.map((item) => (
              <linearGradient
                key={item.key}
                id={`gradient-${item.key}`}
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor={item.color} stopOpacity="0.32" />
                <stop offset="100%" stopColor={item.color} stopOpacity="0.02" />
              </linearGradient>
            ))}
          </defs>

          {yAxisTicks.map((tick) => (
            <g key={tick.y}>
              <line
                x1={PADDING_LEFT}
                x2={VIEW_WIDTH - PADDING_RIGHT}
                y1={tick.y}
                y2={tick.y}
                stroke="currentColor"
                strokeOpacity="0.08"
                strokeWidth="1"
              />
              <text
                x={PADDING_LEFT - 10}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[11px] dark:fill-slate-500"
              >
                {tick.value}
              </text>
            </g>
          ))}

          {paths.map((item) => (
            <g key={item.key}>
              {item.d ? (
                <path
                  d={`${item.d} L ${xPositions.at(-1)?.x ?? PADDING_LEFT},${VIEW_HEIGHT - PADDING_BOTTOM} L ${xPositions[0]?.x ?? PADDING_LEFT},${VIEW_HEIGHT - PADDING_BOTTOM} Z`}
                  fill={`url(#gradient-${item.key})`}
                />
              ) : null}
              {item.d ? (
                <path
                  d={item.d}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
              {data.map((point, index) => {
                const value = toNumber(point[item.key]);
                const x =
                  PADDING_LEFT +
                  (plotWidth * (data.length === 1 ? 0.5 : index)) / safeDenominator;
                const y = PADDING_TOP + plotHeight - (value / maxValue) * plotHeight;
                return (
                  <circle
                    key={`${item.key}-${index}`}
                    cx={x}
                    cy={y}
                    r="4.5"
                    fill={item.color}
                    stroke="white"
                    strokeWidth="2"
                  />
                );
              })}
            </g>
          ))}

          {xPositions.map((point, index) => {
            const shouldShowLabel =
              index === 0 ||
              index === xPositions.length - 1 ||
              index % labelStep === 0;

            return shouldShowLabel ? (
              <text
                key={`${point.label}-${index}`}
                x={point.x}
                y={VIEW_HEIGHT - 18}
                textAnchor="middle"
                className="fill-slate-400 text-[11px] dark:fill-slate-500"
              >
                {point.label}
              </text>
            ) : null;
          })}
        </svg>
      </div>
    </div>
  );
}
