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

const RemindersScreen = () => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<any[]>([]);
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
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        const sorted = data.sort((a: any, b: any) => {
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

    try {
      const docRef = await addDoc(collection(db, 'reminders'), {
        userId: auth.currentUser?.uid,
        title,
        date,
        time,
        done: false,
        createdAt: serverTimestamp(),
      });

      const [h, m] = time.split(':').map(Number);
      const scheduleDate = new Date(date);
      scheduleDate.setHours(h, m, 0);

      if (scheduleDate > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Osobiste przypomnienie! 🔔',
            body: title,
            sound: true,
          },
          trigger: scheduleDate,
        });
      }

      setModalVisible(false);
      setTitle('');
      notify.success('Przypomnienie dodane');
    } catch (e) {
      notify.error('Błąd zapisu');
    }
  };

  const toggleDone = async (item: any) => {
    await updateDoc(doc(db, 'reminders', item.id), { done: !item.done });
  };

  const deleteReminder = (id: string) => {
    Alert.alert('Usuń', 'Czy na pewno?', [
      { text: 'Anuluj' },
      { text: 'Usuń', onPress: async () => await deleteDoc(doc(db, 'reminders', id)) },
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
              <Trash2 size={20} color="#ccc" />
            </TouchableOpacity>
          </ReminderCard>
        )}
        ListEmptyComponent={
          <RNText style={{ textAlign: 'center', marginTop: 50, color: '#999' }}>
            Nie masz jeszcze przypomnień.
          </RNText>
        }
      />

      <AddButton theme={theme} onPress={() => setModalVisible(true)}>
        <Plus size={30} color="white" />
      </AddButton>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ModalContent>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}
            >
              <RNText style={{ fontSize: 18, fontWeight: 'bold' }}>Nowe przypomnienie</RNText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} />
              </TouchableOpacity>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#f9f9f9',
                borderRadius: 10,
                paddingHorizontal: 10,
              }}
            >
              <TextInput
                placeholder="O czym Ci przypomnieć?"
                value={title}
                onChangeText={setTitle}
                style={{ flex: 1, padding: 15, fontSize: 16 }}
              />
              <TouchableOpacity style={{ padding: 10 }}>
                <Mic size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <RNText
              style={{
                fontSize: 12,
                fontWeight: 'bold',
                color: '#666',
                marginTop: 15,
                marginBottom: 5,
              }}
            >
              DATA
            </RNText>
            <Calendar
              onDayPress={(day) => setSelectedDate(day.dateString)}
              markedDates={{ [date]: { selected: true, selectedColor: theme.colors.primary } }}
              theme={{
                todayTextColor: theme.colors.primary,
                selectedDayBackgroundColor: theme.colors.primary,
              }}
            />

            <RNText
              style={{
                fontSize: 12,
                fontWeight: 'bold',
                color: '#666',
                marginTop: 15,
                marginBottom: 5,
              }}
            >
              GODZINA (HH:MM)
            </RNText>
            <TextInput
              value={time}
              onChangeText={setTime}
              placeholder="10:00"
              style={{ backgroundColor: '#f9f9f9', padding: 12, borderRadius: 8, fontSize: 16 }}
            />

            <TouchableOpacity
              onPress={handleAdd}
              style={{
                backgroundColor: theme.colors.primary,
                padding: 18,
                borderRadius: 10,
                marginTop: 25,
                alignItems: 'center',
              }}
            >
              <RNText style={{ color: 'white', fontWeight: 'bold' }}>USTAW PRZYPOMNIENIE</RNText>
            </TouchableOpacity>
          </ModalContent>
        </View>
      </Modal>
    </Container>
  );
};

export default RemindersScreen;
