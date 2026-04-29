import { useCallback, useEffect, useRef } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

export function useMarkAsRead(collectionName: string) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const scheduleMarkAsRead = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        try {
          const batch = writeBatch(db);
          ids.forEach((id) => batch.update(doc(db, collectionName, id), { isNew: false }));
          await batch.commit();
        } catch (e) {
          console.error(`Failed to mark ${collectionName} as read:`, e);
        }
      }, 2000);
    },
    [collectionName]
  );

  return scheduleMarkAsRead;
}
