import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text as RNText,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import styled from 'styled-components/native';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { sendPushNotification } from '../utils/notifications';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import {
  Plus,
  CheckCircle2,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  Camera,
  X,
  ChevronRight,
  ChevronLeft,
  Download,
} from 'lucide-react-native';
import { format, addDays, subDays, startOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { notify } from '../utils/notify';
import { downloadImage } from '../utils/download';
import { pickAndUploadPhoto } from '../utils/upload';
import { confirmDelete } from '../utils/confirm';
import { useMarkAsRead } from '../hooks/useMarkAsRead';
import { TimePicker, ModalOverlay, ModalContent, UploadOverlay, Fab } from '../components/CommonUI';
import { Task } from '../types';

const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

const DateHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 18px 15px;
  background-color: ${(props) => props.theme.colors.accent};
  border-bottom-width: 1px;
  border-bottom-color: ${(props) => props.theme.colors.border};
`;

const DateText = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.lg}px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.primary};
  text-transform: capitalize;
`;

const TaskCard = styled.View<{ done: boolean }>`
  background-color: ${(props) => props.theme.colors.surface};
  margin: 8px 15px;
  padding: 16px;
  border-radius: 16px;
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
  opacity: ${(props) => (props.done ? 0.8 : 1)};

  /* Shadow for iOS */
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  /* Elevation for Android */
  elevation: 3;
`;

const TaskTitle = styled(RNText)<{ done?: boolean }>`
  font-size: ${(props) => props.theme.fontSize.lg}px;
  font-weight: bold;
  color: ${(props) => (props.done ? props.theme.colors.textSecondary : props.theme.colors.text)};
  text-decoration: ${(props) => (props.done ? 'line-through' : 'none')};
  flex: 1;
`;

const TaskDescription = styled(RNText)<{ done?: boolean }>`
  font-size: ${(props) => props.theme.fontSize.f14}px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 4px;
  margin-left: 36px;
  line-height: 18px;
`;

const TaskMeta = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 8px;
`;

const MetaText = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.sm}px;
  color: ${(props) => props.theme.colors.primary};
  margin-left: 5px;
  font-weight: 500;
`;

const ActionRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  margin-top: 12px;
  border-top-width: 1px;
  border-top-color: ${(props) => props.theme.colors.background};
  padding-top: 10px;
`;

const IconButton = styled.TouchableOpacity`
  padding: 8px;
  margin-left: 10px;
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
  font-size: ${(props) => props.theme.fontSize.md}px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-bottom: 8px;
`;

const ImagePreview = styled.Image`
  width: 100%;
  height: 150px;
  border-radius: 8px;
  margin-top: 10px;
`;

interface Worker {
  id: string;
  name: string;
  pushToken?: string;
  notificationStart?: string;
  notificationEnd?: string;
}

const TasksScreen = () => {
  const { user, role } = useAuth();
  const { theme } = useAppTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scheduleMarkAsRead = useMarkAsRead('tasks');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('all');

  // New task state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);

  const dateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);

  useEffect(() => {
    if (role !== 'DIRECTOR') return;
    getDocs(query(collection(db, 'users'), where('isActive', '==', true))).then((snap) => {
      const list: Worker[] = snap.docs
        .filter((d) => d.data().role !== 'DIRECTOR')
        .map((d) => ({
          id: d.id,
          name: d.data().name,
          pushToken: d.data().pushToken,
          notificationStart: d.data().notificationStart,
          notificationEnd: d.data().notificationEnd,
        }));
      setWorkers(list);
    });
  }, [role]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'tasks'), where('date', '==', dateStr));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allTasks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Task);
      const filtered =
        role === 'DIRECTOR'
          ? allTasks
          : allTasks.filter((t) => t.assignedTo === user.uid || t.assignedTo === 'all');

      setTasks(filtered.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00')));
      setLoading(false);

      if (role === 'EMPLOYEE' && user) {
        const newIds = filtered
          .filter((t) => t.isNew && t.assignedTo === user.uid)
          .map((t) => t.id);
        scheduleMarkAsRead(newIds);
      }
    });

    return unsubscribe;
  }, [user, dateStr, role]);

  const handleAddTask = async () => {
    if (!title.trim()) return notify.error('Wpisz tytuł zadania');

    try {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const assignedTo = role === 'DIRECTOR' ? selectedWorkerId : user?.uid;

      await addDoc(collection(db, 'tasks'), {
        title: title.trim(),
        description: description.trim(),
        date: dateStr,
        time,
        done: false,
        assignedTo,
        isNew: true,
        createdAt: serverTimestamp(),
      });

      if (role === 'DIRECTOR') {
        try {
          const targetWorkers =
            selectedWorkerId === 'all' ? workers : workers.filter((w) => w.id === selectedWorkerId);
          const tokens = targetWorkers
            .filter((w) => w.pushToken)
            .map((w) => ({
              token: w.pushToken as string,
              notificationStart: (w as any).notificationStart,
              notificationEnd: (w as any).notificationEnd,
            }));

          if (tokens.length > 0) {
            await sendPushNotification(
              tokens,
              'Nowe zadanie! 📋',
              `${title.trim()}${description ? '\n' + description.trim() : ''}\n${dateStr} o ${time}`
            );
          }
        } catch (pushErr) {
          console.warn('Failed to send task notification:', pushErr);
        }
      }

      setModalVisible(false);
      setTitle('');
      setDescription('');
      setSelectedWorkerId('all');
      notify.success('Zadanie dodane');
    } catch (e) {
      notify.error('Błąd zapisu');
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      await updateDoc(doc(db, 'tasks', task.id), { done: !task.done });
    } catch (e) {
      notify.error('Błąd aktualizacji');
    }
  };

  const handleDeleteTask = (id: string) => {
    confirmDelete('Usunąć zadanie?', async () => {
      try {
        await deleteDoc(doc(db, 'tasks', id));
        notify.success('Zadanie usunięte');
      } catch (e) {
        notify.error('Błąd usuwania');
      }
    });
  };

  const handleAddPhoto = async (task: Task) => {
    setUploading(true);
    const result = await pickAndUploadPhoto('task_photos', `${task.id}_${Date.now()}.jpg`);
    if (result) {
      try {
        await updateDoc(doc(db, 'tasks', task.id), {
          photoUrl: result.photoUrl,
          photoPath: result.photoPath,
          done: true,
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
      <DateHeader theme={theme}>
        <TouchableOpacity onPress={() => setSelectedDate(subDays(selectedDate, 1))}>
          <ChevronLeft size={28} color={theme.colors.primary} />
        </TouchableOpacity>
        <DateText theme={theme}>{format(selectedDate, 'EEEE, d MMMM', { locale: pl })}</DateText>
        <TouchableOpacity onPress={() => setSelectedDate(addDays(selectedDate, 1))}>
          <ChevronRight size={28} color={theme.colors.primary} />
        </TouchableOpacity>
      </DateHeader>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 50 }} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 10 }}
          renderItem={({ item }) => (
            <TaskCard
              theme={theme}
              done={item.done}
              style={
                item.isNew && !item.done
                  ? { borderColor: theme.colors.primary, borderWidth: 2 }
                  : undefined
              }
            >
              {item.isNew && !item.done && (
                <View
                  style={{
                    backgroundColor: theme.colors.primary,
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    alignSelf: 'flex-start',
                    marginBottom: 6,
                  }}
                >
                  <RNText
                    style={{ color: 'white', fontSize: theme.fontSize.sm, fontWeight: 'bold' }}
                  >
                    NOWE
                  </RNText>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => toggleTask(item)}>
                  <CheckCircle2
                    size={24}
                    color={item.done ? theme.colors.success : theme.colors.border}
                  />
                </TouchableOpacity>
                <TaskTitle theme={theme} done={item.done} style={{ marginLeft: 12 }}>
                  {item.title}
                </TaskTitle>
              </View>

              {item.description ? (
                <TaskDescription theme={theme} done={item.done}>
                  {item.description}
                </TaskDescription>
              ) : null}

              <TaskMeta>
                <Clock size={14} color={theme.colors.primary} />
                <MetaText theme={theme}>{item.time || 'Brak czasu'}</MetaText>
              </TaskMeta>

              {item.photoUrl && (
                <View style={{ position: 'relative', marginTop: 10 }}>
                  <ImagePreview source={{ uri: item.photoUrl }} />
                  <TouchableOpacity
                    onPress={() => downloadImage(item.photoUrl!, `task_${item.id}.jpg`)}
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      right: 10,
                      backgroundColor: 'rgba(0, 135, 68, 0.8)',
                      padding: 8,
                      borderRadius: 10,
                    }}
                  >
                    <Download size={18} color="white" />
                  </TouchableOpacity>
                </View>
              )}

              <ActionRow theme={theme}>
                <IconButton onPress={() => handleAddPhoto(item)}>
                  <Camera
                    size={20}
                    color={item.photoUrl ? theme.colors.success : theme.colors.textSecondary}
                  />
                </IconButton>
                <IconButton onPress={() => handleDeleteTask(item.id)}>
                  <Trash2 size={20} color={theme.colors.error} opacity={0.6} />
                </IconButton>
              </ActionRow>
            </TaskCard>
          )}
          ListEmptyComponent={
            <RNText
              style={{
                textAlign: 'center',
                marginTop: 50,
                color: theme.colors.textSecondary,
                fontSize: theme.fontSize.f15,
              }}
            >
              Brak zadań na ten dzień.
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
            <ScrollView showsVerticalScrollIndicator={false}>
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
                  Nowe zadanie
                </RNText>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <Label theme={theme}>Tytuł zadania</Label>
              <StyledInput
                theme={theme}
                placeholder="Np. Kontrola instalacji"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor={theme.colors.textSecondary}
              />

              <Label theme={theme}>Opis (opcjonalnie)</Label>
              <StyledInput
                theme={theme}
                placeholder="Dodatkowe informacje..."
                value={description}
                onChangeText={setDescription}
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={3}
                style={{ minHeight: 80, textAlignVertical: 'top' }}
              />

              {role === 'DIRECTOR' && (
                <>
                  <Label theme={theme}>Przypisz do</Label>
                  <View style={{ marginBottom: 15 }}>
                    {[{ id: 'all', name: 'Wszyscy pracownicy' }, ...workers].map((w) => (
                      <TouchableOpacity
                        key={w.id}
                        onPress={() => setSelectedWorkerId(w.id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 10,
                          borderRadius: 8,
                          marginBottom: 4,
                          backgroundColor:
                            selectedWorkerId === w.id
                              ? theme.colors.primary + '20'
                              : theme.colors.background,
                          borderWidth: 1,
                          borderColor:
                            selectedWorkerId === w.id ? theme.colors.primary : theme.colors.border,
                        }}
                      >
                        <View
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            borderWidth: 2,
                            borderColor:
                              selectedWorkerId === w.id
                                ? theme.colors.primary
                                : theme.colors.border,
                            backgroundColor:
                              selectedWorkerId === w.id ? theme.colors.primary : 'transparent',
                            marginRight: 10,
                          }}
                        />
                        <RNText style={{ color: theme.colors.text, fontSize: theme.fontSize.f15 }}>
                          {w.name}
                        </RNText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Label theme={theme}>Godzina</Label>
              <TimePicker
                hour={hour}
                minute={minute}
                onHourChange={setHour}
                onMinuteChange={setMinute}
                theme={theme}
              />

              <TouchableOpacity
                onPress={handleAddTask}
                style={{
                  backgroundColor: theme.colors.primary,
                  padding: 16,
                  borderRadius: 12,
                  marginTop: 30,
                  alignItems: 'center',
                }}
              >
                <RNText
                  style={{ color: 'white', fontWeight: 'bold', fontSize: theme.fontSize.f16 }}
                >
                  Dodaj zadanie
                </RNText>
              </TouchableOpacity>
            </ScrollView>
          </ModalContent>
        </ModalOverlay>
      </Modal>

      {uploading && (
        <UploadOverlay>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </UploadOverlay>
      )}
    </Container>
  );
};

export default TasksScreen;
