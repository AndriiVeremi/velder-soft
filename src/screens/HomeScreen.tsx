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
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { getCalendarTheme } from '../config/theme';
import {
  Megaphone,
  Palmtree,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react-native';
import { getSystemStats, SystemStats } from '../utils/systemStats';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { notify } from '../utils/notify';
import { runWeeklyCleanup } from '../utils/cleanup';
import { useMarkAsRead } from '../hooks/useMarkAsRead';
import { StackScreenProps } from '@react-navigation/stack';
import { Task, Announcement, VacationInfo, UserRequest, ServiceRecord } from '../types';
import { RootStackParamList } from '../config/navigationTypes';

type Props = StackScreenProps<RootStackParamList, 'Home'>;

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
  elevation: 3;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
`;

const SectionHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
`;

const SectionTitle = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.lg}px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
`;

const InfoItemContainer = styled.View<{
  priority?: string;
  type: 'task' | 'service';
  done: boolean;
}>`
  border-left-width: 4px;
  border-left-color: ${(props) => {
    if (props.done) return props.theme.colors.success;
    if (props.priority === 'URGENT') return props.theme.colors.error;
    return props.type === 'service' ? '#ff9800' : props.theme.colors.primary;
  }};
  background-color: ${(props) => (props.theme.isDark ? '#1a1a1a' : '#f9f9f9')};
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 10px;
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
`;

const InfoHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
`;

const InfoTitle = styled(RNText)<{ done: boolean }>`
  font-size: ${(props) => props.theme.fontSize.f14}px;
  font-weight: bold;
  color: ${(props) => (props.done ? props.theme.colors.textSecondary : props.theme.colors.text)};
  text-decoration: ${(props) => (props.done ? 'line-through' : 'none')};
  flex: 1;
`;

const InfoSubtitle = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f12}px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 2px;
`;

const InfoBadge = styled.View<{ type: 'task' | 'service'; urgent?: boolean }>`
  background-color: ${(props) =>
    props.urgent
      ? props.theme.colors.error
      : props.type === 'service'
        ? '#fff3e0'
        : props.theme.colors.accent};
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
`;

const BadgeText = styled(RNText)<{ urgent?: boolean }>`
  font-size: 10px;
  font-weight: bold;
  color: ${(props) => (props.urgent ? 'white' : '#666')};
`;

const EmptyTasksText = styled(RNText)`
  color: ${(props) => props.theme.colors.textSecondary};
  text-align: center;
  margin-top: 10px;
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
  elevation: 3;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
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
  elevation: 2;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 3px;
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
  elevation: 2;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 3px;
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

const StorageWarning = styled.TouchableOpacity`
  background-color: ${(props) => (props.theme.isDark ? '#2c1e1e' : '#fff5f5')};
  padding: 16px;
  border-radius: ${(props) => props.theme.borderRadius.lg}px;
  border-left-width: 6px;
  border-left-color: ${(props) => props.theme.colors.error};
  margin-bottom: 20px;
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: ${(props) => (props.theme.isDark ? '#4d2c2c' : '#ffcccc')};
  elevation: 2;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 3px;
`;

const HomeScreen = ({ navigation }: Props) => {
  const { user, role, userData } = useAuth();
  const { theme } = useAppTheme();
  const scheduleMarkRequestsRead = useMarkAsRead('requests');
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 768;

  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null);
  const [isAnnouncementConfirmed, setIsAnnouncementConfirmed] = useState(false);
  const [vacations, setVacations] = useState<VacationInfo[]>([]);
  const [pendingRequests, setPendingRequests] = useState<UserRequest[]>([]);
  const [storageStats, setStorageStats] = useState<SystemStats | null>(null);

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  useEffect(() => {
    if (role === 'DIRECTOR') {
      getSystemStats()
        .then(setStorageStats)
        .catch(() => {});
    }
  }, [role]);

  useEffect(() => {
    if (role !== 'DIRECTOR') return;
    const q = query(collection(db, 'requests'), where('status', '==', 'PENDING'));

    return onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserRequest);
      const sorted = data.sort(
        (a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
      );
      setPendingRequests(sorted);
      scheduleMarkRequestsRead(data.filter((r) => (r as any).isNew).map((r) => r.id));
    });
  }, [role, scheduleMarkRequestsRead]);

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
      } else {
        setLatestAnnouncement(null);
        setIsAnnouncementConfirmed(false);
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
    if (!user) return;

    const qTasks = query(collection(db, 'tasks'), where('date', '==', selectedDate));
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Task);
      const filtered =
        role === 'DIRECTOR'
          ? all
          : all.filter((t) => t.assignedTo === user.uid || t.assignedTo === 'all');
      setTasks(filtered.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00')));
      setLoading(false);
    });

    const qServices = query(collection(db, 'services'), orderBy('createdAt', 'desc'), limit(10));
    const unsubServices = onSnapshot(qServices, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any);
      setServices(data);
    });

    return () => {
      unsubTasks();
      unsubServices();
    };
  }, [selectedDate, user, role, todayStr]);

  useEffect(() => {
    if (role === 'DIRECTOR') runWeeklyCleanup();
  }, [role]);

  const combinedItems = useMemo(() => {
    const tItems = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      subtitle: t.time || 'Cały dzień',
      type: 'task' as const,
      priority: t.priority,
      done: t.done,
      createdAt: t.createdAt?.toMillis() || 0,
    }));

    const sItems = services
      .filter((s) => {
        if (!s.createdAt) return false;
        const sDate = format(s.createdAt.toDate(), 'yyyy-MM-dd');
        return sDate === selectedDate;
      })
      .map((s) => ({
        id: s.id,
        title: `${s.hospital} - ${s.department}`,
        subtitle: s.description,
        type: 'service' as const,
        priority: 'NORMAL',
        done: (s as any).status === 'DONE',
        createdAt: s.createdAt?.toMillis() || 0,
      }));

    return [...tItems, ...sItems].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
  }, [tasks, services, selectedDate]);

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
            {role === 'DIRECTOR' && storageStats && storageStats.storage.percentage > 80 && (
              <StorageWarning theme={theme} onPress={() => navigation.navigate('SystemStatus')}>
                <AlertTriangle size={24} color={theme.colors.error} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <RNText style={{ color: theme.colors.error, fontWeight: 'bold', fontSize: 14 }}>
                    Kończy się miejsce w chmurze! ({storageStats.storage.percentage}%)
                  </RNText>
                  <RNText style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                    Zalecane uruchomienie czyszczenia w ustawieniach systemu.
                  </RNText>
                </View>
                <ArrowRight size={18} color={theme.colors.error} />
              </StorageWarning>
            )}

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
              <SectionHeader>
                <SectionTitle theme={theme} style={{ marginBottom: 0 }}>
                  Dzisiejszy Plan
                </SectionTitle>
                <TouchableOpacity onPress={() => navigation.navigate('Tasks')}>
                  <ArrowRight size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              </SectionHeader>

              {loading ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                combinedItems.map((item) => (
                  <InfoItemContainer
                    key={`${item.type}_${item.id}`}
                    theme={theme}
                    type={item.type}
                    priority={item.priority}
                    done={item.done}
                  >
                    <InfoHeader>
                      <InfoTitle theme={theme} done={item.done} numberOfLines={1}>
                        {item.title}
                      </InfoTitle>
                      <InfoBadge type={item.type} urgent={item.priority === 'URGENT'} theme={theme}>
                        <BadgeText urgent={item.priority === 'URGENT'}>
                          {item.type === 'service'
                            ? 'SERWIS'
                            : item.priority === 'URGENT'
                              ? 'PILNE'
                              : 'ZADANIE'}
                        </BadgeText>
                      </InfoBadge>
                    </InfoHeader>
                    <InfoSubtitle theme={theme} numberOfLines={1}>
                      {item.subtitle}
                    </InfoSubtitle>
                  </InfoItemContainer>
                ))
              )}

              {combinedItems.length === 0 && !loading && (
                <EmptyTasksText theme={theme}>Brak zaplanowanych zadań.</EmptyTasksText>
              )}

              <TouchableOpacity
                onPress={() => navigation.navigate('Tasks')}
                style={{ marginTop: 10, alignItems: 'center' }}
              >
                <RNText style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 14 }}>
                  Przejdź do pełnej listy
                </RNText>
              </TouchableOpacity>
            </Card>
          </RightColumn>
        </MainWrapper>
      </Content>
    </Container>
  );
};

export default HomeScreen;
