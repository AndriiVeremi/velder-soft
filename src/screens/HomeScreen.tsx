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
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import {
  CheckCircle2,
  Camera,
  ArrowRight,
  Megaphone,
  Palmtree,
  X,
  CheckCircle,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { notify } from '../utils/notify';
import { runWeeklyCleanup } from '../utils/cleanup';
import * as Notifications from 'expo-notifications';
import { StackScreenProps } from '@react-navigation/stack';
import { Task, Announcement, VacationInfo, UserRequest } from '../types';
import { RootStackParamList } from '../config/navigationTypes';

type Props = StackScreenProps<RootStackParamList, 'Home'>;

const { width } = Dimensions.get('window');

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
  background-color: ${(props) => props.theme.colors.accent};
  padding: 15px;
  border-radius: 12px;
  border-left-width: 5px;
  border-left-color: ${(props) => props.theme.colors.primary};
  margin-bottom: 20px;
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
`;

const VacationTextWrapper = styled.View`
  flex: 1;
  margin-left: 12px;
`;

const VacationMainText = styled(RNText)`
  font-size: 15px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
`;

const VacationSubText = styled(RNText)`
  font-size: 12px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 2px;
`;

const DaysBadge = styled.View`
  background-color: ${(props) => props.theme.colors.primary};
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
  background-color: ${(props) => props.theme.colors.surface};
  padding: 15px;
  border-radius: 12px;
  margin-bottom: 20px;
  border: 1px solid ${(props) => props.theme.colors.border};
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
  border-bottom-color: ${(props) => props.theme.colors.border};
`;

const TeamVacationName = styled(RNText)`
  font-weight: 600;
  color: ${(props) => props.theme.colors.text};
`;

const AnnouncementCard = styled.View`
  background-color: ${(props) => (props.theme.isDark ? '#2c1e00' : '#fff4e5')};
  padding: 15px;
  border-radius: 12px;
  border-left-width: 5px;
  border-left-color: #ff9800;
  margin-bottom: 20px;
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: ${(props) => (props.theme.isDark ? '#4d3a00' : '#ffe0b2')};
`;

const RequestsSection = styled.View`
  margin-bottom: 20px;
`;

const RequestItem = styled.View`
  background-color: ${(props) => (props.theme.isDark ? '#2c1e00' : '#fff4e5')};
  padding: 15px;
  border-radius: 12px;
  border: 1px solid ${(props) => (props.theme.isDark ? '#4d3a00' : '#ffe0b2')};
  border-left-width: 5px;
  border-left-color: #ff9800;
  margin-bottom: 10px;
  flex-direction: row;
  align-items: center;
`;

const RequestContent = styled.View`
  flex: 1;
  margin-right: 10px;
`;

const RequestSender = styled(RNText)`
  font-weight: bold;
  color: #ff9800;
  font-size: 13px;
`;

const RequestText = styled(RNText)`
  color: ${(props) => (props.theme.isDark ? '#ffcc80' : '#663c00')};
  margin-top: 4px;
  font-size: 14px;
  font-weight: 600;
`;

const ConfirmBtn = styled.TouchableOpacity`
  padding: 8px;
  background-color: #ff9800;
  border-radius: 8px;
`;

const HomeScreen = ({ navigation }: Props) => {
  const { user, role, userData } = useAuth();
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 768;

  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null);
  const [isAnnouncementConfirmed, setIsAnnouncementConfirmed] = useState(false);
  const [vacations, setVacations] = useState<VacationInfo[]>([]);
  const [pendingRequests, setPendingRequests] = useState<UserRequest[]>([]);

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  useEffect(() => {
    if (role !== 'DIRECTOR') return;
    const q = query(collection(db, 'requests'), where('status', '==', 'PENDING'));

    return onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserRequest);

      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const newReq = change.doc.data() as UserRequest;
          const now = Date.now();
          const created = newReq.createdAt?.toMillis() || now;
          if (now - created < 30000 && Platform.OS !== 'web') {
            Notifications.scheduleNotificationAsync({
              content: {
                title: 'Nowa prośba od pracownika! 📩',
                body: `${newReq.senderName}: ${newReq.text}`,
                sound: true,
                vibrate: [0, 250, 250, 250],
                priority: Notifications.AndroidNotificationPriority.MAX,
                categoryIdentifier: 'alerts',
              },
              trigger: null,
            });
          }
        }
      });

      const sorted = data.sort(
        (a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
      );
      setPendingRequests(sorted);
    });
  }, [role]);

  const handleConfirmRequest = async (requestId: string) => {
    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    try {
      await updateDoc(doc(db, 'requests', requestId), { status: 'CONFIRMED' });
      notify.success('Potwierdzono');
    } catch (e) {
      notify.error('Błąd');
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(1));
    return onSnapshot(q, async (snap) => {
      if (!snap.empty) {
        const annData = { id: snap.docs[0].id, ...snap.docs[0].data() } as Announcement;
        setLatestAnnouncement(annData);

        snap.docChanges().forEach((change) => {
          if (change.type === 'added' && role !== 'DIRECTOR') {
            const now = Date.now();
            const created = annData.createdAt?.toMillis() || now;
            if (now - created < 30000 && Platform.OS !== 'web') {
              Notifications.scheduleNotificationAsync({
                content: {
                  title: 'Nowe ogłoszenie od Dyrektora! 📢',
                  body: annData.text,
                  sound: true,
                  vibrate: [0, 500, 200, 500],
                  priority: Notifications.AndroidNotificationPriority.MAX,
                  categoryIdentifier: 'alerts',
                },
                trigger: null,
              });
            }
          }
        });

        if (user) {
          const readDoc = await getDocs(
            query(
              collection(db, 'announcement_reads'),
              where('userId', '==', user.uid),
              where('announcementId', '==', annData.id)
            )
          );
          setIsAnnouncementConfirmed(!readDoc.empty);
        }
      }
    });
  }, [user, role]);

  const handleConfirmAnnouncement = async () => {
    if (!latestAnnouncement || !user) return;
    setIsAnnouncementConfirmed(true);
    try {
      await setDoc(doc(db, 'announcement_reads', `${user.uid}_${latestAnnouncement.id}`), {
        userId: user.uid,
        announcementId: latestAnnouncement.id,
        confirmedAt: serverTimestamp(),
      });
      notify.success('Ogłoszenie przeczytane');
    } catch (e) {
      setIsAnnouncementConfirmed(false);
      notify.error('Błąd');
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'vacations'), where('status', '==', 'APPROVED'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as VacationInfo);
      setVacations(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const moveOverdue = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'tasks'),
          where('done', '==', false),
          where('date', '<', todayStr)
        );
        const snap = await getDocs(q);
        if (snap.empty) return;

        const batch = writeBatch(db);
        snap.forEach((d) => {
          const data = d.data();

          if (data.assignedTo === user.uid) {
            batch.update(doc(db, 'tasks', d.id), { date: todayStr, wasMoved: true });
          }
        });
        await batch.commit();
      } catch (e) {
        console.error('Move overdue error:', e);
      }
    };
    moveOverdue();
  }, [user, todayStr]);

  useEffect(() => {
    const q = query(collection(db, 'tasks'), where('date', '==', selectedDate));
    return onSnapshot(q, (querySnapshot) => {
      const allTasks = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Task);

      const filtered =
        role === 'DIRECTOR' ? allTasks : allTasks.filter((t) => t.assignedTo === user?.uid);

      setTasks(filtered.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00')));
      setLoading(false);
    });
  }, [selectedDate, user, role]);

  const toggleTask = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'tasks', id), { done: !currentStatus });
    } catch (e) {
      notify.error('Błąd');
    }
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
      notify.error('Błąd');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (role === 'DIRECTOR') runWeeklyCleanup();
  }, [role]);

  const myNextVacation = useMemo(() => {
    return (
      vacations
        .filter((v) => v.userId === user?.uid && v.startDate >= todayStr)
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
        const start = new Date(v.startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diff = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diff <= 5 && diff > 0;
      })
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 3);
  }, [vacations, role]);

  return (
    <Container theme={theme}>
      <Content theme={theme}>
        <MainWrapper theme={theme} isDesktop={isDesktop}>
          <LeftColumn theme={theme} isDesktop={isDesktop}>
            {role === 'DIRECTOR' && pendingRequests.length > 0 && (
              <RequestsSection>
                <SectionTitle theme={theme}>
                  📩 Prośby od pracowników ({pendingRequests.length})
                </SectionTitle>
                {pendingRequests.map((req) => (
                  <RequestItem key={req.id} theme={theme}>
                    <RequestContent>
                      <RequestSender theme={theme}>{req.senderName}</RequestSender>
                      <RequestText theme={theme}>{req.text}</RequestText>
                    </RequestContent>
                    <ConfirmBtn theme={theme} onPress={() => handleConfirmRequest(req.id)}>
                      <CheckCircle size={24} color="white" />
                    </ConfirmBtn>
                  </RequestItem>
                ))}
              </RequestsSection>
            )}

            {role !== 'DIRECTOR' && latestAnnouncement && !isAnnouncementConfirmed && (
              <AnnouncementCard theme={theme}>
                <View style={{ marginRight: 15 }}>
                  <Megaphone size={28} color="#ff9800" />
                </View>
                <RequestContent style={{ marginLeft: 0 }}>
                  <RequestSender theme={theme}>OGŁOSZENIE</RequestSender>
                  <RequestText theme={theme} numberOfLines={3}>
                    {latestAnnouncement.text}
                  </RequestText>
                </RequestContent>
                <ConfirmBtn
                  theme={theme}
                  onPress={handleConfirmAnnouncement}
                  style={{ marginLeft: 10 }}
                >
                  <CheckCircle size={22} color="white" />
                </ConfirmBtn>
              </AnnouncementCard>
            )}

            {role !== 'DIRECTOR' && daysToVacation !== null && (
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

            {role === 'DIRECTOR' && teamUpcomingVacations.length > 0 && (
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
                {teamUpcomingVacations.map((v) => (
                  <TeamVacationItem key={v.id}>
                    <TeamVacationName theme={theme}>{v.userName}</TeamVacationName>
                    <RNText style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      {v.startDate} (
                      {Math.ceil(
                        (new Date(v.startDate).getTime() - new Date().setHours(0, 0, 0, 0)) /
                          (1000 * 60 * 60 * 24)
                      )}{' '}
                      dni)
                    </RNText>
                  </TeamVacationItem>
                ))}
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
                  backgroundColor: theme.colors.surface,
                  calendarBackground: theme.colors.surface,
                  textSectionTitleColor: theme.colors.textSecondary,
                  selectedDayBackgroundColor: theme.colors.primary,
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: theme.colors.primary,
                  dayTextColor: theme.colors.text,
                  textDisabledColor: theme.colors.border,
                  dotColor: theme.colors.primary,
                  selectedDotColor: '#ffffff',
                  arrowColor: theme.colors.primary,
                  disabledArrowColor: theme.colors.border,
                  monthTextColor: theme.colors.text,
                  indicatorColor: theme.colors.primary,
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
