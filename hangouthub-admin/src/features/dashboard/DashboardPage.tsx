import { ArrowRight, Building2, Flag, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Card, CardContent, PageHeader, Spinner } from '@/components/ui';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useAuth } from '@/features/auth/useAuth';
import { useOrganizers } from '@/features/organizers/useOrganizers';
import { usePlaceClaims } from '@/features/place-claims/usePlaceClaims';
import { useReports } from '@/features/reports/useReports';

function countPending<T>(
  list: T[] | undefined,
  getStatus: (item: T) => string | null | undefined,
): number {
  return (list ?? []).filter(
    (item) => (getStatus(item) ?? 'PENDING').toUpperCase() === 'PENDING',
  ).length;
}

interface StatCardData {
  to: string;
  label: string;
  icon: LucideIcon;
  value: number;
  loading: boolean;
}

export function DashboardPage() {
  useDocumentTitle('Tableau de bord');
  const { user } = useAuth();
  const organizers = useOrganizers();
  const claims = usePlaceClaims();
  const reports = useReports();

  const cards: StatCardData[] = [
    {
      to: '/organizers',
      label: 'Organisateurs en attente',
      icon: ShieldCheck,
      value: countPending(organizers.data, (o) => o.organizer?.status),
      loading: organizers.isLoading,
    },
    {
      to: '/place-claims',
      label: 'Revendications à vérifier',
      icon: Building2,
      value: countPending(claims.data, (c) => c.status),
      loading: claims.isLoading,
    },
    {
      to: '/reports',
      label: 'Signalements à traiter',
      icon: Flag,
      value: countPending(reports.data, (r) => r.status),
      loading: reports.isLoading,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bonjour, ${user?.username ?? 'admin'} 👋`}
        description="Vue d'ensemble des actions de modération en attente."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.to} to={card.to} className="block">
            <Card className="transition-colors hover:border-primary/40">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <card.icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <div className="mt-0.5 text-2xl font-semibold">
                    {card.loading ? <Spinner className="h-5 w-5" /> : card.value}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
