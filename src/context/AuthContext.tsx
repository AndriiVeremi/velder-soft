import React, { createContext, useContext, useEffect, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { registerForPushNotificationsAsync, setQuietHoursCache } from '../utils/notifications';
import { Platform } from 'react-native';

export type UserRole = 'DIRECTOR' | 'EMPLOYEE';

interface UserDocument {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  createdAt?: Timestamp | null;
  notificationStart?: string;
  notificationEnd?: string;
  pushToken?: string;
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isActive: boolean;
  loading: boolean;
  userData: UserDocument | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isActive: false,
  loading: true,
  userData: null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [userData, setUserData] = useState<UserDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserDoc: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        if (Platform.OS !== 'web') {
          registerForPushNotificationsAsync().then((token) => {
            if (token) {
              updateDoc(doc(db, 'users', firebaseUser.uid), { pushToken: token }).catch((err) =>
                console.warn('Failed to save push token:', err)
              );
            }
          });
        }

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeUserDoc = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserDocument;

              setRole(data.role ?? 'EMPLOYEE');
              setIsActive(data.isActive ?? false);
              setUserData(data);
              setQuietHoursCache(data.notificationStart, data.notificationEnd);
            } else {
              setRole('EMPLOYEE');
              setIsActive(false);
              setUserData(null);
            }
            setLoading(false);
          },
          (error) => {
            console.warn('User doc snapshot error:', error);
            setLoading(false);
          }
        );
      } else {
        setUser(null);
        setRole(null);
        setIsActive(false);
        setUserData(null);
        setLoading(false);
        unsubscribeUserDoc();
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeUserDoc();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, isActive, loading, userData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
