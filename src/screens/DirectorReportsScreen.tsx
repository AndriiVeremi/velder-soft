import React, { useState, useEffect } from 'react';
import {
  View,
  Text as RNText,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import styled from 'styled-components/native';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { useAppTheme } from '../context/ThemeContext';
import { notify } from '../utils/notify';
import {
  Trash2,
  Calendar,
  User,
  MessageSquare,
  X,
  Play,
  Image as ImageIcon,
  Video,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { WebView } from 'react-native-webview';

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

const ReportCard = styled.View`
  background-color: ${(props) => props.theme.colors.surface};
  margin: 10px 15px;
  padding: 15px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
  elevation: 2;
`;

const ReportHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const AuthorRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const AuthorName = styled(RNText)`
  font-weight: bold;
  font-size: 16px;
  margin-left: 8px;
  color: ${(props) => props.theme.colors.text};
`;

const DateText = styled(RNText)`
  font-size: 12px;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const Description = styled(RNText)`
  font-size: 15px;
  color: ${(props) => props.theme.colors.text};
  margin-bottom: 15px;
  line-height: 22px;
`;

const MediaStrip = styled.ScrollView`
  flex-direction: row;
  margin-bottom: 10px;
`;

const MediaThumbnail = styled.TouchableOpacity`
  width: 80px;
  height: 80px;
  border-radius: 8px;
  margin-right: 10px;
  background-color: ${(props) => props.theme.colors.background};
  overflow: hidden;
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
`;

const DeletionInfo = styled(RNText)`
  font-size: 11px;
  color: ${(props) => props.theme.colors.error};
  font-style: italic;
  margin-top: 10px;
`;

const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.9);
  justify-content: center;
  align-items: center;
`;

const CloseModalButton = styled.TouchableOpacity`
  position: absolute;
  top: 50px;
  right: 20px;
  z-index: 100;
`;

interface ReportMedia {
  url: string;
  path: string;
  type: 'image' | 'video';
}

interface Report {
  id: string;
  userId: string;
  userName: string;
  description: string;
  media: ReportMedia[];
  createdAt: Timestamp;
}

const DirectorReportsScreen = () => {
  const { theme } = useAppTheme();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<ReportMedia | null>(null);

  useEffect(() => {
    const cleanup = async () => {
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const q = query(
          collection(db, 'reports'),
          where('createdAt', '<', Timestamp.fromDate(sevenDaysAgo))
        );
        const snap = await getDocs(q);

        for (const docSnap of snap.docs) {
          const data = docSnap.data() as Report;
          for (const item of data.media) {
            try {
              const storageRef = ref(storage, item.path);
              await deleteObject(storageRef);
            } catch (e) {
              console.warn('Failed to delete storage item during cleanup:', item.path);
            }
          }
          await deleteDoc(doc(db, 'reports', docSnap.id));
        }
      } catch (e) {
        console.error('Error during old reports cleanup:', e);
      }
    };

    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Report);
      setReports(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = (report: Report) => {
    const performDelete = async () => {
      try {
        // Видаляємо файли по черзі, ігноруючи помилки "не знайдено"
        for (const item of report.media) {
          try {
            const storageRef = ref(storage, item.path);
            await deleteObject(storageRef);
          } catch (storageErr) {
            console.warn('File already deleted or missing in Storage:', item.path);
          }
        }
        // Видаляємо документ із бази
        await deleteDoc(doc(db, 'reports', report.id));
        notify.success('Zgłoszenie usunięte');
      } catch (e) {
        console.error('Final delete error:', e);
        notify.error('Błąd usuwania dokumentu');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Czy na pewno chcesz trwale usunąć to zgłoszenie wraz z plikami?')) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Usuń zgłoszenie',
        'Czy na pewno chcesz trwale usunąć to zgłoszenie wraz z plikami?',
        [{ text: 'Anuluj' }, { text: 'Usuń', style: 'destructive', onPress: performDelete }]
      );
    }
  };

  const openViewer = (item: ReportMedia) => {
    setSelectedMedia(item);
    setViewerVisible(true);
  };

  if (loading)
    return (
      <Container>
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
      </Container>
    );

  return (
    <Container theme={theme}>
      <Header theme={theme}>
        <Title theme={theme}>Zgłoszenia problemów</Title>
        <RNText style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
          Automatyczne usuwanie po 7 dniach
        </RNText>
      </Header>

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ReportCard theme={theme}>
            <ReportHeader>
              <AuthorRow>
                <User size={18} color={theme.colors.primary} />
                <AuthorName theme={theme}>{item.userName}</AuthorName>
              </AuthorRow>
              <TouchableOpacity onPress={() => handleDelete(item)}>
                <Trash2 size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </ReportHeader>

            <DateText theme={theme}>
              {item.createdAt ? format(item.createdAt.toDate(), 'dd.MM.yyyy HH:mm') : '...'}
            </DateText>

            <Description theme={theme}>{item.description}</Description>

            {Platform.OS === 'web' ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  overflowX: 'auto',
                  marginBottom: 10,
                  gap: 10,
                }}
              >
                {item.media.map((file, idx) => (
                  <div
                    key={idx}
                    onClick={() => openViewer(file)}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 8,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      flexShrink: 0,
                      backgroundImage: file.type === 'image' ? `url(${file.url})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundColor: file.type === 'video' ? '#000' : theme.colors.background,
                      border: `1px solid ${theme.colors.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {file.type === 'video' && <Play size={20} color="white" />}
                  </div>
                ))}
              </div>
            ) : (
              <MediaStrip horizontal showsHorizontalScrollIndicator={false}>
                {item.media.map((file, idx) => (
                  <MediaThumbnail key={idx} theme={theme} onPress={() => openViewer(file)}>
                    {file.type === 'image' ? (
                      <Image source={{ uri: file.url }} style={{ width: 80, height: 80 }} />
                    ) : (
                      <View
                        style={{
                          flex: 1,
                          backgroundColor: '#000',
                          justifyContent: 'center',
                          alignItems: 'center',
                          width: '100%',
                        }}
                      >
                        <Video size={24} color="white" />
                        <Play size={12} color="white" style={{ position: 'absolute' }} />
                      </View>
                    )}
                  </MediaThumbnail>
                ))}
              </MediaStrip>
            )}

            <DeletionInfo theme={theme}>Wygasa po 7 dniach od utworzenia</DeletionInfo>
          </ReportCard>
        )}
        ListEmptyComponent={
          <RNText style={{ textAlign: 'center', marginTop: 50, color: theme.colors.textSecondary }}>
            Brak aktywnych zgłoszeń.
          </RNText>
        }
      />

      <Modal visible={viewerVisible} transparent animationType="fade">
        <ModalOverlay>
          <CloseModalButton onPress={() => setViewerVisible(false)}>
            <X size={32} color="white" />
          </CloseModalButton>

          {selectedMedia?.type === 'image' ? (
            Platform.OS === 'web' ? (
              <div
                style={{
                  width: '90vw',
                  height: '80vh',
                  backgroundImage: `url(${selectedMedia.url})`,
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              />
            ) : (
              <Image
                source={{ uri: selectedMedia.url }}
                style={{ width: '100%', height: '80%', resizeMode: 'contain' }}
              />
            )
          ) : (
            <View style={{ width: '100%', height: '80%' }}>
              {Platform.OS === 'web' ? (
                <video
                  src={selectedMedia?.url}
                  controls
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <WebView
                  source={{ uri: selectedMedia?.url || '' }}
                  style={{ flex: 1, backgroundColor: 'black' }}
                  allowsFullscreenVideo
                />
              )}
            </View>
          )}
        </ModalOverlay>
      </Modal>
    </Container>
  );
};

export default DirectorReportsScreen;
