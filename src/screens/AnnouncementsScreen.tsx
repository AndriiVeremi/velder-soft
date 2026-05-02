import React, { useState, useEffect } from 'react';
import {
  View,
  Text as RNText,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import styled from 'styled-components/native';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  getDocs,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { Megaphone, Trash2, Send, Bell, Mic } from 'lucide-react-native';
import { format } from 'date-fns';
import { notify } from '../utils/notify';
import { confirmDelete } from '../utils/confirm';
import {
  ScreenHeader,
  ScreenTitle,
  MicButton,
  VoiceInputContainer,
  ListeningIndicator,
} from '../components/CommonUI';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { StackScreenProps } from '@react-navigation/stack';
import { sendPushNotification } from '../utils/notifications';

interface Announcement {
  id: string;
  text: string;
  createdAt: any;
  createdBy: string;
  authorName: string;
}

const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

const InputCard = styled.View`
  background-color: ${(props) => props.theme.colors.surface};
  margin: 15px;
  padding: 15px;
  border-radius: 12px;
  border: 1px solid ${(props) => props.theme.colors.border};
  elevation: 3;
`;

const StyledInput = styled.TextInput`
  background-color: ${(props) => props.theme.colors.background};
  padding: 15px;
  border-radius: 10px;
  min-height: 100px;
  text-align-vertical: top;
  font-size: 16px;
  margin-bottom: 15px;
  color: ${(props) => props.theme.colors.text};
`;

const PostButton = styled.TouchableOpacity`
  background-color: ${(props) => props.theme.colors.primary};
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 15px;
  border-radius: 10px;
`;

const PostButtonText = styled(RNText)`
  color: white;
  font-weight: bold;
  margin-left: 10px;
  font-size: ${(props) => props.theme.fontSize.f16}px;
`;

const AnnouncementCard = styled.View`
  background-color: ${(props) => props.theme.colors.surface};
  margin: 8px 15px;
  padding: 15px;
  border-radius: 12px;
  border-left-width: 5px;
  border-left-color: #ff9800;
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
  elevation: 2;
`;

const AuthorText = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f12}px;
  font-weight: bold;
  color: #ff9800;
  margin-bottom: 5px;
`;

const ContentText = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f15}px;
  color: ${(props) => props.theme.colors.text};
  line-height: 22px;
`;

const DateText = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f11}px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 10px;
  text-align: right;
`;

const EmptyText = styled(RNText)`
  text-align: center;
  margin-top: 50px;
  color: ${(props) => props.theme.colors.textSecondary};
`;

type Props = StackScreenProps<any, 'Announcements'>;

const AnnouncementsScreen = ({ navigation, route }: Props) => {
  const { user, userData, role } = useAuth();
  const { theme } = useAppTheme();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const { isListening, toggleListening } = useVoiceRecognition({
    onResult: (transcript) => {
      setText(transcript);
    },
  });

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Announcement);
      setAnnouncements(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handlePost = async () => {
    if (!text.trim()) return notify.error('Wpisz treść ogłoszenia');
    setPosting(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        text,
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
        authorName: userData?.name || 'Dyrektor',
      });

      try {
        const usersSnap = await getDocs(
          query(collection(db, 'users'), where('isActive', '==', true))
        );
        const tokens: { token: string; notificationStart?: string; notificationEnd?: string }[] =
          [];
        usersSnap.forEach((docSnap) => {
          const u = docSnap.data();
          if (u.pushToken && docSnap.id !== user?.uid) {
            tokens.push({
              token: u.pushToken,
              notificationStart: u.notificationStart,
              notificationEnd: u.notificationEnd,
            });
          }
        });

        if (tokens.length > 0) {
          await sendPushNotification(
            tokens,
            'Nowe ogłoszenie! 📢',
            text.length > 50 ? `${text.substring(0, 50)}...` : text,
            'alerts'
          );
        }
      } catch (pushErr) {
        console.warn('Failed to send push notifications:', pushErr);
      }

      setText('');
      notify.success('Ogłoszenie opublikowane');
    } catch (e) {
      notify.error('Błąd publikacji');
    } finally {
      setPosting(false);
    }
  };

  const deleteAnnouncement = (id: string) => {
    confirmDelete(
      'Czy na pewno chcesz usunąć to ogłoszenie?',
      async () => {
        try {
          await deleteDoc(doc(db, 'announcements', id));
          notify.success('Usunięto ogłoszenie');
        } catch (e) {
          notify.error('Błąd usuwania');
        }
      },
      'Usuń',
      'Usuń'
    );
  };

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );

  return (
    <Container theme={theme}>
      <ScreenHeader theme={theme}>
        <ScreenTitle theme={theme}>Ogłoszenia i Komunikaty</ScreenTitle>
      </ScreenHeader>

      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          role === 'DIRECTOR' ? (
            <InputCard theme={theme}>
              <AuthorText>Nowe ogłoszenie do zespołu</AuthorText>
              <VoiceInputContainer theme={theme} style={{ marginBottom: 15 }}>
                <StyledInput
                  placeholder="Wpisz ważną informację dla wszystkich pracowników..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={text}
                  onChangeText={setText}
                  multiline
                  style={{ flex: 1, marginBottom: 0 }}
                />
                <MicButton active={isListening} theme={theme} onPress={toggleListening}>
                  <Mic size={24} color={isListening ? 'white' : theme.colors.primary} />
                </MicButton>
              </VoiceInputContainer>
              <ListeningIndicator active={isListening} theme={theme} />

              <PostButton onPress={handlePost} disabled={posting} theme={theme}>
                {posting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Send size={20} color="white" />
                    <PostButtonText theme={theme}>Opublikuj wiadomość</PostButtonText>
                  </>
                )}
              </PostButton>
            </InputCard>
          ) : null
        }
        renderItem={({ item }) => (
          <AnnouncementCard theme={theme}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <AuthorText>{item.authorName}</AuthorText>
              {role === 'DIRECTOR' && (
                <TouchableOpacity
                  onPress={() => deleteAnnouncement(item.id)}
                  style={{ padding: 8 }}
                >
                  <Trash2 size={20} color={theme.colors.error} />
                </TouchableOpacity>
              )}
            </View>
            <ContentText theme={theme}>{item.text}</ContentText>
            <DateText theme={theme}>
              {item.createdAt?.toDate
                ? format(item.createdAt.toDate(), 'd MMMM yyyy, HH:mm')
                : 'Przed chwilą'}
            </DateText>
          </AnnouncementCard>
        )}
        ListEmptyComponent={<EmptyText theme={theme}>Brak ważnych ogłoszeń.</EmptyText>}
      />
    </Container>
  );
};

export default AnnouncementsScreen;
