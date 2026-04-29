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
import { getCalendarTheme } from '../config/theme';
import {
  CheckCircle2,
  Camera,
  ArrowRight,
  Megaphone,
  Palmtree,
  X,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { notify } from '../utils/notify';
import { downloadImage } from '../utils/download';
import { UploadOverlay } from '../components/CommonUI';
import { runWeeklyCleanup } from '../utils/cleanup';
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

const WelcomeHeader = styled.View`
  background-color: ${(props) => props.theme.colors.primary};
  padding: 20px;
  padding-bottom: 30px;
  border-bottom-left-radius: 30px;
  border-bottom-right-radius: 30px;
  margin-bottom: 10px;
`;

const WelcomeTitle = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.xl}px;
  font-weight: bold;
  color: #ffffff;
`;

const WelcomeSub = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.md}px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 4px;
`;

const Card = styled.View`
  background-color: ${(props) => props.theme.colors.surface};
  padding: ${(props) => props.theme.spacing.lg}px;
  border-radius: ${(props) => props.theme.borderRadius.lg}px;
  border: 1px solid ${(props) => props.theme.colors.border};
  margin-bottom: ${(props) => props.theme.spacing.md}px;

  /* Shadow for iOS */
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  /* Elevation for Android */
  elevation: 3;
`;

const SectionTitle = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.lg}px;
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
  font-size: ${(props) => props.theme.fontSize.md}px;
  color: ${(props) => (props.done ? props.theme.colors.textSecondary : props.theme.colors.text)};
  text-decoration: ${(props) => (props.done ? 'line-through' : 'none')};
  font-weight: ${(props) => (props.done ? '400' : '600')};
`;

const TaskTime = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.sm}px;
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

const ShowAllButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-top: 15px;
  padding: 10px;
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
  padding: 16px;
  border-radius: ${(props) => props.theme.borderRadius.lg}px;
  margin-bottom: 20px;
  flex-direction: row;
  align-items: center;
  border-left-width: 6px;
  border-left-color: ${(props) => props.theme.colors.primary};
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};

  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  elevation: 3;
`;

const VacationTextWrapper = styled.View`
  flex: 1;
  margin-left: 12px;
`;

const VacationMainText = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.md}px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
`;

const VacationSubText = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f12}px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 2px;
`;

const DaysBadge = styled.View`
  background-color: ${(props) => props.theme.colors.primary};
  padding: 8px 12px;
  border-radius: 12px;
  align-items: center;
  justify-content: center;
`;

const DaysValue = styled(RNText)`
  color: white;
  font-size: ${(props) => props.theme.fontSize.lg}px;
  font-weight: bold;
`;

const DaysLabel = styled(RNText)`
  color: white;
  font-size: ${(props) => props.theme.fontSize.f8}px;
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
  background-color: ${(props) => (props.theme.isDark ? '#2c1e00' : '#fff9f0')};
  padding: 16px;
  border-radius: ${(props) => props.theme.borderRadius.lg}px;
  border-left-width: 6px;
  border-left-color: #ff9800;
  margin-bottom: 20px;
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: ${(props) => (props.theme.isDark ? '#4d3a00' : '#ffe0b2')};

  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 3px;
  elevation: 2;
`;

const RequestsSection = styled.View`
  margin-bottom: 20px;
`;

const RequestItem = styled.View`
  background-color: ${(props) => (props.theme.isDark ? '#2c1e00' : '#fff9f0')};
  padding: 16px;
  border-radius: ${(props) => props.theme.borderRadius.lg}px;
  border: 1px solid ${(props) => (props.theme.isDark ? '#4d3a00' : '#ffe0b2')};
  border-left-width: 6px;
  border-left-color: #ff9800;
  margin-bottom: 12px;
  flex-direction: row;
  align-items: center;

  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 3px;
  elevation: 2;
`;

const RequestContent = styled.View`
  flex: 1;
  margin-right: 10px;
`;

const RequestSender = styled(RNText)`
  font-weight: bold;
  color: #ff9800;
  font-size: ${(props) => props.theme.fontSize.sm}px;
`;

const RequestText = styled(RNText)`
  color: ${(props) => (props.theme.isDark ? '#ffcc80' : '#663c00')};
  margin-top: 4px;
  font-size: ${(props) => props.theme.fontSize.f14}px;
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
        {!isDesktop && (
          <WelcomeHeader theme={theme}>
            <WelcomeTitle theme={theme}>Cześć, {userData?.name || 'Użytkowniku'}!</WelcomeTitle>
            <WelcomeSub theme={theme}>
              {format(new Date(), 'EEEE, d MMMM', { locale: pl })}
            </WelcomeSub>
          </WelcomeHeader>
        )}
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
                      fontSize: theme.fontSize.f14,
                    }}
                  >
                    Nadchodzące urlopy zespołu
                  </RNText>
                </TeamVacationHeader>
                {teamUpcomingVacations.map((v) => (
                  <TeamVacationItem key={v.id}>
                    <TeamVacationName theme={theme}>{v.userName}</TeamVacationName>
                    <RNText
                      style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.f12 }}
                    >
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

            <Card theme={theme}>
              <SectionTitle theme={theme}>Kalendarz</SectionTitle>
              <Calendar
                onDayPress={(day) => {
                  setLoading(true);
                  setSelectedDate(day.dateString);
                }}
                renderArrow={(direction: string) =>
                  direction === 'left' ? (
                    <ChevronLeft size={24} color={theme.colors.primary} />
                  ) : (
                    <ChevronRight size={24} color={theme.colors.primary} />
                  )
                }
                markedDates={{
                  [selectedDate]: { selected: true, selectedColor: theme.colors.primary },
                }}
                theme={getCalendarTheme(theme)}
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
                    {task.photoUrl && (
                      <View
                        style={{
                          position: 'relative',
                          width: '100%',
                          maxWidth: 250,
                          marginLeft: 34,
                          marginTop: 10,
                        }}
                      >
                        <TaskImagePreview
                          source={{ uri: task.photoUrl }}
                          style={{ marginLeft: 0 }}
                        />
                        <TouchableOpacity
                          onPress={() => downloadImage(task.photoUrl!, `task_${task.id}.jpg`)}
                          style={{
                            position: 'absolute',
                            bottom: 8,
                            right: 8,
                            backgroundColor: 'rgba(0, 135, 68, 0.8)',
                            padding: 6,
                            borderRadius: 8,
                          }}
                        >
                          <Download size={14} color="white" />
                        </TouchableOpacity>
                      </View>
                    )}
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
