import {
  Building2,
  CalendarDays,
  Flag,
  LayoutDashboard,
  MapPin,
  ShieldCheck,
  Tags,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

/** Navigation latérale — modération (files) + gestion de contenu. */
export const navGroups: NavGroup[] = [
  {
    items: [
      { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: 'Modération',
    items: [
      { to: '/organizers', label: 'Organisateurs', icon: ShieldCheck },
      { to: '/place-claims', label: 'Revendications', icon: Building2 },
      { to: '/reports', label: 'Signalements', icon: Flag },
    ],
  },
  {
    label: 'Contenu',
    items: [
      { to: '/places', label: 'Lieux', icon: MapPin },
      { to: '/events', label: 'Événements', icon: CalendarDays },
      { to: '/taxonomy', label: 'Catégories & Tags', icon: Tags },
    ],
  },
  {
    label: 'Gestion',
    items: [{ to: '/users', label: 'Utilisateurs', icon: Users }],
  },
];
