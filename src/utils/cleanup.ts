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

    console.log('Running weekly cleanup...');

    const q = query(collection(db, 'tasks'), where('done', '==', true));
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
