import React, { useState, useEffect } from 'react';
import {
  View,
  Text as RNText,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Platform,
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
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { getCalendarTheme } from '../config/theme';
import { notify } from '../utils/notify';
import { confirmDelete } from '../utils/confirm';
import { Fab, ModalOverlay, ScreenHeader, ScreenTitle, TimePicker } from '../components/CommonUI';
import {
  Bell,
  Plus,
  X,
  Trash2,
  Clock,
  Calendar as CalendarIcon,
  CheckCircle2,
  Mic,
} from 'lucide-react-native';
import { Calendar } from 'react-native-calendars';
import { format } from 'date-fns';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { REMINDER_REPEAT_COUNT, REMINDER_INTERVAL_MINUTES } from '../utils/notifications';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { parseVoiceReminder } from '../utils/voiceParser';

const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

const ReminderCard = styled.View<{ done: boolean }>`
  background-color: ${(props) => props.theme.colors.surface};
  margin: 8px 15px;
  padding: 15px;
  border-radius: 12px;
  border-left-width: 5px;
  border-left-color: ${(props) =>
    props.done ? props.theme.colors.success : props.theme.colors.primary};
  flex-direction: row;
  align-items: center;
  elevation: 2;
  opacity: ${(props) => (props.done ? 0.7 : 1)};
`;

const CardContent = styled.View`
  flex: 1;
  margin-left: 10px;
`;

const ReminderTitle = styled(RNText)<{ done: boolean }>`
  font-size: ${(props) => props.theme.fontSize.f16}px;
  font-weight: bold;
  color: ${(props) => (props.done ? props.theme.colors.textSecondary : props.theme.colors.text)};
  text-decoration: ${(props) => (props.done ? 'line-through' : 'none')};
`;

const ReminderTime = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f12}px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 4px;
`;

const ModalContent = styled.View`
  background-color: ${(props) => props.theme.colors.surface};
  padding: 25px;
  border-radius: 20px;
  width: 95%;
  max-width: 500px;
  max-height: 90%;
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
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

const LoaderContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const EmptyText = styled(RNText)`
  text-align: center;
  margin-top: 50px;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const ModalHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const InputContainer = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: ${(props) => props.theme.colors.background};
  border-radius: 10px;
  padding-horizontal: 10px;
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
  margin-bottom: 20px;
`;

const ReminderInput = styled.TextInput`
  flex: 1;
  padding: 15px;
  font-size: ${(props) => props.theme.fontSize.f16}px;
  color: ${(props) => props.theme.colors.text};
`;

const MicButton = styled.TouchableOpacity<{ active: boolean }>`
  padding: 10px;
  background-color: ${(props) => (props.active ? props.theme.colors.error : 'transparent')};
  border-radius: 20px;
  margin-right: 5px;
`;

const Label = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f12}px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 25px;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const SetReminderButton = styled.TouchableOpacity`
  background-color: ${(props) => props.theme.colors.primary};
  padding: 18px;
  border-radius: 10px;
  margin-top: 25px;
  align-items: center;
`;

import { StackScreenProps } from '@react-navigation/stack';

type Props = StackScreenProps<any, 'Reminders'>;

const RemindersScreen = ({ navigation, route }: Props) => {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const [title, setTitle] = useState('');
  const [date, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [hour, setHour] = useState(10);
  const [minute, setMinute] = useState(0);

  const [isListening, setIsListening] = useState(false);

  useSpeechRecognitionEvent('result', (event) => {
    if (event.results[0]?.transcript) {
      const transcript = event.results[0].transcript;
      const parsed = parseVoiceReminder(transcript);
      setTitle(parsed.title);
      setSelectedDate(parsed.date);
      setHour(parsed.hour);
      setMinute(parsed.minute);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });

  const handleMicPress = async () => {
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      return notify.error('Brak uprawnień do mikrofonu');
    }

    setIsListening(true);
    ExpoSpeechRecognitionModule.start({
      lang: 'pl-PL',
      interimResults: true,
      continuous: false,
    });
  };

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(collection(db, 'reminders'), where('userId', '==', auth.currentUser.uid));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Reminder);

        const sorted = data.sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.time.localeCompare(b.time);
        });

        setReminders(sorted);
        setLoading(false);
      },
      (error) => {
        console.error('Reminders Firestore Error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleAdd = async () => {
    if (!title.trim()) return notify.error('Wpisz treść przypomnienia');

    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    const isDuplicate = reminders.some(
      (r) => r.title === title && r.date === date && r.time === timeStr
    );
    if (isDuplicate) return notify.error('To przypomnienie już istnieje');

    try {
      const docRef = await addDoc(collection(db, 'reminders'), {
        userId: auth.currentUser?.uid,
        title,
        date,
        time: timeStr,
        done: false,
        createdAt: serverTimestamp(),
      });

      if (Platform.OS !== 'web') {
        try {
          const [year, month, day] = date.split('-').map(Number);
          const baseDate = new Date(year, month - 1, day, hour, minute, 0);

          for (let i = 0; i < REMINDER_REPEAT_COUNT; i++) {
            const scheduleDate = new Date(
              baseDate.getTime() + i * REMINDER_INTERVAL_MINUTES * 60000
            );
            if (scheduleDate > new Date()) {
              await Notifications.scheduleNotificationAsync({
                identifier: `${docRef.id}_${i}`,
                content: {
                  title:
                    i === 0
                      ? 'Ważne przypomnienie! 🔔'
                      : `Przypomnienie (Powtórka ${i}/${REMINDER_REPEAT_COUNT - 1}) 🔔`,
                  body: title,
                  sound: 'default',
                  badge: reminders.length + 1,
                  categoryIdentifier: 'reminder',
                  data: { reminderId: docRef.id, title },
                },
                trigger: {
                  type: SchedulableTriggerInputTypes.DATE,
                  date: scheduleDate,
                  channelId: 'reminders',
                },
              });
            }
          }
        } catch (notificationError) {
          console.warn('Notification scheduling failed:', notificationError);
        }
      }

      setModalVisible(false);
      setTitle('');
      notify.success('Przypomnienie dodane');
    } catch (e) {
      console.error('Firestore Add Error:', e);
      notify.error('Błąd zapisu w bazie danych');
    }
  };

  const cancelReminderSequence = async (reminderId: string) => {
    if (Platform.OS === 'web') return;
    for (let i = 0; i < REMINDER_REPEAT_COUNT; i++) {
      try {
        await Notifications.cancelScheduledNotificationAsync(`${reminderId}_${i}`);
      } catch (e) {
        console.warn('Failed to cancel notification:', e);
      }
    }
  };

  const toggleDone = async (item: Reminder) => {
    const newStatus = !item.done;
    await updateDoc(doc(db, 'reminders', item.id), { done: newStatus });

    if (newStatus) {
      await cancelReminderSequence(item.id);
    }
  };

  const deleteReminder = (id: string) => {
    confirmDelete(
      'Czy na pewno?',
      async () => {
        await deleteDoc(doc(db, 'reminders', id));
        await cancelReminderSequence(id);
        notify.success('Usunięto');
      },
      'Usuń',
      'Usuń'
    );
  };

  if (loading)
    return (
      <LoaderContainer>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </LoaderContainer>
    );

  return (
    <Container theme={theme}>
      <ScreenHeader theme={theme}>
        <ScreenTitle theme={theme}>Moje Przypomnienia</ScreenTitle>
      </ScreenHeader>

      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ReminderCard theme={theme} done={item.done}>
            <TouchableOpacity onPress={() => toggleDone(item)}>
              <CheckCircle2
                size={24}
                color={item.done ? theme.colors.success : theme.colors.border}
              />
            </TouchableOpacity>
            <CardContent>
              <ReminderTitle theme={theme} done={item.done}>
                {item.title}
              </ReminderTitle>
              <ReminderTime theme={theme}>
                {item.date} o {item.time}
              </ReminderTime>
            </CardContent>
            <TouchableOpacity onPress={() => deleteReminder(item.id)}>
              <Trash2 size={20} color={theme.colors.border} />
            </TouchableOpacity>
          </ReminderCard>
        )}
        ListEmptyComponent={<EmptyText theme={theme}>Nie masz jeszcze przypomnień.</EmptyText>}
      />

      <Fab theme={theme} onPress={() => setModalVisible(true)}>
        <Plus size={30} color="white" />
      </Fab>

      <Modal visible={modalVisible} transparent animationType="slide">
        <ModalOverlay>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            style={{
              width: '100%',
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <ModalContent theme={theme}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1 }}
              >
                <ModalHeader>
                  <RNText
                    style={{
                      fontSize: theme.fontSize.lg,
                      fontWeight: 'bold',
                      color: theme.colors.text,
                    }}
                  >
                    Nowe przypomnienie
                  </RNText>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <X size={24} color={theme.colors.text} />
                  </TouchableOpacity>
                </ModalHeader>

                <InputContainer theme={theme}>
                  <ReminderInput
                    theme={theme}
                    placeholder="O czym Ci przypomnieć?"
                    value={title}
                    onChangeText={setTitle}
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                  <MicButton active={isListening} theme={theme} onPress={handleMicPress}>
                    <Mic size={24} color={isListening ? 'white' : theme.colors.primary} />
                  </MicButton>
                </InputContainer>
                {isListening && (
                  <RNText
                    style={{
                      color: theme.colors.error,
                      textAlign: 'center',
                      marginBottom: 10,
                      fontWeight: 'bold',
                    }}
                  >
                    Słucham...
                  </RNText>
                )}
                <Label theme={theme}>DATA</Label>
                <Calendar
                  onDayPress={(day) => setSelectedDate(day.dateString)}
                  markedDates={{ [date]: { selected: true, selectedColor: theme.colors.primary } }}
                  theme={getCalendarTheme(theme)}
                />

                <Label theme={theme}>GODZINA</Label>
                <TimePicker
                  hour={hour}
                  minute={minute}
                  onHourChange={setHour}
                  onMinuteChange={setMinute}
                  theme={theme}
                />

                <SetReminderButton onPress={handleAdd} theme={theme}>
                  <RNText style={{ color: 'white', fontWeight: 'bold' }}>
                    USTAW PRZYPOMNIENIE
                  </RNText>
                </SetReminderButton>
              </ScrollView>
            </ModalContent>
          </KeyboardAvoidingView>
        </ModalOverlay>
      </Modal>
    </Container>
  );
};

export default RemindersScreen;
