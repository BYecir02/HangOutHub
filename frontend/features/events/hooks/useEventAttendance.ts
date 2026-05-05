import { useCallback, useEffect, useState } from 'react';
import {
  attendEvent,
  unattendEvent,
  getEventAttendance,
  getEventFriendsAttending,
  type FriendAttendee,
} from '@/services/social/activity';

export function useEventAttendance(eventId: string | undefined) {
  const [isAttending, setIsAttending] = useState(false);
  const [attendingLoading, setAttendingLoading] = useState(false);
  const [friendsAttending, setFriendsAttending] = useState<FriendAttendee[]>([]);

  useEffect(() => {
    if (!eventId) return;

    void getEventAttendance(eventId).then(setIsAttending);
    void getEventFriendsAttending(eventId).then(setFriendsAttending);
  }, [eventId]);

  const handleToggleAttend = useCallback(async () => {
    if (!eventId || attendingLoading) return;

    const previous = isAttending;
    setIsAttending(!previous);
    setAttendingLoading(true);

    try {
      if (previous) {
        await unattendEvent(eventId);
      } else {
        await attendEvent(eventId);
      }
    } catch {
      setIsAttending(previous);
    } finally {
      setAttendingLoading(false);
    }
  }, [eventId, isAttending, attendingLoading]);

  return { isAttending, attendingLoading, friendsAttending, handleToggleAttend };
}
