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
  serviceTime?: string;
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

const LoaderContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const CardHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
`;

const DateText = styled(RNText)`
  font-size: 12px;
  margin-left: 6px;
  color: ${(props) => props.theme.colors.primary};
  font-weight: bold;
`;

const AddPhotoPlaceholder = styled.TouchableOpacity`
  width: 160px;
  height: 110px;
  background-color: ${(props) => props.theme.colors.background};
  border-radius: 10px;
  justify-content: center;
  align-items: center;
  border-style: dashed;
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
`;

const PlaceholderText = styled(RNText)`
  font-size: 11px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 5px;
`;

const EmptyRecordsText = styled(RNText)`
  text-align: center;
  margin-top: 50px;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const ModalInner = styled.View`
  padding: 25px;
`;

const ModalHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const ModalTitleText = styled(RNText)`
  font-size: 20px;
  font-weight: bold;
`;

const InputLabel = styled(RNText)`
  font-size: 12px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-bottom: 5px;
`;

const StyledTextInput = styled.TextInput`
  background-color: ${(props) => props.theme.colors.background};
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 15px;
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const TextArea = styled(StyledTextInput)`
  height: 80px;
`;

const SubmitButton = styled.TouchableOpacity<{ success?: boolean }>`
  background-color: ${(props) =>
    props.success ? props.theme.colors.success : props.theme.colors.primary};
  padding: 18px;
  border-radius: 10px;
  align-items: center;
  margin-top: 20px;
`;

const SubmitButtonText = styled(RNText)`
  color: white;
  font-weight: bold;
`;

const PhotoModalContainer = styled.View`
  background-color: white;
  width: 90%;
  border-radius: 15px;
  padding: 20px;
`;

const PhotoPreview = styled.Image`
  width: 100%;
  height: 200px;
  border-radius: 10px;
  margin-bottom: 15px;
`;

const ActionButtons = styled.View`
  flex-direction: row;
  justify-content: space-between;
`;

const TimePickerContainer = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 12px;
  margin-top: 10px;
  justify-content: center;
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const TimeBlock = styled.View`
  align-items: center;
  width: 50px;
`;

const TimeValue = styled(RNText)`
  font-size: 24px;
  font-weight: bold;
  margin: 5px 0;
  color: ${(props) => props.theme.colors.text};
`;

const TimeSeparator = styled(RNText)`
  font-size: 24px;
  font-weight: bold;
  margin-horizontal: 10px;
  color: ${(props) => props.theme.colors.text};
`;

const CancelBtn = styled.TouchableOpacity`
  padding: 15px;
`;

const ReportBtn = styled.TouchableOpacity<{ disabled?: boolean }>`
  background-color: ${(props) =>
    props.disabled ? props.theme.colors.border : props.theme.colors.success};
  padding: 15px;
  border-radius: 8px;
  min-width: 120px;
  align-items: center;
`;

import { StackScreenProps } from '@react-navigation/stack';

type Props = StackScreenProps<any, 'Service'>;

const ServiceScreen = ({ navigation, route }: Props) => {
  const { role } = useAuth();
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [hour, setHour] = useState(10);
  const [minute, setMinute] = useState(0);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);

  const adjustTime = (type: 'h' | 'm', val: number) => {
    if (type === 'h')
      setHour((h) => {
        let n = h + val;
        return n > 23 ? 0 : n < 0 ? 23 : n;
      });
    else
      setMinute((m) => {
        let n = m + val;
        return n > 55 ? 0 : n < 0 ? 55 : n;
      });
  };

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
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    try {
      await addDoc(collection(db, 'services'), {
        title,
        description,
        serviceDate: selectedDate,
        serviceTime: timeStr,
        status: 'PENDING',
        photos: [],
        createdAt: serverTimestamp(),
      });
      setModalVisible(false);
      setTitle('');
      setDescription('');
      setHour(10);
      setMinute(0);
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
      <LoaderContainer>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </LoaderContainer>
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
              <CardHeader>
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
                    <Trash2 size={20} color={theme.colors.border} />
                  </TouchableOpacity>
                )}
              </CardHeader>

              <CardTitle theme={theme}>{item.title}</CardTitle>
              <CardDesc theme={theme}>{item.description}</CardDesc>

              <DateInfo>
                <CalendarIcon size={14} color={theme.colors.primary} />
                <DateText theme={theme}>
                  Termin: {item.serviceDate} {item.serviceTime ? `@ ${item.serviceTime}` : ''}
                </DateText>
              </DateInfo>

              <PhotoStrip horizontal showsHorizontalScrollIndicator={false}>
                {item.photos?.map((p) => (
                  <PhotoItem key={p.path}>
                    <PhotoImg source={{ uri: p.url }} />
                    <PhotoComment theme={theme} numberOfLines={2}>
                      {p.comment || 'Bez opisu'}
                    </PhotoComment>
                  </PhotoItem>
                ))}
                {item.status === 'PENDING' && (
                  <AddPhotoPlaceholder onPress={() => startAddPhoto(item.id)} theme={theme}>
                    <Camera size={28} color={theme.colors.textSecondary} />
                    <PlaceholderText theme={theme}>Dodaj raport foto</PlaceholderText>
                  </AddPhotoPlaceholder>
                )}
              </PhotoStrip>
            </CardContent>
          </ServiceCard>
        )}
        ListEmptyComponent={
          <EmptyRecordsText theme={theme}>Brak zleceń serwisowych.</EmptyRecordsText>
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
            <ModalInner theme={theme}>
              <ModalHeader theme={theme}>
                <ModalTitleText theme={theme}>Nowe zlecenie serwisu</ModalTitleText>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </ModalHeader>

              <InputLabel theme={theme}>URZĄDZENIE / OBIEKT</InputLabel>
              <StyledTextInput
                theme={theme}
                placeholder="np. Centrala wentylacyjna"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor={theme.colors.textSecondary}
              />

              <InputLabel theme={theme}>OPIS PRAC</InputLabel>
              <TextArea
                theme={theme}
                placeholder="Co trzeba sprawdzić/naprawić?"
                value={description}
                onChangeText={setDescription}
                multiline
                placeholderTextColor={theme.colors.textSecondary}
              />

              <InputLabel theme={theme}>PLANOWANA DATA</InputLabel>
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

              <InputLabel theme={theme} style={{ marginTop: 20 }}>
                GODZINA
              </InputLabel>
              <TimePickerContainer theme={theme}>
                <TimeBlock>
                  <TouchableOpacity onPress={() => adjustTime('h', 1)}>
                    <ChevronUp size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TimeValue theme={theme}>{hour.toString().padStart(2, '0')}</TimeValue>
                  <TouchableOpacity onPress={() => adjustTime('h', -1)}>
                    <ChevronDown size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                </TimeBlock>
                <TimeSeparator theme={theme}>:</TimeSeparator>
                <TimeBlock>
                  <TouchableOpacity onPress={() => adjustTime('m', 5)}>
                    <ChevronUp size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TimeValue theme={theme}>{minute.toString().padStart(2, '0')}</TimeValue>
                  <TouchableOpacity onPress={() => adjustTime('m', -5)}>
                    <ChevronDown size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                </TimeBlock>
              </TimePickerContainer>

              <SubmitButton onPress={handleCreate} theme={theme}>
                <SubmitButtonText theme={theme}>WYŚLIJ DO SERWISU</SubmitButtonText>
              </SubmitButton>
            </ModalInner>
          </ModalContent>
        </ModalOverlay>
      </Modal>

      <Modal visible={photoModalVisible} transparent animationType="slide">
        <ModalOverlay>
          <PhotoModalContainer theme={theme}>
            <ModalTitleText theme={theme}>Opis wykonanych prac</ModalTitleText>
            {tempPhoto && <PhotoPreview source={{ uri: tempPhoto }} theme={theme} />}
            <TextArea
              theme={theme}
              placeholder="Napisz co zostało zrobione..."
              value={comment}
              onChangeText={setComment}
              multiline
              placeholderTextColor={theme.colors.textSecondary}
            />
            <ActionButtons theme={theme}>
              <CancelBtn onPress={() => setPhotoModalVisible(false)} theme={theme}>
                <RNText style={{ color: theme.colors.textSecondary }}>Anuluj</RNText>
              </CancelBtn>
              <ReportBtn onPress={uploadPhotoWithComment} disabled={uploading} theme={theme}>
                {uploading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <SubmitButtonText theme={theme}>WYŚLIJ RAPORT</SubmitButtonText>
                )}
              </ReportBtn>
            </ActionButtons>
          </PhotoModalContainer>
        </ModalOverlay>
      </Modal>
    </Container>
  );
};

export default ServiceScreen;
