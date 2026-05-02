import React, { useEffect, useState } from 'react';
import { FlatList, ActivityIndicator } from 'react-native';
import styled from 'styled-components/native';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  getDocs,
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { sendPushNotification } from '../utils/notifications';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { notify } from '../utils/notify';
import { pickAndUploadPhoto } from '../utils/upload';
import { confirmDelete } from '../utils/confirm';
import { useMarkAsRead } from '../hooks/useMarkAsRead';
import { Fab, ScreenHeader, ScreenTitle, UploadOverlay } from '../components/CommonUI';
import { Plus } from 'lucide-react-native';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { ServiceCardComponent } from '../components/service/ServiceCard';
import { AddServiceModal } from '../components/service/AddServiceModal';
import { playDoneSound } from '../utils/audio';
import permissions from '../utils/permissions';

const EmptyText = styled.Text`
  text-align: center;
  margin-top: 60px;
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: 15px;
`;

const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

interface Service {
  id: string;
  hospital: string;
  department: string;
  description: string;
  status: 'PENDING' | 'DONE';
  photoUrl?: string;
  photoPath?: string;
  isNew?: boolean;
  createdAt: Timestamp | null;
  createdBy: string;
  authorName: string;
}

const ServiceScreen = () => {
  const { user, role, userData } = useAuth();
  const { theme } = useAppTheme();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scheduleMarkAsRead = useMarkAsRead('services');

  const [hospital, setHospital] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');

  const { isListening, toggleListening } = useVoiceRecognition({
    onResult: (transcript) => {
      setDescription(transcript);
    },
  });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Service);
        setServices(data);
        setLoading(false);
        scheduleMarkAsRead(data.filter((s) => s.isNew).map((s) => s.id));
      },
      (error) => {
        console.error('Firestore error:', error);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [user, scheduleMarkAsRead]);

  const handleAddService = async () => {
    if (!permissions.canCreateServiceRecord(role || 'EMPLOYEE')) return;
    if (!hospital.trim() || !department.trim() || !description.trim()) {
      return notify.error('Wypełnij wszystkie pola');
    }

    try {
      await addDoc(collection(db, 'services'), {
        hospital: hospital.trim(),
        department: department.trim(),
        description: description.trim(),
        status: 'PENDING',
        isNew: true,
        createdBy: user?.uid,
        authorName: userData?.name || 'Director',
        createdAt: serverTimestamp(),
      });

      try {
        const usersSnap = await getDocs(
          query(
            collection(db, 'users'),
            where('role', '==', 'EMPLOYEE'),
            where('isActive', '==', true)
          )
        );
        const tokens: { token: string; notificationStart?: string; notificationEnd?: string }[] =
          [];
        usersSnap.forEach((d) => {
          const data = d.data();
          if (data.pushToken && d.id !== user?.uid) {
            tokens.push({
              token: data.pushToken,
              notificationStart: data.notificationStart,
              notificationEnd: data.notificationEnd,
            });
          }
        });

        if (tokens.length > 0) {
          await sendPushNotification(
            tokens,
            'Nowe zlecenie serwisowe! 🔧',
            `Nowe zadanie w: ${hospital.trim()} — ${department.trim()}`,
            'alerts_v2'
          );
        }
      } catch (pushErr) {
        console.warn('Failed to notify workers:', pushErr);
      }

      setModalVisible(false);
      setHospital('');
      setDepartment('');
      setDescription('');
      await playDoneSound();
      notify.success('Zlecenie dodane');
    } catch (e) {
      notify.error('Błąd zapisu');
    }
  };

  const toggleStatus = async (service: Service) => {
    if (!permissions.canToggleServiceStatus(role || 'EMPLOYEE')) return;
    const newStatus = service.status === 'DONE' ? 'PENDING' : 'DONE';
    try {
      await updateDoc(doc(db, 'services', service.id), { status: newStatus });

      if (newStatus === 'DONE' && role === 'EMPLOYEE') {
        await playDoneSound();
        try {
          const directorsSnap = await getDocs(
            query(collection(db, 'users'), where('role', '==', 'DIRECTOR'))
          );
          const tokens: { token: string; notificationStart?: string; notificationEnd?: string }[] =
            [];
          directorsSnap.forEach((d) => {
            const data = d.data();
            if (data.pushToken && d.id !== user?.uid) {
              tokens.push({
                token: data.pushToken,
                notificationStart: data.notificationStart,
                notificationEnd: data.notificationEnd,
              });
            }
          });

          if (tokens.length > 0) {
            await sendPushNotification(
              tokens,
              'Serwis zakończony! ✅',
              `${userData?.name || 'Pracownik'} oznaczył jako wykonane: ${service.hospital} — ${service.department}`,
              'done_v1'
            );
          }
        } catch (pushErr) {
          console.warn('Failed to notify director:', pushErr);
        }
      }
      notify.success('Status zaktualizowany');
    } catch (e) {
      notify.error('Błąd aktualizacji');
    }
  };

  const handleDelete = (id: string) => {
    if (!permissions.canDeleteServiceRecord(role || 'EMPLOYEE')) return;
    confirmDelete('Usunąć zgłoszenie?', async () => {
      try {
        await deleteDoc(doc(db, 'services', id));
        notify.success('Usunięto');
      } catch (e) {
        notify.error('Błąd usuwania');
      }
    });
  };

  const handleAddPhoto = async (service: Service) => {
    setUploading(true);
    const result = await pickAndUploadPhoto('service_photos', `${service.id}_${Date.now()}.jpg`);
    if (result) {
      try {
        await updateDoc(doc(db, 'services', service.id), {
          photoUrl: result.photoUrl,
          photoPath: result.photoPath,
        });
        notify.success('Zdjęcie dodane');
      } catch (e) {
        notify.error('Błąd zapisu');
      }
    }
    setUploading(false);
  };

  return (
    <Container theme={theme}>
      <ScreenHeader theme={theme}>
        <ScreenTitle theme={theme}>Serwis</ScreenTitle>
      </ScreenHeader>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 50 }} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 10 }}
          renderItem={({ item }) => (
            <ServiceCardComponent
              service={item}
              role={role || ''}
              theme={theme}
              permissions={permissions}
              onToggle={toggleStatus}
              onAddPhoto={handleAddPhoto}
              onDelete={handleDelete}
            />
          )}
          ListEmptyComponent={<EmptyText theme={theme}>Brak zgłoszeń serwisowych</EmptyText>}
        />
      )}

      {permissions.canCreateServiceRecord(role || 'EMPLOYEE') && (
        <Fab theme={theme} onPress={() => setModalVisible(true)}>
          <Plus size={30} color="white" />
        </Fab>
      )}

      <AddServiceModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={handleAddService}
        theme={theme}
        hospital={hospital}
        setHospital={setHospital}
        department={department}
        setDepartment={setDepartment}
        description={description}
        setDescription={setDescription}
        isListening={isListening}
        toggleListening={toggleListening}
      />

      {uploading && (
        <UploadOverlay>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </UploadOverlay>
      )}
    </Container>
  );
};

export default ServiceScreen;
