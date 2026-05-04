import React, { useState, useEffect } from 'react';
import {
  View,
  Text as RNText,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import styled from 'styled-components/native';
import { db } from '../config/firebase';
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  where,
  onSnapshot,
  Timestamp,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { notify } from '../utils/notify';
import { confirmDelete } from '../utils/confirm';
import { playDoneSound } from '../utils/audio';
import {
  ScreenHeader,
  ScreenTitle,
  MicButton,
  VoiceInputContainer,
  ListeningIndicator,
} from '../components/CommonUI';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { Send, Trash2, MessageSquare, CheckCircle2, Clock, Mic } from 'lucide-react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { sendPushNotification } from '../utils/notifications';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { RootStackParamList } from '../config/navigationTypes';

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

const SectionLabel = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f12}px;
  font-weight: bold;
  color: #ff9800;
  margin-bottom: 10px;
  text-transform: uppercase;
`;

const StyledInput = styled.TextInput`
  background-color: ${(props) => props.theme.colors.background};
  padding: 15px;
  border-radius: 10px;
  min-height: 100px;
  text-align-vertical: top;
  font-size: ${(props) => props.theme.fontSize.f16}px;
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

const RequestCard = styled.View`
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

const CardHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const StatusRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const StatusText = styled(RNText)<{ confirmed: boolean }>`
  font-size: ${(props) => props.theme.fontSize.f11}px;
  font-weight: bold;
  color: ${(props) => (props.confirmed ? props.theme.colors.success : '#ff9800')};
  text-transform: uppercase;
  margin-left: 5px;
`;

const ContentText = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f15}px;
  color: ${(props) => props.theme.colors.text};
  line-height: 22px;
  padding-right: 30px;
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

interface UserRequest {
  id: string;
  senderId: string;
  text: string;
  status: 'PENDING' | 'CONFIRMED';
  createdAt: Timestamp | null;
}

type Props = StackScreenProps<RootStackParamList, 'LiniaDoSzefa'>;

const SendRequestScreen = ({ navigation }: Props) => {
  const { user, userData } = useAuth();
  const { theme } = useAppTheme();
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const { isListening, toggleListening } = useVoiceRecognition({
    onResult: (transcript) => {
      setText(transcript);
    },
  });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'requests'), where('senderId', '==', user.uid));

    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as UserRequest);
      const sorted = data.sort(
        (a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
      );
      setRequests(sorted);
      setFetching(false);
    });
  }, [user]);

  const handlePost = async () => {
    if (!text.trim()) return notify.error('Wpisz wiadomość');
    setLoading(true);
    try {
      await addDoc(collection(db, 'requests'), {
        senderId: user?.uid,
        senderName: userData?.name || 'Pracownik',
        text: text.trim(),
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
          if (data.pushToken && d.id !== user?.uid)
            tokens.push({
              token: data.pushToken,
              notificationStart: data.notificationStart,
              notificationEnd: data.notificationEnd,
            });
        });

        if (tokens.length > 0) {
          await sendPushNotification(
            tokens,
            'Nowa wiadomość od pracownika! 📩',
            `${userData?.name || 'Pracownik'}: ${text.trim().length > 50 ? text.trim().substring(0, 50) + '...' : text.trim()}`,
            'alerts',
            { screen: 'Home' }
          );
        }
      } catch (pushErr) {
        console.warn('Failed to notify director:', pushErr);
      }

      setText('');
      await playDoneSound();
      notify.success('Wysłano do Szefa');
    } catch (e) {
      notify.error('Błąd wysyłania');
    } finally {
      setLoading(false);
    }
  };

  const deleteRequest = (id: string) => {
    confirmDelete(
      'Czy na pewno chcesz usunąć tę wiadomość?',
      async () => {
        try {
          await deleteDoc(doc(db, 'requests', id));
          notify.success('Usunięto');
        } catch (e) {
          notify.error('Błąd');
        }
      },
      'Usuń',
      'Usuń'
    );
  };

  return (
    <Container theme={theme}>
      <ScreenHeader theme={theme}>
        <ScreenTitle theme={theme}>Linia do Szefa</ScreenTitle>
      </ScreenHeader>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <InputCard theme={theme}>
              <SectionLabel>Nowa wiadomość do Szefa</SectionLabel>
              <VoiceInputContainer theme={theme} style={{ marginBottom: 15 }}>
                <StyledInput
                  placeholder="Napisz o co chcesz poprosić lub co zgłosić..."
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

              <PostButton onPress={handlePost} disabled={loading} theme={theme}>
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Send size={20} color="white" />
                    <PostButtonText theme={theme}>Wyślij do Szefa</PostButtonText>
                  </>
                )}
              </PostButton>
            </InputCard>
          }
          renderItem={({ item }) => (
            <RequestCard theme={theme}>
              <CardHeader>
                <StatusRow>
                  {item.status === 'CONFIRMED' ? (
                    <CheckCircle2 size={14} color={theme.colors.success} />
                  ) : (
                    <Clock size={14} color="#ff9800" />
                  )}
                  <StatusText theme={theme} confirmed={item.status === 'CONFIRMED'}>
                    {item.status === 'CONFIRMED' ? 'Potwierdzone' : 'Oczekuje'}
                  </StatusText>
                </StatusRow>
                <TouchableOpacity onPress={() => deleteRequest(item.id)} style={{ padding: 5 }}>
                  <Trash2 size={18} color={theme.colors.error} opacity={0.5} />
                </TouchableOpacity>
              </CardHeader>
              <ContentText theme={theme}>{item.text}</ContentText>
              <DateText theme={theme}>
                {item.createdAt
                  ? format(item.createdAt.toDate(), 'd MMMM yyyy, HH:mm', { locale: pl })
                  : 'Przed chwilą'}
              </DateText>
            </RequestCard>
          )}
          ListEmptyComponent={
            !fetching ? (
              <EmptyText theme={theme}>Brak historii wiadomości.</EmptyText>
            ) : (
              <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.primary} />
            )
          }
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      </KeyboardAvoidingView>
    </Container>
  );
};

export default SendRequestScreen;
