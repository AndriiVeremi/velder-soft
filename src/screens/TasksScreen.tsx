import React, { useState, useEffect } from 'react';
import {
  View,
  Text as RNText,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
  Image,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import styled from 'styled-components/native';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Calendar } from 'react-native-calendars';
import { db, storage } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { theme } from '../config/theme';
import {
  CheckCircle2,
  Plus,
  X,
  Trash2,
  Camera,
  Calendar as CalendarIcon,
  Clock,
  ChevronDown,
  ChevronUp,
  Edit2,
  Download,
  Eye,
} from 'lucide-react-native';
import { format, isToday, parseISO } from 'date-fns';
import { notify } from '../utils/notify';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { setBadgeCount, scheduleDailyReminder } from '../utils/notifications';

const { width, height } = Dimensions.get('window');

interface TaskPhoto {
  url: string;
  path: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  done: boolean;
  photos?: TaskPhoto[];
  photoUrl?: string;
  photoPath?: string;
  wasMoved?: boolean;
  assignedTo: string;
  assignedToName?: string;
}

interface UserListItem {
  id: string;
  name: string;
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

const TaskCard = styled.View`
  background-color: ${(props) => props.theme.colors.surface};
  margin: ${(props) => props.theme.spacing.sm}px ${(props) => props.theme.spacing.md}px;
  border-radius: ${(props) => props.theme.borderRadius.md}px;
  border: 1px solid ${(props) => props.theme.colors.border};
  overflow: hidden;
`;

const TaskMainRow = styled.View`
  flex-direction: row;
  padding: ${(props) => props.theme.spacing.md}px;
  align-items: center;
  background-color: white;
`;

const TaskInfo = styled.View`
  flex: 1;
  margin-left: 12px;
`;

const TaskTitle = styled(RNText)<{ done?: boolean }>`
  font-size: 16px;
  font-weight: bold;
  color: ${(props) => (props.done ? props.theme.colors.textSecondary : props.theme.colors.text)};
  text-decoration: ${(props) => (props.done ? 'line-through' : 'none')};
`;

const LeftAction = styled.View`
  background-color: ${(props) => props.theme.colors.success};
  justify-content: center;
  align-items: flex-start;
  padding-left: 20px;
  margin: ${(props) => props.theme.spacing.sm}px ${(props) => props.theme.spacing.md}px;
  border-radius: ${(props) => props.theme.borderRadius.md}px;
  flex: 1;
`;

const TaskDescriptionText = styled(RNText)`
  font-size: 14px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 4px;
`;

const TaskDetailsContainer = styled.View`
  padding: 15px;
  border-top-width: 1px;
  border-top-color: #f0f0f0;
`;

const PhotosScrollView = styled.ScrollView`
  flex-direction: row;
  margin-top: 10px;
`;

const TaskImgThumb = styled.TouchableOpacity`
  width: 100px;
  height: 100px;
  margin-right: 8px;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f0f0f0;
`;

const ActionButtons = styled.View`
  flex-direction: row;
  align-items: center;
`;

const IconButton = styled.TouchableOpacity`
  padding: 8px;
  margin-left: 5px;
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
  z-index: 100;
`;

const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

const ViewerOverlay = styled.View`
  flex: 1;
  background-color: black;
  justify-content: center;
  align-items: center;
`;

const ViewerImage = styled.Image`
  width: ${width}px;
  height: ${height * 0.7}px;
  resize-mode: contain;
`;

const ViewerActions = styled.View`
  flex-direction: row;
  position: absolute;
  bottom: 40px;
  width: 100%;
  justify-content: space-evenly;
`;

const ViewerButton = styled.TouchableOpacity`
  background-color: rgba(255, 255, 255, 0.2);
  padding: 15px 30px;
  border-radius: 30px;
  flex-direction: row;
  align-items: center;
`;

const DateTimeText = styled(RNText)`
  font-size: 12px;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const PhotoCountBadge = styled(RNText)`
  font-size: 10px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.success};
  position: absolute;
  top: 0;
  right: 0;
`;

const CloseViewerButton = styled.TouchableOpacity`
  position: absolute;
  top: 50px;
  right: 20px;
  z-index: 10;
`;

const ModalScrollView = styled.ScrollView.attrs({
  contentContainerStyle: { flexGrow: 1, paddingBottom: 40 },
})`
  background-color: white;
  width: 100%;
  max-width: 600px;
  border-radius: 15px;
  max-height: 95%;
`;

const ModalContentContainer = styled.View`
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
  font-size: 14px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-bottom: 8px;
`;

const StyledTextInput = styled.TextInput`
  background-color: ${(props) => props.theme.colors.background};
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 15px;
  font-size: 16px;
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const TextArea = styled(StyledTextInput)`
  height: 70px;
`;

const SaveButton = styled.TouchableOpacity`
  background-color: ${(props) => props.theme.colors.primary};
  padding: 18px;
  border-radius: 10px;
  align-items: center;
  margin-top: 20px;
`;

const SaveButtonText = styled(RNText)`
  color: white;
  font-weight: bold;
`;

const UserChipContainer = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  margin-bottom: 15px;
`;

const UserChip = styled.TouchableOpacity<{ selected: boolean }>`
  background-color: ${(props) => (props.selected ? props.theme.colors.primary : '#f0f0f0')};
  padding: 8px 12px;
  border-radius: 20px;
  margin-right: 8px;
  margin-bottom: 8px;
`;

const UserChipText = styled(RNText)<{ selected: boolean }>`
  color: ${(props) => (props.selected ? 'white' : props.theme.colors.text)};
  font-size: 12px;
  font-weight: bold;
`;

const AssignedBadge = styled.View`
  background-color: #e0f2f1;
  padding: 2px 8px;
  border-radius: 4px;
  align-self: flex-start;
  margin-top: 5px;
`;

const AssignedText = styled(RNText)`
  font-size: 10px;
  color: #00796b;
  font-weight: bold;
`;

const TimePickerContainer = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #f8f9fa;
  padding: 20px;
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

const UploadOverlay = styled.View`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(255, 255, 255, 0.7);
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const TasksScreen = () => {
  const { user, role, userData } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [assignedUserId, setAssignedUserId] = useState<string>('');

  useEffect(() => {
    if (role === 'DIRECTOR') {
      const uQ = query(collection(db, 'users'), where('isActive', '==', true));
      const unsubUsers = onSnapshot(uQ, (snap) => {
        const uList = snap.docs.map((d) => ({ id: d.id, name: d.data().name || 'Anonim' }));
        setUsers(uList);
      });
      return () => unsubUsers();
    }
  }, [role]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'tasks'));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        try {
          const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Task);
          const sorted = data.sort((a, b) => {
            const dateA = a.date || '';
            const dateB = b.date || '';
            if (dateA !== dateB) return dateB.localeCompare(dateA);
            const timeA = a.time || '00:00';
            const timeB = b.time || '00:00';
            return timeA.localeCompare(timeB);
          });
          setTasks(sorted);

          const todayStr = format(new Date(), 'yyyy-MM-dd');
          const todayTasksCount = data.filter((t) => t.date === todayStr && !t.done).length;

          setBadgeCount(todayTasksCount);
          scheduleDailyReminder(todayTasksCount, userData?.notificationStart || '09:00');
          setLoading(false);
        } catch (err) {
          console.error('Error processing tasks:', err);
          setLoading(false);
        }
      },
      (error) => {
        console.error('Firestore onSnapshot error:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [userData, role, user]);

  const saveTask = async () => {
    if (!title.trim()) return notify.error('Podaj tytuł');
    if (role === 'DIRECTOR' && !assignedUserId) return notify.error('Wybierz pracownika');

    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const selectedUser = users.find((u) => u.id === assignedUserId);

    const taskData = {
      title,
      description,
      date: selectedDate,
      time: timeStr,
      updatedAt: serverTimestamp(),
      assignedTo: assignedUserId || user?.uid,
      assignedToName: selectedUser?.name || userData?.name || 'Pracownik',
    };
    try {
      if (editingId) await updateDoc(doc(db, 'tasks', editingId), taskData);
      else
        await addDoc(collection(db, 'tasks'), {
          ...taskData,
          done: false,
          createdAt: serverTimestamp(),
          photos: [],
        });
      setModalVisible(false);
      setAssignedUserId('');
      notify.success('Zapisano');
    } catch (e) {
      notify.error('Błąd zapisu');
    }
  };

  const toggleTask = async (id: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'tasks', id), { done: !currentStatus });
    if (!currentStatus) notify.success('Gotowe!');
  };

  const addPhoto = async (task: Task) => {
    const currentPhotos = task.photos || [];
    if (currentPhotos.length >= 5) {
      notify.error('Maksymalnie 5 zdjęć do jednego zadania');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      quality: 0.5,
      allowsEditing: false,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      const filename = `task_photos/${task.id}_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      const newPhoto = { url, path: filename };
      await updateDoc(doc(db, 'tasks', task.id), {
        photos: [...currentPhotos, newPhoto],
        done: true,
      });
      notify.success(`Dodano zdjęcie (${currentPhotos.length + 1}/5)`);
    } catch (e) {
      notify.error('Błąd');
    } finally {
      setUploading(false);
    }
  };

  const downloadImage = async () => {
    if (!viewerUrl) return;
    if (Platform.OS === 'web') {
      window.open(viewerUrl, '_blank');
      return;
    }
    setDownloading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return notify.error('Brak uprawnień');
      const fileUri = (FileSystem as any).cacheDirectory + 'task_photo.jpg';
      const { uri } = await FileSystem.downloadAsync(viewerUrl, fileUri);
      await MediaLibrary.saveToLibraryAsync(uri);
      notify.success('Zapisano w galerii');
    } catch (e) {
      notify.error('Błąd');
    } finally {
      setDownloading(false);
    }
  };

  const deleteTask = (id: string) => {
    const performDelete = async () => {
      await deleteDoc(doc(db, 'tasks', id));
      notify.success('Usunięto');
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Usunąć?')) performDelete();
    } else {
      Alert.alert('Usuń', 'Czy napewno?', [
        { text: 'Nie' },
        { text: 'Tak', onPress: performDelete },
      ]);
    }
  };

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

  const renderLeftActions = () => (
    <LeftAction theme={theme}>
      <CheckCircle2 size={30} color="white" />
    </LeftAction>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Container theme={theme}>
        <Header theme={theme}>
          <Title theme={theme}>Zadania</Title>
        </Header>
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Swipeable
                renderLeftActions={renderLeftActions}
                onSwipeableOpen={(dir) => dir === 'left' && toggleTask(item.id, item.done)}
              >
                <TaskCard theme={theme}>
                  <TaskMainRow theme={theme}>
                    <TouchableOpacity onPress={() => toggleTask(item.id, item.done)}>
                      <CheckCircle2
                        size={24}
                        color={item.done ? theme.colors.success : theme.colors.border}
                      />
                    </TouchableOpacity>
                    <TaskInfo onTouchEnd={() => toggleTask(item.id, item.done)}>
                      <TaskTitle theme={theme} done={item.done}>
                        {item.title}
                      </TaskTitle>
                      <DateTimeText theme={theme}>
                        {item.date} {item.time}
                      </DateTimeText>
                      {role === 'DIRECTOR' && item.assignedToName && (
                        <AssignedBadge>
                          <AssignedText>Wykonawca: {item.assignedToName}</AssignedText>
                        </AssignedBadge>
                      )}
                    </TaskInfo>
                    <ActionButtons>
                      <IconButton onPress={() => addPhoto(item)}>
                        <Camera
                          size={22}
                          color={
                            (item.photos?.length || 0) > 0
                              ? theme.colors.success
                              : theme.colors.textSecondary
                          }
                        />
                        {(item.photos?.length || 0) > 0 && (
                          <PhotoCountBadge theme={theme}>{item.photos?.length}</PhotoCountBadge>
                        )}
                      </IconButton>
                      {role === 'DIRECTOR' && (
                        <>
                          <IconButton
                            onPress={() => {
                              setEditingId(item.id);
                              setTitle(item.title);
                              setDescription(item.description || '');
                              setSelectedDate(item.date);
                              setAssignedUserId(item.assignedTo);
                              setModalVisible(true);
                            }}
                          >
                            <Edit2 size={20} color={theme.colors.primary} />
                          </IconButton>
                          <IconButton onPress={() => deleteTask(item.id)}>
                            <Trash2 size={20} color={theme.colors.error} />
                          </IconButton>
                        </>
                      )}
                    </ActionButtons>
                  </TaskMainRow>
                  {(item.description ||
                    (item.photos && item.photos.length > 0) ||
                    item.photoUrl) && (
                    <TaskDetailsContainer theme={theme}>
                      {item.description && (
                        <TaskDescriptionText theme={theme}>{item.description}</TaskDescriptionText>
                      )}

                      <PhotosScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {item.photoUrl && !item.photos?.some((p) => p.url === item.photoUrl) && (
                          <TaskImgThumb
                            onPress={() => {
                              setViewerUrl(item.photoUrl!);
                              setViewerVisible(true);
                            }}
                          >
                            <Image
                              source={{ uri: item.photoUrl }}
                              style={{ width: '100%', height: '100%' }}
                            />
                          </TaskImgThumb>
                        )}

                        {item.photos?.map((photo) => (
                          <TaskImgThumb
                            key={photo.path}
                            onPress={() => {
                              setViewerUrl(photo.url);
                              setViewerVisible(true);
                            }}
                          >
                            <Image
                              source={{ uri: photo.url }}
                              style={{ width: '100%', height: '100%' }}
                            />
                          </TaskImgThumb>
                        ))}
                      </PhotosScrollView>
                    </TaskDetailsContainer>
                  )}
                </TaskCard>
              </Swipeable>
            )}
          />
        )}
        {role === 'DIRECTOR' && (
          <AddButton
            theme={theme}
            onPress={() => {
              setEditingId(null);
              setTitle('');
              setDescription('');
              setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
              setHour(9);
              setMinute(0);
              setModalVisible(true);
            }}
          >
            <Plus size={30} color="white" />
          </AddButton>
        )}

        <Modal visible={viewerVisible} transparent animationType="fade">
          <ViewerOverlay>
            <CloseViewerButton onPress={() => setViewerVisible(false)}>
              <X size={30} color="white" />
            </CloseViewerButton>
            {viewerUrl && <ViewerImage source={{ uri: viewerUrl }} />}
            <ViewerActions>
              <ViewerButton onPress={downloadImage} disabled={downloading}>
                {downloading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Download size={20} color="white" />
                    <RNText style={{ color: 'white', marginLeft: 10, fontWeight: 'bold' }}>
                      Zapisz
                    </RNText>
                  </>
                )}
              </ViewerButton>
            </ViewerActions>
          </ViewerOverlay>
        </Modal>

        <Modal visible={modalVisible} transparent animationType="slide">
          <ModalOverlay>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ width: '100%', alignItems: 'center' }}
            >
              <ModalScrollView theme={theme}>
                <ModalContentContainer theme={theme}>
                  <ModalHeader theme={theme}>
                    <ModalTitleText theme={theme}>
                      {editingId ? 'Edytuj' : 'Nowe zadanie'}
                    </ModalTitleText>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                      <X size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                  </ModalHeader>
                  <InputLabel theme={theme}>TYTUŁ</InputLabel>
                  <StyledTextInput
                    theme={theme}
                    placeholder="Co zrobic?"
                    value={title}
                    onChangeText={setTitle}
                    placeholderTextColor={theme.colors.textSecondary}
                  />

                  {role === 'DIRECTOR' && (
                    <>
                      <InputLabel theme={theme}>PRZYPISZ DO PRACOWNIKA</InputLabel>
                      <UserChipContainer>
                        {users.map((u) => (
                          <UserChip
                            key={u.id}
                            selected={assignedUserId === u.id}
                            onPress={() => setAssignedUserId(u.id)}
                            theme={theme}
                          >
                            <UserChipText selected={assignedUserId === u.id} theme={theme}>
                              {u.name}
                            </UserChipText>
                          </UserChip>
                        ))}
                      </UserChipContainer>
                    </>
                  )}

                  <InputLabel theme={theme}>OPIS</InputLabel>
                  <TextArea
                    theme={theme}
                    placeholder="Szczegóły..."
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                  <InputLabel theme={theme}>DATA</InputLabel>
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

                  <SaveButton theme={theme} onPress={saveTask}>
                    <SaveButtonText theme={theme}>ZAPISZ</SaveButtonText>
                  </SaveButton>
                </ModalContentContainer>
              </ModalScrollView>
            </KeyboardAvoidingView>
          </ModalOverlay>
        </Modal>

        {uploading && (
          <UploadOverlay theme={theme}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </UploadOverlay>
        )}
      </Container>
    </GestureHandlerRootView>
  );
};

export default TasksScreen;
