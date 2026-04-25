import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Text as RNText,
  Alert,
  ScrollView,
} from 'react-native';
import styled from 'styled-components/native';
import { Calendar } from 'react-native-calendars';
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
import { db, auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { theme } from '../config/theme';
import { notify } from '../utils/notify';
import { Check, X, Calendar as CalendarIcon, Clock, ShieldCheck } from 'lucide-react-native';
import { format } from 'date-fns';

const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

const Section = styled.View`
  background-color: ${(props) => props.theme.colors.surface};
  padding: ${(props) => props.theme.spacing.md}px;
  margin-bottom: 10px;
  border-bottom-width: 1px;
  border-bottom-color: ${(props) => props.theme.colors.border};
`;

const Title = styled(RNText)`
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
  color: ${(props) => props.theme.colors.text};
`;

const RequestCard = styled.View`
  background-color: ${(props) => props.theme.colors.surface};
  padding: 15px;
  margin: 4px 15px;
  border-radius: 12px;
  border: 1px solid ${(props) => props.theme.colors.border};
  flex-direction: row;
  align-items: center;
`;

const StatusBadge = styled.View<{ status: string }>`
  padding: 4px 8px;
  border-radius: 6px;
  background-color: ${(props) =>
    props.status === 'APPROVED'
      ? props.theme.colors.success
      : props.status === 'REJECTED'
        ? props.theme.colors.error
        : '#FFA000'};
  margin-top: 4px;
  align-self: flex-start;
`;

const BadgeText = styled(RNText)`
  color: white;
  font-size: 10px;
  font-weight: bold;
`;

const ActionButtons = styled.View`
  flex-direction: row;
  margin-left: auto;
`;

const IconButton = styled.TouchableOpacity<{ color: string }>`
  padding: 8px;
  background-color: ${(props) => props.color};
  border-radius: 20px;
  margin-left: 10px;
`;

const VacationsScreen = () => {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedDates, setSelectedDates] = useState<any>({});
  const [submitting, setUploading] = useState(false);

  useEffect(() => {
    const q =
      role === 'DIRECTOR'
        ? query(collection(db, 'vacations'), orderBy('createdAt', 'desc'))
        : query(
            collection(db, 'vacations'),
            where('userId', '==', auth.currentUser?.uid),
            orderBy('createdAt', 'desc')
          );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      setRequests(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [role]);

  const onDayPress = (day: any) => {
    const dateString = day.dateString;
    const newSelected = { ...selectedDates };

    if (newSelected[dateString]) {
      delete newSelected[dateString];
    } else {
      newSelected[dateString] = { selected: true, color: theme.colors.primary, textColor: 'white' };
    }
    setSelectedDates(newSelected);
  };

  const submitRequest = async () => {
    const dates = Object.keys(selectedDates).sort();
    if (dates.length === 0) {
      notify.error('Wybierz daty w kalendarzu');
      return;
    }

    setUploading(true);
    try {
      await addDoc(collection(db, 'vacations'), {
        userId: auth.currentUser?.uid,
        userName: user?.displayName || 'Pracownik',
        dates: dates,
        startDate: dates[0],
        endDate: dates[dates.length - 1],
        status: 'PENDING',
        createdAt: serverTimestamp(),
      });
      setSelectedDates({});
      notify.success('Wniosek został wysłany');
    } catch (e) {
      notify.error('Błąd wysyłania');
    } finally {
      setUploading(false);
    }
  };

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await updateDoc(doc(db, 'vacations', id), { status });
      notify.success(status === 'APPROVED' ? 'Zatwierdzono' : 'Odrzucono');
    } catch (e) {
      notify.error('Błąd operacji');
    }
  };

  const deleteRequest = async (id: string) => {
    Alert.alert('Usuń', 'Czy na pewno?', [
      { text: 'Nie' },
      { text: 'Tak', onPress: async () => await deleteDoc(doc(db, 'vacations', id)) },
    ]);
  };

  return (
    <Container theme={theme}>
      <ScrollView>
        <Section theme={theme}>
          <Title theme={theme}>Zaplanuj urlop</Title>
          <Calendar
            onDayPress={onDayPress}
            markedDates={selectedDates}
            theme={{
              todayTextColor: theme.colors.primary,
              selectedDayBackgroundColor: theme.colors.primary,
              arrowColor: theme.colors.primary,
            }}
          />
          <TouchableOpacity
            onPress={submitRequest}
            disabled={submitting}
            style={{
              backgroundColor: theme.colors.primary,
              padding: 15,
              borderRadius: 10,
              marginTop: 15,
              alignItems: 'center',
            }}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <RNText style={{ color: 'white', fontWeight: 'bold' }}>Wyślij wniosek o urlop</RNText>
            )}
          </TouchableOpacity>
        </Section>

        <Title theme={theme} style={{ marginLeft: 15, marginTop: 10 }}>
          {role === 'DIRECTOR' ? 'Wnioski pracowników' : 'Moje urlopy'}
        </Title>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : (
          requests.map((item) => (
            <RequestCard key={item.id} theme={theme}>
              <View style={{ flex: 1 }}>
                {role === 'DIRECTOR' && (
                  <RNText style={{ fontWeight: 'bold', fontSize: 16 }}>{item.userName}</RNText>
                )}
                <RNText style={{ color: theme.colors.textSecondary }}>
                  {item.startDate} — {item.endDate}
                </RNText>
                <StatusBadge status={item.status} theme={theme}>
                  <BadgeText>{item.status}</BadgeText>
                </StatusBadge>
              </View>

              {role === 'DIRECTOR' && item.status === 'PENDING' ? (
                <ActionButtons>
                  <IconButton
                    color={theme.colors.success}
                    onPress={() => handleAction(item.id, 'APPROVED')}
                  >
                    <Check size={20} color="white" />
                  </IconButton>
                  <IconButton
                    color={theme.colors.error}
                    onPress={() => handleAction(item.id, 'REJECTED')}
                  >
                    <X size={20} color="white" />
                  </IconButton>
                </ActionButtons>
              ) : (
                <TouchableOpacity onPress={() => deleteRequest(item.id)}>
                  <Trash2 size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </RequestCard>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </Container>
  );
};

export default VacationsScreen;
