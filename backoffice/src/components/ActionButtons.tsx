
interface ActionButtonsProps {
  onApprove: () => void;
  onReject: () => void;
  onSuspend: () => void;
  disabled?: boolean;
}

export default function ActionButtons({
  onApprove,
  onReject,
  onSuspend,
  disabled = false,
}: ActionButtonsProps) {
  return (
    <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
      <button
        onClick={onApprove}
        disabled={disabled}
        className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
      >
        Approuver
      </button>
      <button
        onClick={onReject}
        disabled={disabled}
        className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
      >
        Refuser
      </button>
      <button
        onClick={onSuspend}
        disabled={disabled}
        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
      >
        Suspendre
      </button>
    </div>
  );
}

