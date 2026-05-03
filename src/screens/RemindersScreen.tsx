import React, { useState, useEffect } from 'react';
import { View, Text as RNText, FlatList, ActivityIndicator, Platform } from 'react-native';
import styled from 'styled-components/native';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { notify } from '../utils/notify';
import { confirmDelete } from '../utils/confirm';
import { Fab, ScreenHeader, ScreenTitle } from '../components/CommonUI';
import { Plus } from 'lucide-react-native';
import { format } from 'date-fns';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { REMINDER_REPEAT_COUNT, REMINDER_SIGNALS_COUNT, REMINDER_INTERVAL_SECONDS } from '../utils/notifications';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { parseVoiceReminder } from '../utils/voiceParser';
import { ReminderCardComponent } from '../components/tasks/ReminderCard';
import { AddReminderModal } from '../components/tasks/AddReminderModal';

const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

interface Reminder {
  id: string;
  userId: string;
  title: string;
  date: string;
  time: string;
  done: boolean;
  createdAt: any;
}

const RemindersScreen = () => {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const [title, setTitle] = useState('');
  const [date, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [hour, setHour] = useState(10);
  const [minute, setMinute] = useState(0);

  const { isListening, toggleListening } = useVoiceRecognition({
    onResult: (transcript) => {
      const parsed = parseVoiceReminder(transcript);
      setTitle(parsed.title);
      setSelectedDate(parsed.date);
      setHour(parsed.hour);
      setMinute(parsed.minute);
    },
  });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'reminders'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Reminder);
        setReminders(
          data.sort((a, b) => {
            // Сортуємо: спочатку за датою, потім за часом
            const dateCompare = (a.date || '').localeCompare(b.date || '');
            if (dateCompare !== 0) return dateCompare;

            const timeCompare = (a.time || '').localeCompare(b.time || '');
            if (timeCompare !== 0) return timeCompare;

            // Якщо дата і час однакові (або нові), використовуємо час створення
            const timeA = a.createdAt?.toMillis?.() || Date.now();
            const timeB = b.createdAt?.toMillis?.() || Date.now();
            return timeB - timeA;
          })
        );
        setLoading(false);
      },
      (error) => {
        console.error('Reminders fetch error:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const handleAdd = async () => {
    if (!title.trim()) return notify.error('Wpisz treść przypomnienia');
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    const [y, m, d] = date.split('-').map(Number);
    const selectedDateTime = new Date(y, m - 1, d, hour, minute, 0);
    if (selectedDateTime <= new Date()) return notify.error('Wybierz przyszłą datę i godzinę');

    try {
      const docRef = await addDoc(collection(db, 'reminders'), {
        userId: user?.uid,
        title: title.trim(),
        date,
        time: timeStr,
        done: false,
        createdAt: serverTimestamp(),
      });

      if (Platform.OS !== 'web') {
        const [y, m, d] = date.split('-').map(Number);
        const baseDate = new Date(y, m - 1, d, hour, minute, 0);

        for (let i = 0; i < REMINDER_SIGNALS_COUNT; i++) {
          const scheduleDate = new Date(baseDate.getTime() + i * REMINDER_INTERVAL_SECONDS * 1000);
          if (scheduleDate > new Date()) {
            await Notifications.scheduleNotificationAsync({
              identifier: `${docRef.id}_${i}`,
              content: {
                title: 'Ważne przypomnienie! 🔔',
                body: title.trim(),
                sound: 'reminder.wav',
                categoryIdentifier: 'reminder',
                data: { reminderId: docRef.id, title: title.trim() },
              },
              trigger: {
                type: SchedulableTriggerInputTypes.DATE,
                date: scheduleDate,
                channelId: 'reminders',
              },
            });
          }
        }
      }

      setModalVisible(false);
      setTitle('');
      setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
      setHour(10);
      setMinute(0);
      notify.success('Przypomnienie dodane');
    } catch (e) {
      notify.error('Błąd zapisu');
    }
  };

  const cancelReminderSequence = async (id: string) => {
    if (Platform.OS === 'web') return;
    for (let i = 0; i < REMINDER_REPEAT_COUNT; i++) {
      try {
        await Notifications.cancelScheduledNotificationAsync(`${id}_${i}`);
      } catch (e) {}
    }
  };

  const toggleDone = async (item: Reminder) => {
    const newStatus = !item.done;
    await updateDoc(doc(db, 'reminders', item.id), { done: newStatus });
    if (newStatus) await cancelReminderSequence(item.id);
  };

  const deleteReminder = (id: string) => {
    confirmDelete('Czy na pewno?', async () => {
      await deleteDoc(doc(db, 'reminders', id));
      await cancelReminderSequence(id);
      notify.success('Usunięto');
    });
  };

  return (
    <Container theme={theme}>
      <ScreenHeader theme={theme}>
        <ScreenTitle theme={theme}>Moje Przypomnienia</ScreenTitle>
      </ScreenHeader>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 50 }} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ReminderCardComponent
              item={item}
              theme={theme}
              onToggle={toggleDone}
              onDelete={deleteReminder}
            />
          )}
          ListEmptyComponent={
            <RNText
              style={{ textAlign: 'center', marginTop: 50, color: theme.colors.textSecondary }}
            >
              Brak przypomnień.
            </RNText>
          }
        />
      )}
<Fab theme={theme} onPress={() => setModalVisible(true)}>
        <Plus size={30} color="white" />
      </Fab>
      <AddReminderModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={handleAdd}
        theme={theme}
        title={title}
        setTitle={setTitle}
        date={date}
        setDate={setSelectedDate}
        hour={hour}
        setHour={setHour}
        minute={minute}
        setMinute={setMinute}
        isListening={isListening}
        toggleListening={toggleListening}
      />
    </Container>
  );
};

export default RemindersScreen;
