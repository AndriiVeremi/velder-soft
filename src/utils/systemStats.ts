import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { ref, listAll } from 'firebase/storage';
import { db, storage } from '../config/firebase';

export interface SystemStats {
  database: {
    tasks: number;
    services: number;
    projects: number;
    total: number;
    percentage: number;
  };
  storage: {
    photos: number;
    pdfs: number;
    totalFiles: number;
    percentage: number;
  };
  lastUpdate: Date;
}

export const getSystemStats = async (): Promise<SystemStats> => {
  try {
    // Database counts
    const tasksSnap = await getDocs(collection(db, 'tasks'));
    const servicesSnap = await getDocs(collection(db, 'services'));
    const projectsSnap = await getDocs(collection(db, 'projects'));

    const tasksCount = tasksSnap.size;
    const servicesCount = servicesSnap.size;
    const projectsCount = projectsSnap.size;
    const dbTotal = tasksCount + servicesCount + projectsCount;

    // Cloud Storage counts (recursive listing is limited in client SDK, so we list folders)
    let photoCount = 0;
    try {
      const taskPhotosRef = ref(storage, 'task_photos');
      const servicePhotosRef = ref(storage, 'service_photos');
      const tpList = await listAll(taskPhotosRef);
      const spList = await listAll(servicePhotosRef);
      photoCount = tpList.items.length + spList.items.length;
    } catch (e) {
      console.warn('Storage list error:', e);
    }

    let pdfCount = 0;
    try {
      const projectPdfsRef = ref(storage, 'pdf_projects');
      const pdfList = await listAll(projectPdfsRef);
      pdfCount = pdfList.items.length;
    } catch (e) {
      console.warn('PDF Storage list error:', e);
    }

    return {
      database: {
        tasks: tasksCount,
        services: servicesCount,
        projects: projectsCount,
        total: dbTotal,
        percentage: Math.min(Math.round((dbTotal / 5000) * 100), 100), // Hard limit of 5000 docs for free tier simulation
      },
      storage: {
        photos: photoCount,
        pdfs: pdfCount,
        totalFiles: photoCount + pdfCount,
        percentage: Math.min(Math.round(((photoCount + pdfCount) / 1000) * 100), 100), // Limit 1000 files
      },
      lastUpdate: new Date(),
    };
  } catch (error) {
    console.error('Error fetching system stats:', error);
    throw error;
  }
};
