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
  Alert,
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
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { theme } from '../config/theme';
import { CheckCircle2, Camera, ArrowRight } from 'lucide-react-native';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { runWeeklyCleanup } from '../utils/cleanup';

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

const MainWrapper = styled.View`
  flex-direction: ${isDesktop ? 'row' : 'column'};
  padding: ${(props) => props.theme.spacing.md}px;
  ${isDesktop &&
  `
    max-width: 1200px;
    align-self: center;
    width: 100%;
  `}
`;

const LeftColumn = styled.View`
  flex: ${isDesktop ? 1.5 : 1};
  margin-right: ${isDesktop ? theme.spacing.lg : 0}px;
`;

const RightColumn = styled.View`
  flex: 1;
  margin-top: ${isDesktop ? 0 : theme.spacing.lg}px;
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

import { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  Home: undefined;
  Tasks: undefined;
  // add other screens as needed or use a central navigation types file
};

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

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

const HomeScreen = ({ navigation }: Props) => {
  const { user, role } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  useEffect(() => {
    if (role === 'DIRECTOR') {
      runWeeklyCleanup();
    }
  }, [role]);

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
        if (Platform.OS === 'web') toast.success('Przeniesiono zaległe zadania');
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
          setTasks(sorted.slice(0, 5));
          setLoading(false);
        }
      },
      (error) => {
        console.warn('HomeScreen error:', error);
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
      if (Platform.OS === 'web' && !currentStatus) toast.success('Zadanie wykonane!');
    } catch (e) {
      console.error(e);
    }
  };

  const addPhotoToTask = async (taskId: string) => {
    let result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (result.canceled) return;

    setUploading(true);
    try {
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      // eslint-disable-next-line react-hooks/purity
      const filename = `task_photos/${taskId}_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      const photoUrl = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'tasks', taskId), {
        photoUrl,
        photoPath: filename,
        done: true,
      });
      if (Platform.OS === 'web') toast.success('Zdjęcie dodane');
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Container theme={theme}>
      <Content theme={theme}>
        <MainWrapper theme={theme}>
          <LeftColumn theme={theme}>
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
          <RightColumn theme={theme}>
            <Card theme={theme}>
              <SectionTitle theme={theme}>Zadania na dziś</SectionTitle>
              {loading ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                tasks.map((task) => (
                  <TaskItemContainer key={task.id} theme={theme}>
                    <TaskRow theme={theme} onPress={() => toggleTask(task.id, task.done)}>
                      <CheckCircle2
                        size={22}
                        color={task.done ? theme.colors.success : theme.colors.border}
                      />
                      <TaskText theme={theme} done={task.done}>
                        {task.title}
                      </TaskText>
                      <CameraIconButton
                        onPress={() => addPhotoToTask(task.id)}
                      >
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
                <EmptyTasksText theme={theme}>
                  Brak zadań.
                </EmptyTasksText>
              )}
              <ShowAllButton onPress={() => navigation.navigate('Tasks')}>
                <ShowAllText theme={theme}>
                  Wszystkie zadania
                </ShowAllText>
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
