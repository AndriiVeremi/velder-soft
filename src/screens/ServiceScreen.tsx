import React, { useEffect, useState } from 'react';
import {
  View,
  Text as RNText,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Platform,
  Dimensions,
  TextInput,
  Alert,
} from 'react-native';
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
import { TimePicker, ModalOverlay, ModalContent } from '../components/CommonUI';
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle2,
  Trash2,
  Camera,
  X,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { StackScreenProps } from '@react-navigation/stack';

const { width } = Dimensions.get('window');

const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

const ServiceCard = styled.View<{ status: string }>`
  background-color: ${(props) => props.theme.colors.surface};
  margin: 8px 15px;
  padding: 16px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
  border-left-width: 5px;
  border-left-color: ${(props) =>
    props.status === 'DONE' ? props.theme.colors.success : props.theme.colors.warning};
`;

const CardHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
`;

const HospitalName = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f16}px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
  flex: 1;
`;

const DeptName = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f14}px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 2px;
`;

const Description = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f14}px;
  color: ${(props) => props.theme.colors.text};
  margin-top: 10px;
  line-height: 20px;
`;

const MetaRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 12px;
`;

const MetaItem = styled.View`
  flex-direction: row;
  align-items: center;
  margin-right: 15px;
`;

const MetaText = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f12}px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-left: 5px;
`;

const ActionButtons = styled.View`
  flex-direction: row;
  justify-content: flex-end;
  margin-top: 15px;
  border-top-width: 1px;
  border-top-color: ${(props) => props.theme.colors.background};
  padding-top: 10px;
`;

const ActionBtn = styled.TouchableOpacity`
  padding: 8px;
  margin-left: 10px;
`;

const Fab = styled.TouchableOpacity`
  position: absolute;
  bottom: 25px;
  right: 25px;
  width: 60px;
  height: 60px;
  border-radius: 30px;
  background-color: ${(props) => props.theme.colors.primary};
  justify-content: center;
  align-items: center;
  elevation: 5;
`;

const StyledInput = styled.TextInput`
  background-color: ${(props) => props.theme.colors.background};
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 15px;
  color: ${(props) => props.theme.colors.text};
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
`;

const Label = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f14}px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-bottom: 8px;
`;

const PhotoPreview = styled.Image`
  width: 100%;
  height: 150px;
  border-radius: 8px;
  margin-top: 10px;
`;

interface Service {
  id: string;
  hospital: string;
  department: string;
  description: string;
  status: 'PENDING' | 'DONE';
  photoUrl?: string;
  photoPath?: string;
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

  // Form state
  const [hospital, setHospital] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Service);
      setServices(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddService = async () => {
    if (!hospital.trim() || !department.trim() || !description.trim()) {
      return notify.error('Wypełnij wszystkie pola');
    }

    try {
      await addDoc(collection(db, 'services'), {
        hospital: hospital.trim(),
        department: department.trim(),
        description: description.trim(),
        status: 'PENDING',
        createdBy: user?.uid,
        authorName: userData?.name || 'Pracownik',
        createdAt: serverTimestamp(),
      });

      try {
        const directorsSnap = await getDocs(
          query(collection(db, 'users'), where('role', '==', 'DIRECTOR'))
        );
        const tokens: { token: string; notificationStart?: string; notificationEnd?: string }[] =
          [];
        directorsSnap.forEach((d) => {
          const data = d.data();
          if (data.pushToken)
            tokens.push({
              token: data.pushToken,
              notificationStart: data.notificationStart,
              notificationEnd: data.notificationEnd,
            });
        });
        if (tokens.length > 0) {
          await sendPushNotification(
            tokens,
            'Nowe zgłoszenie serwisowe! 🔧',
            `${userData?.name || 'Pracownik'}: ${hospital.trim()} — ${department.trim()}`
          );
        }
      } catch (pushErr) {
        console.warn('Failed to notify director:', pushErr);
      }

      setModalVisible(false);
      setHospital('');
      setDepartment('');
      setDescription('');
      notify.success('Zgłoszenie dodane');
    } catch (e) {
      notify.error('Błąd zapisu');
    }
  };

  const toggleStatus = async (service: Service) => {
    if (role !== 'DIRECTOR') return;
    const newStatus = service.status === 'DONE' ? 'PENDING' : 'DONE';
    try {
      await updateDoc(doc(db, 'services', service.id), { status: newStatus });

      if (newStatus === 'DONE') {
        try {
          const workerSnap = await getDocs(
            query(collection(db, 'users'), where('__name__', '==', service.createdBy))
          );
          if (!workerSnap.empty) {
            const workerData = workerSnap.docs[0].data();
            if (workerData.pushToken) {
              await sendPushNotification(
                [
                  {
                    token: workerData.pushToken,
                    notificationStart: workerData.notificationStart,
                    notificationEnd: workerData.notificationEnd,
                  },
                ],
                'Zgłoszenie serwisowe zakończone! ✅',
                `${service.hospital} — ${service.department} zostało zakończone.`
              );
            }
          }
        } catch (pushErr) {
          console.warn('Failed to notify worker:', pushErr);
        }
      }

      notify.success('Status zaktualizowany');
    } catch (e) {
      notify.error('Błąd aktualizacji');
    }
  };

  const handleDelete = (id: string) => {
    if (role !== 'DIRECTOR') return;
    const perform = async () => {
      try {
        await deleteDoc(doc(db, 'services', id));
        notify.success('Usunięto');
      } catch (e) {
        notify.error('Błąd usuwania');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Usunąć zgłoszenie?')) perform();
    } else {
      Alert.alert('Usuń', 'Czy na pewno?', [
        { text: 'Anuluj' },
        { text: 'Tak', onPress: perform, style: 'destructive' },
      ]);
    }
  };

  const handleAddPhoto = async (service: Service) => {
    setUploading(true);
    const result = await pickAndUploadPhoto('service_photos', `${service.id}_${Date.now()}.jpg`);
    if (result) {
      try {
        await updateDoc(doc(db, 'services', service.id), {
          photoUrl: result.photoUrl,
          photoPath: result.photoPath,
          status: 'DONE',
        });

        try {
          const directorsSnap = await getDocs(
            query(collection(db, 'users'), where('role', '==', 'DIRECTOR'))
          );
          const tokens: { token: string; notificationStart?: string; notificationEnd?: string }[] =
            [];
          directorsSnap.forEach((d) => {
            const data = d.data();
            if (data.pushToken)
              tokens.push({
                token: data.pushToken,
                notificationStart: data.notificationStart,
                notificationEnd: data.notificationEnd,
              });
          });
          if (tokens.length > 0) {
            await sendPushNotification(
              tokens,
              'Serwis zakończony ze zdjęciem! 📸',
              `${service.authorName}: ${service.hospital} — ${service.department}`
            );
          }
        } catch (pushErr) {
          console.warn('Failed to notify director:', pushErr);
        }

        notify.success('Zdjęcie dodane i status zmieniony');
      } catch (e) {
        notify.error('Błąd zapisu');
      }
    }
    setUploading(false);
  };

  return (
    <Container theme={theme}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 50 }} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 10 }}
          renderItem={({ item }) => (
            <ServiceCard theme={theme} status={item.status}>
              <CardHeader>
                <View style={{ flex: 1 }}>
                  <HospitalName theme={theme}>{item.hospital}</HospitalName>
                  <DeptName theme={theme}>{item.department}</DeptName>
                </View>
                <View
                  style={{
                    backgroundColor: item.status === 'DONE' ? '#e8f5e9' : '#fff3e0',
                    padding: 4,
                    borderRadius: 4,
                  }}
                >
                  <RNText
                    style={{
                      fontSize: theme.fontSize.f10,
                      fontWeight: 'bold',
                      color: item.status === 'DONE' ? '#2e7d32' : '#e65100',
                    }}
                  >
                    {item.status === 'DONE' ? 'ZAKOŃCZONE' : 'OCZEKUJE'}
                  </RNText>
                </View>
              </CardHeader>

              <Description theme={theme}>{item.description}</Description>

              <MetaRow>
                <MetaItem>
                  <Clock size={12} color={theme.colors.textSecondary} />
                  <MetaText theme={theme}>
                    {item.createdAt
                      ? format(item.createdAt.toDate(), 'd MMM, HH:mm', { locale: pl })
                      : '...'}
                  </MetaText>
                </MetaItem>
                <MetaItem>
                  <RNText
                    style={{
                      fontSize: theme.fontSize.f12,
                      color: theme.colors.primary,
                      fontWeight: 'bold',
                    }}
                  >
                    {item.authorName}
                  </RNText>
                </MetaItem>
              </MetaRow>

              {item.photoUrl && <PhotoPreview source={{ uri: item.photoUrl }} />}

              <ActionButtons theme={theme}>
                {role === 'DIRECTOR' && (
                  <ActionBtn onPress={() => toggleStatus(item)}>
                    <CheckCircle2
                      size={20}
                      color={
                        item.status === 'DONE' ? theme.colors.success : theme.colors.textSecondary
                      }
                    />
                  </ActionBtn>
                )}
                <ActionBtn onPress={() => handleAddPhoto(item)}>
                  <Camera
                    size={20}
                    color={item.photoUrl ? theme.colors.success : theme.colors.textSecondary}
                  />
                </ActionBtn>
                {role === 'DIRECTOR' && (
                  <ActionBtn onPress={() => handleDelete(item.id)}>
                    <Trash2 size={20} color={theme.colors.error} opacity={0.6} />
                  </ActionBtn>
                )}
              </ActionButtons>
            </ServiceCard>
          )}
          ListEmptyComponent={
            <RNText
              style={{ textAlign: 'center', marginTop: 50, color: theme.colors.textSecondary }}
            >
              Brak zgłoszeń serwisowych.
            </RNText>
          }
        />
      )}

      {role === 'DIRECTOR' && (
        <Fab theme={theme} onPress={() => setModalVisible(true)}>
          <Plus size={30} color="white" />
        </Fab>
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <ModalOverlay>
          <ModalContent theme={theme}>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}
            >
              <RNText
                style={{
                  fontSize: theme.fontSize.f20,
                  fontWeight: 'bold',
                  color: theme.colors.text,
                }}
              >
                Nowe zgłoszenie
              </RNText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <Label theme={theme}>Szpital</Label>
            <StyledInput
              theme={theme}
              placeholder="Nazwa szpitala"
              value={hospital}
              onChangeText={setHospital}
              placeholderTextColor={theme.colors.textSecondary}
            />

            <Label theme={theme}>Oddział</Label>
            <StyledInput
              theme={theme}
              placeholder="Nazwa oddziału"
              value={department}
              onChangeText={setDepartment}
              placeholderTextColor={theme.colors.textSecondary}
            />

            <Label theme={theme}>Opis problemu / Prace</Label>
            <StyledInput
              theme={theme}
              placeholder="Co należy zrobić або що зроблено..."
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
              placeholderTextColor={theme.colors.textSecondary}
              style={{ height: 100, textAlignVertical: 'top' }}
            />

            <TouchableOpacity
              onPress={handleAddService}
              style={{
                backgroundColor: theme.colors.primary,
                padding: 16,
                borderRadius: 12,
                marginTop: 20,
                alignItems: 'center',
              }}
            >
              <RNText style={{ color: 'white', fontWeight: 'bold', fontSize: theme.fontSize.f16 }}>
                Wyślij zgłoszenie
              </RNText>
            </TouchableOpacity>
          </ModalContent>
        </ModalOverlay>
      </Modal>

      {uploading && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
    </Container>
  );
};

export default ServiceScreen;
