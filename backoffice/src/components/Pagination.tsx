
interface PaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export default function Pagination({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = clamp(currentPage, 1, totalPages);

  if (totalPages <= 1) {
    return null;
  }

  const windowSize = 5;
  const half = Math.floor(windowSize / 2);
  const start = clamp(safePage - half, 1, Math.max(1, totalPages - windowSize + 1));
  const pages = Array.from(
    { length: Math.min(windowSize, totalPages) },
    (_, index) => start + index,
  );

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <p className="text-center text-xs text-slate-400 sm:text-left">
        Page {safePage} / {totalPages}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
        <button
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Prec
        </button>
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              page === safePage
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Suiv
        </button>
      </div>
    </div>
  );
}

