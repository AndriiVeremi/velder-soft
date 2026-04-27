import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text as RNText,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput,
  Platform,
  Alert,
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
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
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
} from 'lucide-react-native';
import { format, addDays, subDays, startOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { notify } from '../utils/notify';
import { pickAndUploadPhoto } from '../utils/upload';
import { TimePicker, ModalOverlay, ModalContent } from '../components/CommonUI';
import { Task } from '../types';

const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

const DateHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  background-color: ${(props) => props.theme.colors.surface};
  border-bottom-width: 1px;
  border-bottom-color: ${(props) => props.theme.colors.border};
`;

const DateText = styled(RNText)`
  font-size: 18px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
`;

const TaskCard = styled.View<{ done: boolean }>`
  background-color: ${(props) => props.theme.colors.surface};
  margin: 8px 15px;
  padding: 16px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
  opacity: ${(props) => (props.done ? 0.7 : 1)};
`;

const TaskTitle = styled(RNText)<{ done: boolean }>`
  font-size: 16px;
  font-weight: 600;
  color: ${(props) => (props.done ? props.theme.colors.textSecondary : props.theme.colors.text)};
  text-decoration: ${(props) => (props.done ? 'line-through' : 'none')};
  flex: 1;
`;

const TaskMeta = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 8px;
`;

const MetaText = styled(RNText)`
  font-size: 13px;
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
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.25;
  shadow-radius: 3.84px;
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
  font-size: 14px;
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

const TasksScreen = () => {
  const { user, role } = useAuth();
  const { theme } = useAppTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

  // New task state
  const [title, setTitle] = useState('');
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);

  const dateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'tasks'), where('date', '==', dateStr));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allTasks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Task);
      // Filter by user in memory for reliability and backward compatibility
      const filtered =
        role === 'DIRECTOR' ? allTasks : allTasks.filter((t) => t.assignedTo === user.uid);

      setTasks(filtered.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00')));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, dateStr, role]);

  const handleAddTask = async () => {
    if (!title.trim()) return notify.error('Wpisz tytuł zadania');

    try {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      await addDoc(collection(db, 'tasks'), {
        title: title.trim(),
        date: dateStr,
        time,
        done: false,
        assignedTo: user?.uid,
        createdAt: serverTimestamp(),
      });
      setModalVisible(false);
      setTitle('');
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
    const perform = async () => {
      try {
        await deleteDoc(doc(db, 'tasks', id));
        notify.success('Zadanie usunięte');
      } catch (e) {
        notify.error('Błąd usuwania');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Usunąć zadanie?')) perform();
    } else {
      Alert.alert('Usuń', 'Czy na pewno?', [
        { text: 'Anuluj' },
        { text: 'Tak', onPress: perform, style: 'destructive' },
      ]);
    }
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
            <TaskCard theme={theme} done={item.done}>
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

              <TaskMeta>
                <Clock size={14} color={theme.colors.primary} />
                <MetaText theme={theme}>{item.time || 'Brak czasu'}</MetaText>
              </TaskMeta>

              {item.photoUrl && <ImagePreview source={{ uri: item.photoUrl }} />}

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
              }}
            >
              Brak zadań на цей день.
            </RNText>
          }
        />
      )}

      {role === 'EMPLOYEE' && (
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
              <RNText style={{ fontSize: 20, fontWeight: 'bold', color: theme.colors.text }}>
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
              <RNText style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                Dodaj zadanie
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

export default TasksScreen;
