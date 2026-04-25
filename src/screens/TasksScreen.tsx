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
} from 'react-native';
import styled from 'styled-components/native';
import {
  collection,
  query,
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

const TasksScreen = () => {
  const { role, userData } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
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

  useEffect(() => {
    const q = query(collection(db, 'tasks'));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Task);
        const sorted = data.sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return (a.time || '00:00').localeCompare(b.time || '00:00');
        });
        setTasks(sorted);
        setLoading(false);
        const todayTasks = data.filter((t) => {
          try {
            return isToday(parseISO(t.date)) && !t.done;
          } catch (e) {
            return false;
          }
        });
        setBadgeCount(todayTasks.length);
        scheduleDailyReminder(todayTasks.length, userData?.notificationStart || '09:00');
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [userData]);

  const saveTask = async () => {
    if (!title.trim()) return notify.error('Podaj tytuł');
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const taskData = {
      title,
      description,
      date: selectedDate,
      time: timeStr,
      updatedAt: serverTimestamp(),
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
      const fileUri = FileSystem.cacheDirectory + 'task_photo.jpg';
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
      Alert.alert('Usuń', 'Czy напевно?', [
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
                    <TaskInfo onPress={() => toggleTask(item.id, item.done)}>
                      <TaskTitle theme={theme} done={item.done}>
                        {item.title}
                      </TaskTitle>
                      <RNText style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                        {item.date} {item.time}
                      </RNText>
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
                          <RNText
                            style={{
                              fontSize: 10,
                              fontWeight: 'bold',
                              color: theme.colors.success,
                              position: 'absolute',
                              top: 0,
                              right: 0,
                            }}
                          >
                            {item.photos?.length}
                          </RNText>
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

                        {item.photos?.map((photo, idx) => (
                          <TaskImgThumb
                            key={idx}
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
              setModalVisible(true);
            }}
          >
            <Plus size={30} color="white" />
          </AddButton>
        )}

        <Modal visible={viewerVisible} transparent animationType="fade">
          <ViewerOverlay>
            <TouchableOpacity
              style={{ position: 'absolute', top: 50, right: 20, zIndex: 10 }}
              onPress={() => setViewerVisible(false)}
            >
              <X size={30} color="white" />
            </TouchableOpacity>
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
            <ScrollView
              style={{
                backgroundColor: 'white',
                width: '100%',
                maxWidth: 600,
                borderRadius: 15,
                maxHeight: '95%',
              }}
            >
              <View style={{ padding: 25 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 20,
                  }}
                >
                  <RNText style={{ fontSize: 20, fontWeight: 'bold' }}>
                    {editingId ? 'Edytuj' : 'Nowe zadanie'}
                  </RNText>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <X size={24} />
                  </TouchableOpacity>
                </View>
                <RNText
                  style={{ fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 8 }}
                >
                  TYTUŁ
                </RNText>
                <styled.TextInput
                  style={{
                    backgroundColor: '#f8f9fa',
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 15,
                    fontSize: 16,
                    border: '1px solid #eee',
                  }}
                  placeholder="Co зробити?"
                  value={title}
                  onChangeText={setTitle}
                />
                <RNText
                  style={{ fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 8 }}
                >
                  OPIS
                </RNText>
                <styled.TextInput
                  style={{
                    backgroundColor: '#f8f9fa',
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 15,
                    fontSize: 16,
                    border: '1px solid #eee',
                    height: 70,
                    textAlignVertical: 'top',
                  }}
                  placeholder="Szczegóły..."
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
                <RNText
                  style={{ fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 8 }}
                >
                  DATA
                </RNText>
                <Calendar
                  onDayPress={(day) => setSelectedDate(day.dateString)}
                  markedDates={{
                    [selectedDate]: { selected: true, selectedColor: theme.colors.primary },
                  }}
                />
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.colors.primary,
                    padding: 18,
                    borderRadius: 10,
                    alignItems: 'center',
                    marginTop: 20,
                  }}
                  onPress={saveTask}
                >
                  <RNText style={{ color: 'white', fontWeight: 'bold' }}>ZAPISZ</RNText>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </ModalOverlay>
        </Modal>

        {uploading && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'rgba(255,255,255,0.7)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
            }}
          >
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}
      </Container>
    </GestureHandlerRootView>
  );
};

export default TasksScreen;
