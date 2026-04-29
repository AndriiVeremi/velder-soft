import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Text as RNText,
  ScrollView,
  Platform,
} from 'react-native';
import styled from 'styled-components/native';
import { Calendar } from 'react-native-calendars';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  Timestamp,
  getDocs,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { getCalendarTheme } from '../config/theme';
import { notify } from '../utils/notify';
import { confirmDelete } from '../utils/confirm';
import { useMarkAsRead } from '../hooks/useMarkAsRead';
import {
  Check,
  X,
  Calendar as CalendarIcon,
  Clock,
  ShieldCheck,
  Trash2,
  Palmtree,
} from 'lucide-react-native';
import { format } from 'date-fns';
import * as Notifications from 'expo-notifications';
import { StackScreenProps } from '@react-navigation/stack';
import { sendPushNotification } from '../utils/notifications';

interface VacationRequest {
  id: string;
  userId: string;
  userName: string;
  startDate: string;
  endDate: string;
  dates: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  isNew?: boolean;
  createdAt: any;
}

type Props = StackScreenProps<any, 'Vacations'>;

const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

const Section = styled.View`
  background-color: ${(props) => props.theme.colors.surface};
  padding: ${(props) => props.theme.spacing.lg}px;
  margin-bottom: 10px;
  border-radius: 12px;
  margin: 10px;
`;

const Title = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f20}px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
  margin-bottom: 15px;
`;

const RequestCard = styled.View`
  background-color: ${(props) => props.theme.colors.surface};
  padding: 15px;
  margin: 5px 10px;
  border-radius: 10px;
  flex-direction: row;
  align-items: center;
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const StatusBadge = styled.View<{ status: string }>`
  padding: 4px 10px;
  border-radius: 15px;
  margin-top: 8px;
  align-self: flex-start;
  background-color: ${(props) =>
    props.status === 'APPROVED'
      ? props.theme.colors.success
      : props.status === 'REJECTED'
        ? props.theme.colors.error
        : props.theme.colors.border};
`;

const BadgeText = styled(RNText)`
  color: white;
  font-size: ${(props) => props.theme.fontSize.f10}px;
  font-weight: bold;
`;

const ActionButtons = styled.View`
  flex-direction: row;
`;

const IconButton = styled.TouchableOpacity<{ color: string }>`
  padding: 8px;
  background-color: ${(props) => props.color};
  border-radius: 20px;
  margin-left: 10px;
`;

const ListHeader = styled.View`
  padding: 15px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const VacationText = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f14}px;
  color: ${(props) => props.theme.colors.text};
`;

const DaysLeftBadge = styled.View`
  background-color: ${(props) => props.theme.colors.accent};
  padding: 4px 8px;
  border-radius: 6px;
  margin-top: 5px;
  align-self: flex-start;
`;

const DaysLeftText = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f11}px;
  color: ${(props) => props.theme.colors.primary};
  font-weight: bold;
`;

const EmployeeName = styled(RNText)`
  font-weight: bold;
  font-size: ${(props) => props.theme.fontSize.f16}px;
  color: ${(props) => props.theme.colors.primary};
`;

const SubmitBtnText = styled(RNText)`
  color: white;
  font-weight: bold;
`;

const EmptyContainer = styled.View`
  align-items: center;
  margin-top: 50px;
`;

const CountdownCard = styled.View`
  background-color: ${(props) => props.theme.colors.accent};
  margin: 15px;
  padding: 20px;
  border-radius: 15px;
  align-items: center;
  border: 1px solid ${(props) => props.theme.colors.primary};
`;

const CountdownValue = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f32}px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.primary};
`;

const CountdownLabel = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f14}px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 5px;
`;

const VacationsScreen = ({ route, navigation }: Props) => {
  const { user, userData, role } = useAuth();
  const { theme } = useAppTheme();
  const isAdminView = (route.params as any)?.isAdminView === true && role === 'DIRECTOR';

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [selectedDates, setSelectedDates] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const scheduleMarkAsRead = useMarkAsRead('vacations');

  const getDaysRemaining = (startDate: string) => {
    const start = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = start.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const nextVacation = useMemo(() => {
    if (isAdminView) return null;
    const todayStr = new Date().toISOString().split('T')[0];
    const approvedFuture = requests
      .filter((r) => r.status === 'APPROVED' && r.startDate >= todayStr)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    return approvedFuture[0] || null;
  }, [requests, isAdminView]);

  const daysToNext = useMemo(() => {
    if (!nextVacation) return null;
    const days = getDaysRemaining(nextVacation.startDate);
    return days;
  }, [nextVacation]);

  useEffect(() => {
    const q = isAdminView
      ? query(collection(db, 'vacations'))
      : query(collection(db, 'vacations'), where('userId', '==', auth.currentUser?.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: VacationRequest[] = [];
        snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as VacationRequest));

        const sortedData = data.sort((a, b) => {
          const timeA = a.createdAt?.toMillis() || 0;
          const timeB = b.createdAt?.toMillis() || 0;
          return timeB - timeA;
        });

        setRequests(sortedData);
        setLoading(false);

        if (isAdminView) {
          scheduleMarkAsRead(sortedData.filter((r) => r.isNew).map((r) => r.id));
        }
      },
      (error) => {
        console.error('Vacations error:', error);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [isAdminView]);

  useEffect(() => {
    if (isAdminView || Platform.OS === 'web') return;

    const scheduleReminders = async () => {
      const myApproved = requests.filter((r) => r.status === 'APPROVED');
      for (const v of myApproved) {
        const days = getDaysRemaining(v.startDate);
        if (days > 0) {
          if (days >= 5) {
            const trig = new Date(new Date(v.startDate).getTime() - 5 * 24 * 60 * 60 * 1000);
            trig.setHours(9, 0, 0);
            await Notifications.scheduleNotificationAsync({
              identifier: `vac_5_${v.id}`,
              content: {
                title: 'Urlop za 5 dni! 🏖️',
                body: 'Przygotuj się na odpoczynek.',
                sound: 'default',
              },
              trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trig },
            }).catch(() => {});
          }
          if (days >= 1) {
            const trig = new Date(new Date(v.startDate).getTime() - 1 * 24 * 60 * 60 * 1000);
            trig.setHours(9, 0, 0);
            await Notifications.scheduleNotificationAsync({
              identifier: `vac_1_${v.id}`,
              content: {
                title: 'Urlop już jutro! ☀️',
                body: 'Pamiętaj o dokończeniu zadań.',
                sound: 'default',
              },
              trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trig },
            }).catch(() => {});
          }
        }
      }
    };
    scheduleReminders();
  }, [requests, isAdminView]);

  const onDayPress = (day: any) => {
    const dateString = day.dateString;
    const newSelected = { ...selectedDates };
    if (newSelected[dateString]) delete newSelected[dateString];
    else
      newSelected[dateString] = { selected: true, color: theme.colors.primary, textColor: 'white' };
    setSelectedDates(newSelected);
  };

  const submitRequest = async () => {
    const dates = Object.keys(selectedDates).sort();
    if (dates.length === 0) return notify.error('Wybierz daty w kalendarzu');
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'vacations'), {
        userId: auth.currentUser?.uid,
        userName: userData?.name || user?.email || 'Pracownik',
        dates,
        startDate: dates[0],
        endDate: dates[dates.length - 1],
        status: 'PENDING',
        isNew: true,
        createdAt: serverTimestamp(),
      });

      try {
        const directorsSnap = await getDocs(
          query(collection(db, 'users'), where('role', '==', 'DIRECTOR'))
        );
        const tokens: { token: string; notificationStart?: string; notificationEnd?: string }[] =
          [];
        directorsSnap.forEach((d) => {
          const data = d.data();
          if (data.pushToken)
            tokens.push({
              token: data.pushToken,
              notificationStart: data.notificationStart,
              notificationEnd: data.notificationEnd,
            });
        });

        if (tokens.length > 0) {
          await sendPushNotification(
            tokens,
            'Nowy wniosek o urlop! 🏖️',
            `${userData?.name || 'Pracownik'} prosi o wolne: ${dates[0]} — ${dates[dates.length - 1]}`
          );
        }
      } catch (pushErr) {
        console.warn('Failed to notify director about vacation:', pushErr);
      }

      setSelectedDates({});
      notify.success('Wniosek wysłany');
    } catch (e) {
      notify.error('Błąd');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await updateDoc(doc(db, 'vacations', id), { status });

      try {
        const request = requests.find((r) => r.id === id);
        if (request) {
          const userSnap = await getDocs(
            query(collection(db, 'users'), where('__name__', '==', request.userId))
          );
          if (!userSnap.empty) {
            const userData = userSnap.docs[0].data();
            if (userData.pushToken) {
              await sendPushNotification(
                [
                  {
                    token: userData.pushToken,
                    notificationStart: userData.notificationStart,
                    notificationEnd: userData.notificationEnd,
                  },
                ],
                status === 'APPROVED' ? 'Urlop zatwierdzony! ✅' : 'Wniosek odrzucony ❌',
                status === 'APPROVED'
                  ? `Twój urlop (${request.startDate}) został zaakceptowany.`
                  : `Twój wniosek o urlop (${request.startDate}) nie został przyjęty.`
              );
            }
          }
        }
      } catch (pushErr) {
        console.warn('Failed to notify employee about vacation status:', pushErr);
      }

      notify.success(status === 'APPROVED' ? 'Zatwierdzono' : 'Odrzucono');
    } catch (e) {
      notify.error('Błąd');
    }
  };

  const deleteRequest = (id: string) => {
    confirmDelete('Usunąć wniosek?', async () => {
      await deleteDoc(doc(db, 'vacations', id));
      notify.success('Usunięto');
    });
  };

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );

  return (
    <Container theme={theme}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            {!isAdminView && (
              <>
                {daysToNext !== null && daysToNext >= 0 && (
                  <CountdownCard theme={theme}>
                    <CountdownValue theme={theme}>{daysToNext}</CountdownValue>
                    <CountdownLabel theme={theme}>
                      Dni do Twojego urlopu ({nextVacation?.startDate})
                    </CountdownLabel>
                  </CountdownCard>
                )}
                <Section theme={theme}>
                  <Title theme={theme}>Zaplanuj swój urlop</Title>
                  <Calendar
                    onDayPress={onDayPress}
                    markedDates={selectedDates}
                    theme={getCalendarTheme(theme)}
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
                      <SubmitBtnText>Wyślij wniosek o urlop</SubmitBtnText>
                    )}
                  </TouchableOpacity>
                </Section>
              </>
            )}
            <ListHeader>
              <Title theme={theme} style={{ marginBottom: 0 }}>
                {isAdminView ? 'Wnioski pracowników' : 'Moja historia urlopów'}
              </Title>
              {isAdminView && <Palmtree size={24} color={theme.colors.primary} />}
            </ListHeader>
          </>
        }
        renderItem={({ item }) => {
          const dLeft = getDaysRemaining(item.startDate);
          return (
            <RequestCard
              theme={theme}
              style={
                isAdminView && item.isNew
                  ? { borderColor: theme.colors.primary, borderWidth: 2 }
                  : undefined
              }
            >
              <View style={{ flex: 1 }}>
                {isAdminView && item.isNew && (
                  <View
                    style={{
                      backgroundColor: theme.colors.primary,
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      alignSelf: 'flex-start',
                      marginBottom: 4,
                    }}
                  >
                    <RNText
                      style={{ color: 'white', fontSize: theme.fontSize.f10, fontWeight: 'bold' }}
                    >
                      NOWE
                    </RNText>
                  </View>
                )}
                {isAdminView && <EmployeeName theme={theme}>{item.userName}</EmployeeName>}
                <VacationText theme={theme}>
                  {item.startDate} — {item.endDate}
                </VacationText>
                {item.status === 'APPROVED' && dLeft > 0 && (
                  <DaysLeftBadge>
                    <DaysLeftText>Zostało: {dLeft} dni</DaysLeftText>
                  </DaysLeftBadge>
                )}
                <StatusBadge status={item.status} theme={theme}>
                  <BadgeText>{item.status}</BadgeText>
                </StatusBadge>
              </View>
              {isAdminView && item.status === 'PENDING' ? (
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
                !isAdminView && (
                  <TouchableOpacity onPress={() => deleteRequest(item.id)}>
                    <Trash2 size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                )
              )}
            </RequestCard>
          );
        }}
        ListEmptyComponent={
          <EmptyContainer>
            <RNText style={{ color: theme.colors.textSecondary }}>
              Brak wniosków do wyświetlenia.
            </RNText>
          </EmptyContainer>
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
      />
    </Container>
  );
};

export default VacationsScreen;
