import React, { useState, useEffect } from 'react';
import {
  View,
  Text as RNText,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Platform,
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
import { theme } from '../config/theme';
import { notify } from '../utils/notify';
import {
  Bell,
  Plus,
  X,
  Trash2,
  Clock,
  Calendar as CalendarIcon,
  Mic,
  CheckCircle2,
} from 'lucide-react-native';
import { Calendar } from 'react-native-calendars';
import { format } from 'date-fns';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

const Header = styled.View`
  padding: 20px;
  background-color: ${(props) => props.theme.colors.surface};
  border-bottom-width: 1px;
  border-bottom-color: ${(props) => props.theme.colors.border};
`;

const Title = styled(RNText)`
  font-size: 24px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
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
  font-size: 16px;
  font-weight: bold;
  text-decoration: ${(props) => (props.done ? 'line-through' : 'none')};
`;

const ReminderTime = styled(RNText)`
  font-size: 12px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 4px;
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

const ModalContent = styled.View`
  background-color: white;
  padding: 25px;
  border-radius: 20px;
  width: 90%;
  max-width: 500px;
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

const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
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
`;

const ReminderInput = styled.TextInput`
  flex: 1;
  padding: 15px;
  font-size: 16px;
  color: ${(props) => props.theme.colors.text};
`;

const MicButton = styled.TouchableOpacity`
  padding: 10px;
`;

const Label = styled(RNText)`
  font-size: 12px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.textSecondary};
  margintop: 15px;
  marginbottom: 5px;
`;

const TimeInput = styled.TextInput`
  background-color: ${(props) => props.theme.colors.background};
  padding: 12px;
  border-radius: 8px;
  font-size: 16px;
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
  color: ${(props) => props.theme.colors.text};
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
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const [title, setTitle] = useState('');
  const [date, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('10:00');

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

    const isDuplicate = reminders.some(
      (r) => r.title === title && r.date === date && r.time === time
    );
    if (isDuplicate) return notify.error('To przypomnienie już istnieje');

    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) return notify.error('Nieprawidłowy format godziny (HH:MM)');

    try {
      const docRef = await addDoc(collection(db, 'reminders'), {
        userId: auth.currentUser?.uid,
        title,
        date,
        time,
        done: false,
        createdAt: serverTimestamp(),
      });

      if (Platform.OS !== 'web') {
        try {
          const [h, m] = time.split(':').map(Number);
          const baseDate = new Date(date);
          baseDate.setHours(h, m, 0);

          for (let i = 0; i < 3; i++) {
            const scheduleDate = new Date(baseDate.getTime() + i * 5 * 60000);
            if (scheduleDate > new Date()) {
              await Notifications.scheduleNotificationAsync({
                identifier: `${docRef.id}_${i}`,
                content: {
                  title:
                    i === 0 ? 'Osobiste przypomnienie! 🔔' : `Przypomnienie (Powtórka ${i}) 🔔`,
                  body: title,
                  sound: true,
                  badge: reminders.length + 1,
                  data: { reminderId: docRef.id },
                },
                trigger: {
                  type: SchedulableTriggerInputTypes.DATE,
                  date: scheduleDate,
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
      notify.error('Błąd zapisu в базі даних');
    }
  };

  const cancelReminderSequence = async (reminderId: string) => {
    if (Platform.OS === 'web') return;
    for (let i = 0; i < 3; i++) {
      try {
        await Notifications.cancelScheduledNotificationAsync(`${reminderId}_${i}`);
      } catch (e) {}
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
    const performDelete = async () => {
      await deleteDoc(doc(db, 'reminders', id));
      await cancelReminderSequence(id);
      notify.success('Usunięto');
    };
    Alert.alert('Usuń', 'Czy na pewno?', [
      { text: 'Anuluj' },
      { text: 'Usuń', onPress: performDelete },
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
        <Title theme={theme}>Moje Przypomnienia</Title>
      </Header>

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

      <AddButton theme={theme} onPress={() => setModalVisible(true)}>
        <Plus size={30} color="white" />
      </AddButton>

      <Modal visible={modalVisible} transparent animationType="slide">
        <ModalOverlay>
          <ModalContent theme={theme}>
            <ModalHeader>
              <RNText style={{ fontSize: 18, fontWeight: 'bold' }}>Nowe przypomnienie</RNText>
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
              <MicButton>
                <Mic size={24} color={theme.colors.primary} />
              </MicButton>
            </InputContainer>

            <Label theme={theme}>DATA</Label>
            <Calendar
              onDayPress={(day) => setSelectedDate(day.dateString)}
              markedDates={{ [date]: { selected: true, selectedColor: theme.colors.primary } }}
              theme={{
                todayTextColor: theme.colors.primary,
                selectedDayBackgroundColor: theme.colors.primary,
              }}
            />

            <Label theme={theme}>GODZINA (HH:MM)</Label>
            <TimeInput
              theme={theme}
              value={time}
              onChangeText={setTime}
              placeholder="10:00"
              placeholderTextColor={theme.colors.textSecondary}
            />

            <SetReminderButton onPress={handleAdd} theme={theme}>
              <RNText style={{ color: 'white', fontWeight: 'bold' }}>USTAW PRZYPOMNIENIE</RNText>
            </SetReminderButton>
          </ModalContent>
        </ModalOverlay>
      </Modal>
    </Container>
  );
};

export default RemindersScreen;
