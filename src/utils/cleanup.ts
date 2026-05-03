import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';

export async function cleanupAnnouncements() {
  try {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // 1. Cleanup old announcements and their reads
    const annQ = query(collection(db, 'announcements'), where('createdAt', '<', threeDaysAgo));
    const annSnap = await getDocs(annQ);

    for (const annDoc of annSnap.docs) {
      const annId = annDoc.id;
      const readsQ = query(
        collection(db, 'announcement_reads'),
        where('announcementId', '==', annId)
      );
      const readsSnap = await getDocs(readsQ);
      for (const readDoc of readsSnap.docs) {
        await deleteDoc(doc(db, 'announcement_reads', readDoc.id)).catch(() => {});
      }
      await deleteDoc(doc(db, 'announcements', annId)).catch(() => {});
    }

    // 2. Cleanup orphaned reads (older than 14 days)
    // This catches reads from announcements that were deleted manually or via console
    const orphanedQ = query(
      collection(db, 'announcement_reads'),
      where('confirmedAt', '<', fourteenDaysAgo)
    );
    const orphanedSnap = await getDocs(orphanedQ);
    for (const readDoc of orphanedSnap.docs) {
      await deleteDoc(doc(db, 'announcement_reads', readDoc.id)).catch(() => {});
    }

    if (annSnap.size > 0 || orphanedSnap.size > 0) {
      console.log(
        `Cleanup: removed ${annSnap.size} announcements and ${orphanedSnap.size} orphaned reads.`
      );
    }
  } catch (error) {
    console.error('Announcements cleanup error:', error);
  }
}

export async function cleanupReminders() {
  try {
    const q = query(collection(db, 'reminders'), where('done', '==', true));
    const snapshot = await getDocs(q);
    for (const rDoc of snapshot.docs) {
      await deleteDoc(doc(db, 'reminders', rDoc.id)).catch(() => {});
    }
    if (snapshot.size > 0) {
      console.log(`Cleanup: removed ${snapshot.size} completed reminders.`);
    }
  } catch (error) {
    console.error('Reminders cleanup error:', error);
  }
}

export async function cleanupReports() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const q = query(collection(db, 'reports'), where('createdAt', '<', sevenDaysAgo));
    const snapshot = await getDocs(q);

    for (const rDoc of snapshot.docs) {
      const data = rDoc.data();
      if (data.media && Array.isArray(data.media)) {
        for (const item of data.media) {
          try {
            await deleteObject(ref(storage, item.path)).catch(() => {});
          } catch (e) {}
        }
      }
      await deleteDoc(doc(db, 'reports', rDoc.id)).catch(() => {});
    }
    if (snapshot.size > 0) {
      console.log(`Cleanup: removed ${snapshot.size} old reports.`);
    }
  } catch (error) {
    console.error('Reports cleanup error:', error);
  }
}

export async function cleanupRequests() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const q = query(collection(db, 'requests'), where('createdAt', '<', thirtyDaysAgo));
    const snapshot = await getDocs(q);
    for (const rDoc of snapshot.docs) {
      await deleteDoc(doc(db, 'requests', rDoc.id)).catch(() => {});
    }
  } catch (error) {
    console.error('Requests cleanup error:', error);
  }
}

export async function runWeeklyCleanup() {
  try {
    const systemRef = doc(db, 'settings', 'system');
    const systemSnap = await getDoc(systemRef);

    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

    if (systemSnap.exists()) {
      const lastCleanup = systemSnap.data().lastCleanup?.toMillis() || 0;

      if (now - lastCleanup < oneWeekMs) {
        return;
      }
    }

    await cleanupAnnouncements();
    await cleanupReminders();
    await cleanupReports();
    await cleanupRequests();

    console.log('Running weekly tasks cleanup...');

    // Delete tasks that are DONE and older than 7 days
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const q = query(
      collection(db, 'tasks'),
      where('done', '==', true),
      where('createdAt', '<', sevenDaysAgo)
    );
    const snapshot = await getDocs(q);

    let deletedCount = 0;

    for (const taskDoc of snapshot.docs) {
      const data = taskDoc.data();

      if (data.photos && Array.isArray(data.photos)) {
        for (const photo of data.photos) {
          if (photo.path) {
            try {
              const photoRef = ref(storage, photo.path);
              await deleteObject(photoRef).catch(() => {});
            } catch (e) {}
          }
        }
      }

      if (data.photoPath) {
        try {
          const photoRef = ref(storage, data.photoPath);
          await deleteObject(photoRef).catch(() => {});
        } catch (e) {}
      }

      await deleteDoc(doc(db, 'tasks', taskDoc.id));
      deletedCount++;
    }

    await setDoc(systemRef, { lastCleanup: serverTimestamp() }, { merge: true });

    if (deletedCount > 0) {
      console.log(`Cleanup finished: removed ${deletedCount} completed tasks.`);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}
