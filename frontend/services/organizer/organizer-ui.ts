export type OrganizerEventPhase = 'upcoming' | 'live' | 'past';

export interface OrganizerStatusTone {
  bg: string;
  text: string;
  iconColor: string;
  icon:
    | 'checkmark-circle-outline'
    | 'time-outline'
    | 'close-circle-outline'
    | 'help-circle-outline';
}

export function formatOrganizerDateTime(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getOrganizerEventPhase(
  startTime: string,
  endTime?: string | null,
): OrganizerEventPhase {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : Number.NaN;

  if (Number.isFinite(start) && start > now) {
    return 'upcoming';
  }

  if (Number.isFinite(end) && end < now) {
    return 'past';
  }

  return 'live';
}

export function getOrganizerEventPhaseWeight(phase: OrganizerEventPhase) {
  if (phase === 'upcoming') {
    return 0;
  }

  if (phase === 'live') {
    return 1;
  }

  return 2;
}

export function getOrganizerStatusTone(status: string): OrganizerStatusTone {
  if (status === 'APPROVED') {
    return {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      iconColor: '#047857',
      icon: 'checkmark-circle-outline',
    };
  }

  if (status === 'PENDING') {
    return {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      iconColor: '#b45309',
      icon: 'time-outline',
    };
  }

  if (status === 'REJECTED' || status === 'SUSPENDED') {
    return {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      iconColor: '#b91c1c',
      icon: 'close-circle-outline',
    };
  }

  return {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
    iconColor: '#6b7280',
    icon: 'help-circle-outline',
  };
}