import { Badge, type BadgeTone } from './Badge';

/** Mapping centralisé des statuts métier -> apparence cohérente. */
const STATUS_MAP: Record<string, { tone: BadgeTone; label: string }> = {
  PENDING: { tone: 'warning', label: 'En attente' },
  APPROVED: { tone: 'success', label: 'Approuvé' },
  REJECTED: { tone: 'destructive', label: 'Rejeté' },
  SUSPENDED: { tone: 'destructive', label: 'Suspendu' },
  RESOLVED: { tone: 'success', label: 'Résolu' },
  DISMISSED: { tone: 'neutral', label: 'Classé' },
  ACTIVE: { tone: 'success', label: 'Actif' },
};

export function StatusBadge({ status }: { status?: string | null }) {
  const key = (status || '').toUpperCase();
  const config = STATUS_MAP[key] ?? {
    tone: 'neutral' as BadgeTone,
    label: status || '—',
  };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
