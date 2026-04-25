import React, { useEffect, useState } from 'react';
import {
  View,
  Text as RNText,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
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
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { Calendar } from 'react-native-calendars';
import { db, storage, auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { theme } from '../config/theme';
import { notify } from '../utils/notify';
import {
  Wrench,
  Plus,
  Calendar as CalendarIcon,
  Camera,
  X,
  ClipboardCheck,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react-native';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

interface ServicePhoto {
  url: string;
  path: string;
  comment?: string;
}

interface ServiceRecord {
  id: string;
  title: string;
  description: string;
  photos: ServicePhoto[];
  serviceDate: string;
  status: 'PENDING' | 'DONE';
  createdAt: any;
}

const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

const Header = styled.View`
  padding: ${(props) => props.theme.spacing.lg}px;
  background-color: ${(props) => props.theme.colors.surface};
  border-bottom-width: 1px;
  border-bottom-color: ${(props) => props.theme.colors.border};
`;

const Title = styled(RNText)`
  font-size: 22px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
`;

const ServiceCard = styled.View`
  background-color: ${(props) => props.theme.colors.surface};
  margin: ${(props) => props.theme.spacing.sm}px ${(props) => props.theme.spacing.md}px;
  border-radius: ${(props) => props.theme.borderRadius.md}px;
  border: 1px solid ${(props) => props.theme.colors.border};
  overflow: hidden;
`;

const CardContent = styled.View`
  padding: ${(props) => props.theme.spacing.md}px;
`;

const CardTitle = styled(RNText)`
  font-size: 18px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.primary};
`;

const CardDesc = styled(RNText)`
  font-size: 14px;
  color: ${(props) => props.theme.colors.text};
  margin-top: 5px;
`;

const PhotoStrip = styled.ScrollView`
  flex-direction: row;
  margin-top: 15px;
`;

const PhotoItem = styled.View`
  width: 160px;
  margin-right: 12px;
  background-color: #f9f9f9;
  border-radius: 10px;
  padding: 5px;
  border: 1px solid #eee;
`;

const PhotoImg = styled.Image`
  width: 150px;
  height: 110px;
  border-radius: 8px;
`;

const PhotoComment = styled(RNText)`
  font-size: 11px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 6px;
  font-style: italic;
`;

const Badge = styled.View<{ done: boolean }>`
  padding: 4px 12px;
  border-radius: 20px;
  background-color: ${(props) => (props.done ? props.theme.colors.success : '#FFA000')};
  align-self: flex-start;
  margin-bottom: 8px;
  flex-direction: row;
  align-items: center;
`;

const BadgeText = styled(RNText)`
  color: white;
  font-size: 10px;
  font-weight: bold;
  margin-left: 5px;
`;

const DateInfo = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 12px;
  background-color: #f0f7ff;
  padding: 6px 12px;
  border-radius: 6px;
  align-self: flex-start;
`;

const AddButton = styled.TouchableOpacity`
  background-color: ${(props) => props.theme.colors.primary};
  width: 60px;
  height: 60px;
  border-radius: 30px;
  position: absolute;
  right: 20px;
  bottom: 20px;
  justify-content: center;
  align-items: center;
  elevation: 5;
`;

const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

const ModalContent = styled(ScrollView)`
  background-color: white;
  width: 100%;
  max-width: 600px;
  border-radius: 15px;
  max-height: 95%;
`;

const ServiceScreen = () => {
  const { role } = useAuth();
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('serviceDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ServiceRecord);
      setRecords(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreate = async () => {
    if (!title.trim()) return notify.error('Podaj nazwę obiektu');
    try {
      await addDoc(collection(db, 'services'), {
        title,
        description,
        serviceDate: selectedDate,
        status: 'PENDING',
        photos: [],
        createdAt: serverTimestamp(),
      });
      setModalVisible(false);
      setTitle('');
      setDescription('');
      notify.success('Zlecenie serwisowe utworzone');
    } catch (e) {
      notify.error('Błąd zapisu');
    }
  };

  const startAddPhoto = async (recordId: string) => {
    let result = await ImagePicker.launchCameraAsync({ quality: 0.5, allowsEditing: false });
    if (!result.canceled) {
      setTempPhoto(result.assets[0].uri);
      setActiveRecordId(recordId);
      setPhotoModalVisible(true);
    }
  };

  const uploadPhotoWithComment = async () => {
    if (!activeRecordId || !tempPhoto) return;
    setUploading(true);
    try {
      const response = await fetch(tempPhoto);
      const blob = await response.blob();
      const filename = `service/${activeRecordId}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      const record = records.find((r) => r.id === activeRecordId);
      const newPhotos = [...(record?.photos || []), { url, path: filename, comment }];

      await updateDoc(doc(db, 'services', activeRecordId), {
        photos: newPhotos,
        status: 'DONE',
      });

      setPhotoModalVisible(false);
      setTempPhoto(null);
      setComment('');
      notify.success('Raport serwisowy dodany');
    } catch (e) {
      notify.error('Błąd uploadu');
    } finally {
      setUploading(false);
    }
  };

  const deleteRecord = (id: string) => {
    Alert.alert('Usuń zlecenie', 'Czy na pewno chcesz usunąć ten wpis serwisowy?', [
      { text: 'Nie' },
      {
        text: 'Tak',
        style: 'destructive',
        onPress: async () => await deleteDoc(doc(db, 'services', id)),
      },
    ]);
  };

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );

  return (
    <Container theme={theme}>
      <Header theme={theme}>
        <Title theme={theme}>Serwis i Konserwacja</Title>
      </Header>

      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ServiceCard theme={theme}>
            <CardContent theme={theme}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Badge done={item.status === 'DONE'} theme={theme}>
                  {item.status === 'DONE' ? (
                    <ClipboardCheck size={14} color="white" />
                  ) : (
                    <Wrench size={14} color="white" />
                  )}
                  <BadgeText>{item.status === 'DONE' ? 'WYKONANO' : 'DO ZROBIENIA'}</BadgeText>
                </Badge>
                {role === 'DIRECTOR' && (
                  <TouchableOpacity onPress={() => deleteRecord(item.id)}>
                    <Trash2 size={20} color="#ddd" />
                  </TouchableOpacity>
                )}
              </View>

              <CardTitle theme={theme}>{item.title}</CardTitle>
              <CardDesc theme={theme}>{item.description}</CardDesc>

              <DateInfo>
                <CalendarIcon size={14} color={theme.colors.primary} />
                <RNText
                  style={{
                    fontSize: 12,
                    marginLeft: 6,
                    color: theme.colors.primary,
                    fontWeight: 'bold',
                  }}
                >
                  Termin: {item.serviceDate}
                </RNText>
              </DateInfo>

              <PhotoStrip horizontal showsHorizontalScrollIndicator={false}>
                {item.photos?.map((p, i) => (
                  <PhotoItem key={i}>
                    <PhotoImg source={{ uri: p.url }} />
                    <PhotoComment theme={theme} numberOfLines={2}>
                      {p.comment || 'Bez opisu'}
                    </PhotoComment>
                  </PhotoItem>
                ))}
                {item.status === 'PENDING' && (
                  <TouchableOpacity
                    onPress={() => startAddPhoto(item.id)}
                    style={{
                      width: 160,
                      height: 110,
                      backgroundColor: '#f5f5f5',
                      borderRadius: 10,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderStyle: 'dashed',
                      borderWidth: 1,
                      borderColor: '#ccc',
                    }}
                  >
                    <Camera size={28} color="#999" />
                    <RNText style={{ fontSize: 11, color: '#999', marginTop: 5 }}>
                      Dodaj raport foto
                    </RNText>
                  </TouchableOpacity>
                )}
              </PhotoStrip>
            </CardContent>
          </ServiceCard>
        )}
        ListEmptyComponent={
          <RNText style={{ textAlign: 'center', marginTop: 50, color: '#999' }}>
            Brak zleceń serwisowych.
          </RNText>
        }
      />

      {role === 'DIRECTOR' && (
        <AddButton theme={theme} onPress={() => setModalVisible(true)}>
          <Plus size={30} color="white" />
        </AddButton>
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <ModalOverlay>
          <ModalContent>
            <View style={{ padding: 25 }}>
              <View
                style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}
              >
                <RNText style={{ fontSize: 20, fontWeight: 'bold' }}>Nowe zlecenie serwisu</RNText>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X size={24} />
                </TouchableOpacity>
              </View>

              <RNText style={{ fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 5 }}>
                URZĄDZENIE / OBIEKT
              </RNText>
              <TextInput
                placeholder="np. Centrala wentylacyjna"
                value={title}
                onChangeText={setTitle}
                style={{
                  backgroundColor: '#f9f9f9',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 15,
                }}
              />

              <RNText style={{ fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 5 }}>
                OPIS PRAC
              </RNText>
              <TextInput
                placeholder="Co trzeba sprawdzić/naprawić?"
                value={description}
                onChangeText={setDescription}
                multiline
                style={{
                  backgroundColor: '#f9f9f9',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 15,
                  height: 80,
                  textAlignVertical: 'top',
                }}
              />

              <RNText style={{ fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 5 }}>
                PLANOWANA DATA
              </RNText>
              <Calendar
                onDayPress={(day) => setSelectedDate(day.dateString)}
                markedDates={{
                  [selectedDate]: { selected: true, selectedColor: theme.colors.primary },
                }}
                theme={{
                  todayTextColor: theme.colors.primary,
                  selectedDayBackgroundColor: theme.colors.primary,
                }}
              />

              <TouchableOpacity
                onPress={handleCreate}
                style={{
                  backgroundColor: theme.colors.primary,
                  padding: 18,
                  borderRadius: 10,
                  alignItems: 'center',
                  marginTop: 20,
                }}
              >
                <RNText style={{ color: 'white', fontWeight: 'bold' }}>WYŚLIJ DO SERWISU</RNText>
              </TouchableOpacity>
            </View>
          </ModalContent>
        </ModalOverlay>
      </Modal>

      <Modal visible={photoModalVisible} transparent animationType="slide">
        <ModalOverlay>
          <View style={{ backgroundColor: 'white', width: '90%', borderRadius: 15, padding: 20 }}>
            <RNText style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>
              Opis wykonanych prac
            </RNText>
            {tempPhoto && (
              <Image
                source={{ uri: tempPhoto }}
                style={{ width: '100%', height: 200, borderRadius: 10, marginBottom: 15 }}
              />
            )}
            <TextInput
              placeholder="Napisz co zostało zrobione..."
              value={comment}
              onChangeText={setComment}
              multiline
              style={{
                backgroundColor: '#f9f9f9',
                padding: 12,
                borderRadius: 8,
                marginBottom: 20,
                height: 80,
                textAlignVertical: 'top',
              }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity onPress={() => setPhotoModalVisible(false)} style={{ padding: 15 }}>
                <RNText color="#666">Anuluj</RNText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={uploadPhotoWithComment}
                disabled={uploading}
                style={{
                  backgroundColor: theme.colors.success,
                  padding: 15,
                  borderRadius: 8,
                  minWidth: 120,
                  alignItems: 'center',
                }}
              >
                {uploading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <RNText style={{ color: 'white', fontWeight: 'bold' }}>WYŚLIJ RAPORT</RNText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ModalOverlay>
      </Modal>
    </Container>
  );
};

export default ServiceScreen;
