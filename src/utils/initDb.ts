import { db } from '../config/firebase';
import { doc, setDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { notify } from './notify';

/**
 * Скрипт ініціалізації для нової бази даних клієнта.
 * Створює необхідні системні документи та початкові категорії.
 */
export const initializeNewClientDatabase = async () => {
  try {
    console.log('Starting database initialization...');

    // 1. Початкова статистика (потрібна для екрану системного моніторингу)
    const statsRef = doc(db, 'settings', 'stats');
    await setDoc(statsRef, {
      taskCount: 0,
      serviceCount: 0,
      projectCount: 0,
      storageCount: 0,
      lastCleanup: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 2. Початкові категорії документів (приклад)
    const defaultCategories = [
      { id: 'tech', name: 'Dokumentacja Techniczna', icon: 'file-text' },
      { id: 'hr', name: 'Kadry i BHP', icon: 'users' },
      { id: 'norm', name: 'Normy i Standardy', icon: 'clipboard-list' }
    ];

    for (const cat of defaultCategories) {
      await setDoc(doc(db, 'docs_categories', cat.id), {
        name: cat.name,
        icon: cat.icon,
        createdAt: new Date().toISOString()
      }, { merge: true });
    }

    // 3. Створення системного повідомлення
    await setDoc(doc(db, 'announcements', 'welcome'), {
      title: 'Witaj в системі!',
      content: 'System został pomyślnie zainicjowany. Zapraszamy do pracy!',
      date: new Date().toISOString(),
      author: 'System',
      priority: 'high'
    });

    console.log('Database initialized successfully!');
    notify.success('База даних успішно ініціалізована');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    notify.error('Помилка ініціалізації бази');
    return false;
  }
};

/**
 * Перевірка, чи база вже ініціалізована
 */
export const checkIsDbInitialized = async () => {
  try {
    const q = query(collection(db, 'settings'), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (e) {
    return false;
  }
};
