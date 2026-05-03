import React, { useState, useEffect } from 'react';
import {
  View,
  Text as RNText,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
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
import { confirmDelete } from '../utils/confirm';
import { ScreenHeader, ScreenTitle } from '../components/CommonUI';
import { useMarkAsRead } from '../hooks/useMarkAsRead';
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
import { Video as ExpoVideo, ResizeMode } from 'expo-av';

const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
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
  font-size: ${(props) => props.theme.fontSize.f16}px;
  margin-left: 8px;
  color: ${(props) => props.theme.colors.text};
`;

const DateText = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f12}px;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const Description = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f15}px;
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
  font-size: ${(props) => props.theme.fontSize.f11}px;
  color: ${(props) => props.theme.colors.error};
  font-style: italic;
  margin-top: 10px;
`;

const NewBadge = styled.View`
  background-color: ${(props) => props.theme.colors.primary};
  border-radius: 6px;
  padding: 2px 8px;
  align-self: flex-start;
  margin-bottom: 6px;
`;

const NewBadgeText = styled(RNText)`
  color: white;
  font-size: ${(props) => props.theme.fontSize.f11}px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
  isNew?: boolean;
}

const DirectorReportsScreen = () => {
  const { theme } = useAppTheme();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<ReportMedia | null>(null);
  const scheduleMarkAsRead = useMarkAsRead('reports');

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Report);
      setReports(data);
      setLoading(false);

      scheduleMarkAsRead(data.filter((r) => r.isNew).map((r) => r.id));
    });

    return unsubscribe;
  }, [scheduleMarkAsRead]);

  const handleDelete = (report: Report) => {
    const performDelete = async () => {
      try {
        for (const item of report.media) {
          try {
            const storageRef = ref(storage, item.path);
            await deleteObject(storageRef);
          } catch (storageErr) {
            console.warn('File already deleted or missing in Storage:', item.path);
          }
        }

        await deleteDoc(doc(db, 'reports', report.id));
        notify.success('Zgłoszenie usunięte');
      } catch (e) {
        console.error('Final delete error:', e);
        notify.error('Błąd usuwania dokumentu');
      }
    };

    confirmDelete(
      'Czy na pewno chcesz trwale usunąć to zgłoszenie wraz z plikami?',
      performDelete,
      'Usuń zgłoszenie',
      'Usuń'
    );
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
      <ScreenHeader theme={theme}>
        <ScreenTitle theme={theme}>Zgłoszenia problemów</ScreenTitle>
        <RNText style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.f12 }}>
          Automatyczne usuwanie po 7 dniach
        </RNText>
      </ScreenHeader>

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ReportCard
            theme={theme}
            style={item.isNew ? { borderColor: theme.colors.primary, borderWidth: 2 } : undefined}
          >
            {item.isNew && (
              <NewBadge theme={theme}>
                <NewBadgeText theme={theme}>Nowe</NewBadgeText>
              </NewBadge>
            )}
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
            <Image
              source={{ uri: selectedMedia.url }}
              style={{ width: '100%', height: '80%', resizeMode: 'contain' }}
            />
          ) : (
            <View style={{ width: '100%', height: '80%' }}>
              {Platform.OS === 'web' ? (
                <View
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'black',
                    justifyContent: 'center',
                  }}
                >
                  <WebView
                    source={{
                      html: `
                        <body style="margin:0; background:black; display:flex; align-items:center; justify-content:center;">
                          <video src="${selectedMedia?.url}" controls style="max-width: 100%; max-height: 100%;"></video>
                        </body>
                      `,
                    }}
                    style={{ flex: 1 }}
                  />
                </View>
              ) : (
                <ExpoVideo
                  source={{ uri: selectedMedia?.url || '' }}
                  rate={1.0}
                  volume={1.0}
                  isMuted={false}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                  useNativeControls
                  style={{ flex: 1, backgroundColor: 'black' }}
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
