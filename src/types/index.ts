import { Timestamp } from 'firebase/firestore';

export interface Task {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  done: boolean;
  photoUrl?: string;
  photoPath?: string;
  wasMoved?: boolean;
  assignedTo?: string;
  createdAt?: Timestamp | null;
}

export interface Hospital {
  id: string;
  name: string;
  createdAt?: Timestamp | null;
}

export interface Department {
  id: string;
  hospitalId: string;
  hospitalName?: string;
  name: string;
  status?: 'IN_PROGRESS' | 'COMPLETED';
  createdAt?: Timestamp | null;
}

export interface ServiceRecord {
  id: string;
  hospital: string;
  department: string;
  photoUrl: string;
  photoPath: string;
  description?: string;
  createdAt?: Timestamp | null;
}

export interface UserRequest {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  status: 'PENDING' | 'CONFIRMED';
  createdAt: Timestamp | null;
}

export interface Announcement {
  id: string;
  text: string;
  authorName: string;
  createdAt: Timestamp | null;
}

export interface VacationInfo {
  id: string;
  userId: string;
  userName: string;
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Timestamp | null;
}
