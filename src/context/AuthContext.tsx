import React, { createContext, useContext, useEffect, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export type UserRole = 'DIRECTOR' | 'EMPLOYEE';

interface UserDocument {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  createdAt?: Timestamp | null;
  notificationStart?: string;
  notificationEnd?: string;
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

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeUserDoc = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserDocument;

              setRole('DIRECTOR');
              setIsActive(true);
              setUserData(data);
            } else {
              setRole('DIRECTOR');
              setIsActive(true);
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
