
const statusLabels: Record<string, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuve',
  VERIFIED: 'Verifie',
  NEEDS_REVIEW: 'A revoir',
  RESOLVED: 'Traite',
  REJECTED: 'Refuse',
  SUSPENDED: 'Suspendu',
};

const statusStyles: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  VERIFIED: 'bg-emerald-100 text-emerald-700',
  NEEDS_REVIEW: 'bg-amber-100 text-amber-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  SUSPENDED: 'bg-slate-200 text-slate-700',
};

interface StatusBadgeProps {
  status?: string | null;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = (status || 'PENDING').toUpperCase();
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        statusStyles[normalized] || 'bg-slate-100 text-slate-600'
      }`}
    >
      {statusLabels[normalized] || normalized}
    </span>
  );
}

