import api from '../api';

export type OrganizerNotificationType =
  | 'ORGANIZER_BOOKING_CREATED'
  | 'ORGANIZER_EVENT_UPDATED'
  | 'ORGANIZER_COLLABORATOR_UPDATED'
  | 'ORGANIZER_PLACE_CLAIM_REVIEWED'
  | 'ORGANIZER_SYSTEM';

export interface OrganizerNotificationItem {
  id: string;
  type: OrganizerNotificationType | string;
  title: string | null;
  message: string | null;
  severity: 'URGENT' | 'IMPORTANT' | 'INFO' | string;
  targetPath: string | null;
  payload: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    displayName: string | null;
  } | null;
}

export interface OrganizerNotificationsPage {
  items: OrganizerNotificationItem[];
  nextCursor: string | null;
}

interface OrganizerUnreadCountResponse {
  unreadCount: number;
}

export async function fetchOrganizerNotifications(options?: {
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
  urgentOnly?: boolean;
}) {
  const response = await api.get<OrganizerNotificationsPage>(
    '/notifications/organizer/activity',
    {
      params: {
        ...(options?.limit ? { limit: options.limit } : {}),
        ...(options?.cursor ? { cursor: options.cursor } : {}),
        ...(options?.unreadOnly ? { unreadOnly: true } : {}),
        ...(options?.urgentOnly ? { urgentOnly: true } : {}),
      },
    },
  );

  return response.data;
}

export async function fetchOrganizerNotificationsUnreadCount() {
  const response = await api.get<OrganizerUnreadCountResponse>(
    '/notifications/organizer/unread-count',
  );

  return Number(response.data.unreadCount || 0);
}

export async function markOrganizerNotificationsRead() {
  await api.post('/notifications/organizer/mark-read');
}

export async function markOrganizerNotificationRead(notificationId: string) {
  await api.post(`/notifications/organizer/${notificationId}/mark-read`);
}

export async function markOrganizerNotificationsBatchRead(
  notificationIds: string[],
) {
  await api.post('/notifications/organizer/mark-read-batch', {
    ids: notificationIds,
  });
}
