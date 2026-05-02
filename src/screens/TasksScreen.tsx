import React, { useState, useEffect, useMemo } from 'react';
import { View, Text as RNText, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
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
import { Plus, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { format, addDays, subDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { notify } from '../utils/notify';
import { confirmDelete } from '../utils/confirm';
import { useMarkAsRead } from '../hooks/useMarkAsRead';
import { Fab, UploadOverlay } from '../components/CommonUI';
import { Task } from '../types';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { parseVoiceReminder } from '../utils/voiceParser';
import { TaskCardComponent } from '../components/tasks/TaskCard';
import { AddTaskModal } from '../components/tasks/AddTaskModal';
import { playDoneSound } from '../utils/audio';
import { pickAndUploadPhoto } from '../utils/upload';
import styled from 'styled-components/native';

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

interface Worker {
  id: string;
  name: string;
  pushToken?: string;
  notificationStart?: string;
  notificationEnd?: string;
}

const TasksScreen = () => {
  const { user, role, userData } = useAuth();
  const { theme } = useAppTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scheduleMarkAsRead = useMarkAsRead('tasks');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('all');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [isUrgent, setIsUrgent] = useState(false);

  const { isListening, toggleListening } = useVoiceRecognition({
    onResult: (transcript) => {
      const parsed = parseVoiceReminder(transcript);
      setDescription(parsed.title);
      setHour(parsed.hour);
      setMinute(parsed.minute);
    },
  });

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
  }, [user, dateStr, role, scheduleMarkAsRead]);

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
        priority: isUrgent ? 'URGENT' : 'NORMAL',
        createdAt: serverTimestamp(),
      });

      if (role === 'DIRECTOR') {
        try {
          const targetTokens: {
            token: string;
            notificationStart?: string;
            notificationEnd?: string;
          }[] = [];

          const usersSnap = await getDocs(
            query(collection(db, 'users'), where('isActive', '==', true))
          );

          if (selectedWorkerId === 'all') {
            usersSnap.forEach((docSnap) => {
              const u = docSnap.data();
              if (u.pushToken && u.role === 'EMPLOYEE' && docSnap.id !== user?.uid) {
                targetTokens.push({
                  token: u.pushToken,
                  notificationStart: u.notificationStart,
                  notificationEnd: u.notificationEnd,
                });
              }
            });
          } else {
            const workerDoc = usersSnap.docs.find((d) => d.id === selectedWorkerId);
            if (workerDoc) {
              const u = workerDoc.data();
              if (u.pushToken && workerDoc.id !== user?.uid) {
                targetTokens.push({
                  token: u.pushToken,
                  notificationStart: u.notificationStart,
                  notificationEnd: u.notificationEnd,
                });
              }
            }
          }
          
          if (targetTokens.length > 0) {
            await sendPushNotification(
              targetTokens,
              isUrgent ? '🚨 PILNE ZADANIE! 🚨' : 'Nowe zadanie! 📋',
              `${title.trim()}\n${dateStr} o ${time}`,
              'alerts'
            );
          }
        } catch (pushErr) {
          console.warn('[Push Error] TasksScreen:', pushErr);
        }
      }

      setModalVisible(false);
      setTitle('');
      setDescription('');
      setIsUrgent(false);
      setSelectedWorkerId('all');
      await playDoneSound();
      notify.success('Zadanie dodane');
    } catch (e) {
      notify.error('Błąd zapisu');
    }
  };

  const toggleTask = async (task: Task) => {
    const newStatus = !task.done;
    try {
      await updateDoc(doc(db, 'tasks', task.id), { done: newStatus });
      if (newStatus && role === 'EMPLOYEE') {
        try {
          const directorsSnap = await getDocs(
            query(collection(db, 'users'), where('role', '==', 'DIRECTOR'))
          );
          const tokens: { token: string; notificationStart?: string; notificationEnd?: string }[] =
            [];
          directorsSnap.forEach((d) => {
            const data = d.data();
            if (data.pushToken && d.id !== user?.uid)
              tokens.push({
                token: data.pushToken,
                notificationStart: data.notificationStart,
                notificationEnd: data.notificationEnd,
              });
          });
          if (tokens.length > 0) {
            await sendPushNotification(
              tokens,
              task.priority === 'URGENT' ? '🚨 PILNE ZADANIE WYKONANE! ✅' : 'Zadanie wykonane! ✅',
              `${userData?.name || 'Pracownik'} oznaczył jako wykonane: ${task.title}`,
              'done'
            );
          }
        } catch (pushErr) {
          console.warn('Failed to notify director:', pushErr);
        }
      }
    } catch (e) {
      notify.error('Błąd aktualizacji');
    }
  };

  const handleAddPhoto = async (task: Task) => {
    const result = await pickAndUploadPhoto('task_photos', `${task.id}_${Date.now()}.jpg`);
    if (result) {
      try {
        await updateDoc(doc(db, 'tasks', task.id), {
          photoUrl: result.photoUrl,
          photoPath: result.photoPath,
        });
        notify.success('Zdjęcie dodane');
      } catch (e) {
        notify.error('Błąd zapisu');
      }
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
            <TaskCardComponent
              task={item}
              role={role || ''}
              theme={theme}
              workers={workers}
              onToggle={toggleTask}
              onAddPhoto={handleAddPhoto}
              onDelete={handleDeleteTask}
            />
          )}
          ListEmptyComponent={
            <RNText
              style={{ textAlign: 'center', marginTop: 50, color: theme.colors.textSecondary }}
            >
              Brak zadań w tym dniu.
            </RNText>
          }
        />
      )}

      {role === 'DIRECTOR' && (
        <Fab theme={theme} onPress={() => setModalVisible(true)}>
          <Plus size={30} color="white" />
        </Fab>
      )}

      <AddTaskModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={handleAddTask}
        theme={theme}
        role={role || ''}
        workers={workers}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        hour={hour}
        setHour={setHour}
        minute={minute}
        setMinute={setMinute}
        isUrgent={isUrgent}
        setIsUrgent={setIsUrgent}
        selectedWorkerId={selectedWorkerId}
        setSelectedWorkerId={setSelectedWorkerId}
        isListening={isListening}
        toggleListening={toggleListening}
      />

      {uploading && (
        <UploadOverlay theme={theme}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </UploadOverlay>
      )}
    </Container>
  );
};

export default TasksScreen;
