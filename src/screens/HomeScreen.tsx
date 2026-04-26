import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text as RNText,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import styled from 'styled-components/native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  writeBatch,
  doc,
  updateDoc,
  orderBy,
  limit,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { theme } from '../config/theme';
import { CheckCircle2, Camera, ArrowRight, Megaphone, Palmtree } from 'lucide-react-native';
import { format, isToday, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { notify } from '../utils/notify';
import { runWeeklyCleanup } from '../utils/cleanup';
import * as Notifications from 'expo-notifications';
import { StackScreenProps } from '@react-navigation/stack';

interface Task {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  done: boolean;
  photoUrl?: string;
  photoPath?: string;
  wasMoved?: boolean;
}

interface Announcement {
  id: string;
  text: string;
  createdAt: any;
  authorName: string;
}

interface VacationInfo {
  id: string;
  userId: string;
  userName: string;
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: any;
}

type Props = StackScreenProps<any, 'Home'>;

const { width } = Dimensions.get('window');
const isDesktop = Platform.OS === 'web' && width > 768;

LocaleConfig.locales['pl'] = {
  monthNames: [
    'Styczeń',
    'Luty',
    'Marzec',
    'Kwiecień',
    'Maj',
    'Czerwiec',
    'Lipiec',
    'Sierpień',
    'Wrzesień',
    'Październik',
    'Listopad',
    'Grudzień',
  ],
  monthNamesShort: [
    'Sty.',
    'Luty',
    'Mar.',
    'Kwi.',
    'Maj',
    'Cze.',
    'Lip.',
    'Sie.',
    'Wrz.',
    'Paź.',
    'Lis.',
    'Gru.',
  ],
  dayNames: ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'],
  dayNamesShort: ['Niedz.', 'Pon.', 'Wt.', 'Śr.', 'Czw.', 'Pt.', 'Sob.'],
  today: 'Dzisiaj',
};
LocaleConfig.defaultLocale = 'pl';

const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

const Content = styled(ScrollView)`
  flex: 1;
`;

const MainWrapper = styled.View<{ isDesktop: boolean }>`
  flex-direction: ${(props) => (props.isDesktop ? 'row' : 'column')};
  padding: ${(props) => props.theme.spacing.md}px;
  width: 100%;
  align-items: stretch;
  ${(props) => props.isDesktop && `max-width: 1200px; align-self: center;`}
`;

const LeftColumn = styled.View<{ isDesktop: boolean }>`
  ${(props) => (props.isDesktop ? 'flex: 1.5;' : 'width: 100%; flex-shrink: 0;')}
  margin-right: ${(props) => (props.isDesktop ? props.theme.spacing.lg : 0)}px;
`;

const RightColumn = styled.View<{ isDesktop: boolean }>`
  ${(props) => (props.isDesktop ? 'flex: 1;' : 'width: 100%; flex-shrink: 0;')}
  margin-top: ${(props) => (props.isDesktop ? 0 : props.theme.spacing.lg)}px;
`;

const Card = styled.View`
  background-color: ${(props) => props.theme.colors.surface};
  padding: ${(props) => props.theme.spacing.lg}px;
  border-radius: ${(props) => props.theme.borderRadius.lg}px;
  border: 1px solid ${(props) => props.theme.colors.border};
  margin-bottom: ${(props) => props.theme.spacing.md}px;
`;

const SectionTitle = styled(RNText)`
  font-size: 18px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
  margin-bottom: ${(props) => props.theme.spacing.md}px;
`;

const TaskItemContainer = styled.View`
  border-bottom-width: 1px;
  border-bottom-color: ${(props) => props.theme.colors.background};
  padding: 12px 0;
`;

const TaskRow = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
`;

const TaskText = styled(RNText)<{ done?: boolean }>`
  flex: 1;
  margin-left: 12px;
  font-size: 15px;
  color: ${(props) => (props.done ? props.theme.colors.textSecondary : props.theme.colors.text)};
  text-decoration: ${(props) => (props.done ? 'line-through' : 'none')};
  font-weight: ${(props) => (props.done ? '400' : '600')};
`;

const TaskTime = styled(RNText)`
  font-size: 12px;
  color: ${(props) => props.theme.colors.primary};
  font-weight: bold;
  margin-left: 34px;
`;

const TaskImagePreview = styled.Image`
  width: 100%;
  height: 120px;
  border-radius: 8px;
  margin-top: 10px;
  margin-left: 34px;
  max-width: 250px;
`;

const DateBanner = styled.View`
  background-color: ${(props) => props.theme.colors.primary};
  padding: ${(props) => props.theme.spacing.lg}px;
  border-radius: ${(props) => props.theme.borderRadius.lg}px;
  margin-bottom: ${(props) => props.theme.spacing.md}px;
`;

const BannerDate = styled(RNText)`
  color: white;
  font-size: 22px;
  font-weight: bold;
`;

const BannerDay = styled(RNText)`
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  text-transform: capitalize;
`;

const ShowAllButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-top: 15px;
  padding: 10px;
`;

const UploadOverlay = styled.View`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(255, 255, 255, 0.7);
  justify-content: center;
  align-items: center;
`;

const CameraIconButton = styled.TouchableOpacity`
  padding: 5px;
`;

const EmptyTasksText = styled(RNText)`
  color: ${(props) => props.theme.colors.textSecondary};
  text-align: center;
  margin-top: 10px;
`;

const ShowAllText = styled(RNText)`
  color: ${(props) => props.theme.colors.primary};
  font-weight: bold;
  margin-right: 5px;
`;

const VacationCountdownCard = styled.TouchableOpacity`
  background-color: #e0f2f1;
  padding: 15px;
  border-radius: 12px;
  border-left-width: 5px;
  border-left-color: #00897b;
  margin-bottom: 20px;
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: #b2dfdb;
`;

const VacationTextWrapper = styled.View`
  flex: 1;
  margin-left: 12px;
`;

const VacationMainText = styled(RNText)`
  font-size: 15px;
  font-weight: bold;
  color: #004d40;
`;

const VacationSubText = styled(RNText)`
  font-size: 12px;
  color: #00796b;
  margin-top: 2px;
`;

const DaysBadge = styled.View`
  background-color: #00897b;
  padding: 8px 12px;
  border-radius: 10px;
  align-items: center;
  justify-content: center;
`;

const DaysValue = styled(RNText)`
  color: white;
  font-size: 18px;
  font-weight: bold;
`;

const DaysLabel = styled(RNText)`
  color: white;
  font-size: 8px;
  text-transform: uppercase;
  font-weight: bold;
`;

const TeamVacationSection = styled.View`
  background-color: #f0f4ff;
  padding: 15px;
  border-radius: 12px;
  margin-bottom: 20px;
  border: 1px solid #d0dfff;
`;

const TeamVacationHeader = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 10px;
`;

const TeamVacationItem = styled.View`
  flex-direction: row;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom-width: 1px;
  border-bottom-color: #f0f0f0;
`;

const AnnouncementCard = styled.TouchableOpacity`
  background-color: #fff4e5;
  padding: 15px;
  border-radius: 12px;
  border-left-width: 5px;
  border-left-color: #ff9800;
  margin-bottom: 20px;
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: #ffe0b2;
`;

const AnnouncementText = styled(RNText)`
  flex: 1;
  font-size: 14px;
  color: #663c00;
  font-weight: 600;
  margin-left: 12px;
`;

const HomeScreen = ({ navigation }: Props) => {
  const { user, role, userData } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 768;

  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null);
  const [vacations, setVacations] = useState<VacationInfo[]>([]);

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const myNextVacation = useMemo(() => {
    return (
      vacations
        .filter((v) => v.userId === user?.uid && v.status === 'APPROVED' && v.startDate >= todayStr)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] || null
    );
  }, [vacations, user, todayStr]);

  const daysToVacation = useMemo(() => {
    if (!myNextVacation) return null;
    const start = new Date(myNextVacation.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = start.getTime() - today.getTime();
    const result = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (result > 5 || result <= 0) return null;
    return result;
  }, [myNextVacation]);

  const teamUpcomingVacations = useMemo(() => {
    if (role !== 'DIRECTOR') return [];

    return vacations
      .filter((v) => {
        if (v.status !== 'APPROVED') return false;
        const start = new Date(v.startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diff = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diff <= 5 && diff > 0;
      })
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 3);
  }, [vacations, role]);

  useEffect(() => {
    const q = query(collection(db, 'vacations'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as VacationInfo);
      setVacations(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(1));
    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as Announcement;
        setLatestAnnouncement(data);

        const now = Date.now();
        const created = data.createdAt?.toMillis() || now;
        if (now - created < 60000 && Platform.OS !== 'web') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'Wiadomość od Dyrektora! 📢',
              body: data.text,
              sound: true,
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date() },
          });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const moveOverdue = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'tasks'), where('done', '==', false));
        const snap = await getDocs(q);
        const overdue = snap.docs.filter((d) => d.data().date < todayStr);
        if (overdue.length === 0) return;

        const batch = writeBatch(db);
        overdue.forEach((d) =>
          batch.update(doc(db, 'tasks', d.id), { date: todayStr, wasMoved: true })
        );
        await batch.commit();
      } catch (e) {}
    };
    moveOverdue();
  }, [user, todayStr]);

  useEffect(() => {
    let isSubscribed = true;
    const q = query(collection(db, 'tasks'), where('date', '==', selectedDate));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const tasksData = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Task);
        const sorted = tasksData.sort((a, b) =>
          (a.time || '00:00').localeCompare(b.time || '00:00')
        );
        if (isSubscribed) {
          setTasks(sorted);
          setLoading(false);
        }
      },
      (error) => {
        if (isSubscribed) setLoading(false);
      }
    );
    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [selectedDate]);

  const toggleTask = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'tasks', id), { done: !currentStatus });
    } catch (e) {}
  };

  const addPhotoToTask = async (taskId: string, timestamp: number) => {
    let result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (result.canceled) return;
    setUploading(true);
    try {
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      const filename = `task_photos/${taskId}_${timestamp}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      const photoUrl = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'tasks', taskId), { photoUrl, photoPath: filename, done: true });
    } catch (e) {
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (role === 'DIRECTOR') runWeeklyCleanup();
  }, [role]);

  return (
    <Container theme={theme}>
      <Content theme={theme}>
        <MainWrapper theme={theme} isDesktop={isDesktop}>
          <LeftColumn theme={theme} isDesktop={isDesktop}>
            {latestAnnouncement && (
              <AnnouncementCard theme={theme} onPress={() => navigation.navigate('Announcements')}>
                <Megaphone size={24} color="#ff9800" />
                <AnnouncementText theme={theme} numberOfLines={2}>
                  {latestAnnouncement.text}
                </AnnouncementText>
                <ArrowRight size={18} color="#ff9800" />
              </AnnouncementCard>
            )}

            {role !== 'DIRECTOR' && daysToVacation !== null && daysToVacation >= 0 && (
              <VacationCountdownCard theme={theme} onPress={() => navigation.navigate('Vacations')}>
                <Palmtree size={24} color="#00897b" />
                <VacationTextWrapper>
                  <VacationMainText theme={theme}>Twój urlop już blisko!</VacationMainText>
                  <VacationSubText theme={theme}>
                    Zaczynasz: {myNextVacation?.startDate}
                  </VacationSubText>
                </VacationTextWrapper>
                <DaysBadge>
                  <DaysValue>{daysToVacation}</DaysValue>
                  <DaysLabel>Dni</DaysLabel>
                </DaysBadge>
              </VacationCountdownCard>
            )}

            {role === 'DIRECTOR' && (
              <TeamVacationSection theme={theme}>
                <TeamVacationHeader>
                  <Palmtree size={18} color={theme.colors.primary} />
                  <RNText
                    style={{
                      fontWeight: 'bold',
                      marginLeft: 8,
                      color: theme.colors.primary,
                      fontSize: 14,
                    }}
                  >
                    Nadchodzące urlopy zespołu
                  </RNText>
                </TeamVacationHeader>
                {teamUpcomingVacations.length > 0 ? (
                  teamUpcomingVacations.map((v) => (
                    <TeamVacationItem key={v.id}>
                      <RNText style={{ fontWeight: '600', color: theme.colors.text }}>
                        {v.userName}
                      </RNText>
                      <RNText style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                        {v.startDate} (
                        {Math.ceil(
                          (new Date(v.startDate).getTime() - new Date().setHours(0, 0, 0, 0)) /
                            (1000 * 60 * 60 * 24)
                        )}{' '}
                        dni)
                      </RNText>
                    </TeamVacationItem>
                  ))
                ) : (
                  <RNText
                    style={{ color: theme.colors.textSecondary, fontSize: 12, fontStyle: 'italic' }}
                  >
                    Brak nadchodzących urlopów w zespole.
                  </RNText>
                )}
              </TeamVacationSection>
            )}

            <DateBanner theme={theme}>
              <BannerDate theme={theme}>
                {format(new Date(selectedDate), 'd MMMM yyyy', { locale: pl })}
              </BannerDate>
              <BannerDay theme={theme}>
                {format(new Date(selectedDate), 'EEEE', { locale: pl })}
              </BannerDay>
            </DateBanner>
            <Card theme={theme}>
              <SectionTitle theme={theme}>Kalendarz</SectionTitle>
              <Calendar
                onDayPress={(day) => {
                  setLoading(true);
                  setSelectedDate(day.dateString);
                }}
                markedDates={{
                  [selectedDate]: { selected: true, selectedColor: theme.colors.primary },
                }}
                theme={{
                  todayTextColor: theme.colors.primary,
                  selectedDayBackgroundColor: theme.colors.primary,
                }}
              />
            </Card>
          </LeftColumn>
          <RightColumn theme={theme} isDesktop={isDesktop}>
            <Card theme={theme}>
              <SectionTitle theme={theme}>Zadania na dziś</SectionTitle>
              {loading ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                tasks.slice(0, 5).map((task) => (
                  <TaskItemContainer key={task.id} theme={theme}>
                    <TaskRow theme={theme} onPress={() => toggleTask(task.id, task.done)}>
                      <CheckCircle2
                        size={22}
                        color={task.done ? theme.colors.success : theme.colors.border}
                      />
                      <TaskText theme={theme} done={task.done}>
                        {task.title}
                      </TaskText>
                      <CameraIconButton onPress={() => addPhotoToTask(task.id, Date.now())}>
                        <Camera
                          size={20}
                          color={task.photoUrl ? theme.colors.success : theme.colors.textSecondary}
                        />
                      </CameraIconButton>
                    </TaskRow>
                    {task.time && <TaskTime theme={theme}>{task.time}</TaskTime>}
                    {task.photoUrl && <TaskImagePreview source={{ uri: task.photoUrl }} />}
                  </TaskItemContainer>
                ))
              )}
              {tasks.length === 0 && !loading && (
                <EmptyTasksText theme={theme}>Brak zadań.</EmptyTasksText>
              )}
              <ShowAllButton onPress={() => navigation.navigate('Tasks')}>
                <ShowAllText theme={theme}>Wszystkie zadania</ShowAllText>
                <ArrowRight size={18} color={theme.colors.primary} />
              </ShowAllButton>
            </Card>
          </RightColumn>
        </MainWrapper>
      </Content>
      {uploading && (
        <UploadOverlay theme={theme}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </UploadOverlay>
      )}
    </Container>
  );
};

export default HomeScreen;
