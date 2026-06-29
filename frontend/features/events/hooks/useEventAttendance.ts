import { useCallback, useEffect, useState } from 'react';
import { haptics } from '@/services/shared/haptics';
import {
  attendEvent,
  unattendEvent,
  getEventAttendance,
  getEventFriendsAttending,
  getEventAttendeesPreview,
  type EventAttendeesPreview,
  type FriendAttendee,
} from '@/services/social/activity';

export function useEventAttendance(eventId: string | undefined) {
  const [isAttending, setIsAttending] = useState(false);
  const [attendingLoading, setAttendingLoading] = useState(false);
  const [friendsAttending, setFriendsAttending] = useState<FriendAttendee[]>([]);
  const [attendeesPreview, setAttendeesPreview] = useState<EventAttendeesPreview>({
    count: 0,
    attendees: [],
  });

  useEffect(() => {
    if (!eventId) return;

    void getEventAttendance(eventId).then(setIsAttending);
    void getEventFriendsAttending(eventId).then(setFriendsAttending);
    void getEventAttendeesPreview(eventId).then(setAttendeesPreview);
  }, [eventId]);

  const handleToggleAttend = useCallback(async () => {
    if (!eventId || attendingLoading) return;

    const previous = isAttending;
    setIsAttending(!previous);
    setAttendingLoading(true);
    // Retour haptique a l'engagement (s'inscrire = plus marque que se retirer).
    if (previous) {
      haptics.light();
    } else {
      haptics.success();
    }

    try {
      if (previous) {
        await unattendEvent(eventId);
      } else {
        await attendEvent(eventId);
      }
    } catch {
      setIsAttending(previous);
      haptics.error();
    } finally {
      setAttendingLoading(false);
    }
  }, [eventId, isAttending, attendingLoading]);

  return {
    isAttending,
    attendingLoading,
    friendsAttending,
    attendeesPreview,
    handleToggleAttend,
  };
}
