import React, { useState } from 'react';
import {
  View,
  Text as RNText,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import styled from 'styled-components/native';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db, storage, auth } from '../config/firebase';
import { useAppTheme } from '../context/ThemeContext';
import { notify } from '../utils/notify';
import { Camera, Video, X, Send, Trash2, Image as ImageIcon } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { StackScreenProps } from '@react-navigation/stack';
import { sendPushNotification } from '../utils/notifications';
import { ScreenHeader, ScreenTitle } from '../components/CommonUI';

const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

const Content = styled.View`
  padding: 20px;
  max-width: 600px;
  width: 100%;
  align-self: center;
`;

const Label = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f14}px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-bottom: 8px;
  text-transform: uppercase;
`;

const StyledTextInput = styled.TextInput`
  background-color: ${(props) => props.theme.colors.surface};
  border-radius: 12px;
  padding: 15px;
  font-size: ${(props) => props.theme.fontSize.f16}px;
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
  color: ${(props) => props.theme.colors.text};
  margin-bottom: 25px;
  min-height: 120px;
`;

const MediaItem = styled.View`
  width: 100px;
  height: 100px;
  margin-right: 10px;
  margin-bottom: 10px;
  border-radius: 10px;
  overflow: hidden;
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
  position: relative;
  background-color: ${(props) => props.theme.colors.background};
`;

const RemoveMediaButton = styled.TouchableOpacity`
  position: absolute;
  top: 5px;
  right: 5px;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 10px;
  padding: 2px;
  z-index: 10;
`;

const AddMediaRow = styled.View`
  flex-direction: row;
  margin-bottom: 30px;
`;

const MediaGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  margin-bottom: 10px;
`;

const AddMediaButton = styled.TouchableOpacity`
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: ${(props) => props.theme.colors.surface};
  padding: 15px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.primary};
  margin-right: 10px;
`;

const AddMediaText = styled(RNText)`
  margin-left: 10px;
  color: ${(props) => props.theme.colors.primary};
  font-weight: bold;
`;

const SubmitButton = styled.TouchableOpacity<{ disabled?: boolean }>`
  background-color: ${(props) => (props.disabled ? '#ccc' : props.theme.colors.error)};
  padding: 18px;
  border-radius: 12px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
  margin-bottom: 40px;
`;

const SubmitButtonText = styled(RNText)`
  color: white;
  font-weight: bold;
  font-size: ${(props) => props.theme.fontSize.lg}px;
  margin-left: 10px;
`;

interface MediaFile {
  uri: string;
  type: 'image' | 'video';
}

type Props = StackScreenProps<any, 'ReportProblem'>;

const ReportProblemScreen = ({ navigation }: Props) => {
  const { userData } = useAuth();
  const { theme } = useAppTheme();
  const [description, setDescription] = useState('');
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const pickMedia = async (type: 'image' | 'video' | 'mixed') => {
    if (media.length >= 5) {
      notify.error('Maksymalnie 5 plików');
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes:
        type === 'image'
          ? ImagePicker.MediaTypeOptions.Images
          : type === 'video'
            ? ImagePicker.MediaTypeOptions.Videos
            : ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: 5 - media.length,
      quality: 0.7,
      videoMaxDuration: 30,
    };

    try {
      const result = await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled) {
        const newMedia: MediaFile[] = result.assets.map((asset) => ({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
        }));
        setMedia([...media, ...newMedia].slice(0, 5));
      }
    } catch (e) {
      notify.error('Błąd wyboru mediów');
    }
  };

  const removeMedia = (index: number) => {
    const nextMedia = [...media];
    nextMedia.splice(index, 1);
    setMedia(nextMedia);
  };

  const handleSubmit = async () => {
    if (!description.trim()) return notify.error('Opisz problem');
    if (media.length === 0) return notify.error('Dodaj przynajmniej jedno zdjęcie lub wideo');

    setUploading(true);
    try {
      const uploadedMedia = [];
      const timestamp = Date.now();
      const userId = auth.currentUser?.uid;

      for (let i = 0; i < media.length; i++) {
        const file = media[i];
        const response = await fetch(file.uri);
        const blob = await response.blob();
        const extension = file.type === 'video' ? 'mp4' : 'jpg';
        const filename = `reports/${userId}/${timestamp}_${i}.${extension}`;
        const storageRef = ref(storage, filename);

        await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(storageRef);

        uploadedMedia.push({
          url,
          path: filename,
          type: file.type,
        });
      }

      await addDoc(collection(db, 'reports'), {
        userId,
        userName: userData?.name || 'Pracownik',
        description,
        media: uploadedMedia,
        createdAt: serverTimestamp(),
        isNew: true,
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
            'Nowe zgłoszenie problemu! ⚠️',
            `${userData?.name || 'Pracownik'}: ${description.substring(0, 50)}${description.length > 50 ? '...' : ''}`
          );
        }
      } catch (pushErr) {
        console.warn('Failed to notify director:', pushErr);
      }

      notify.success('Zgłoszenie zostało wysłane');
      navigation.goBack();
    } catch (e) {
      console.error(e);
      notify.error('Błąd wysyłania');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Container theme={theme}>
      <ScreenHeader theme={theme}>
        <ScreenTitle theme={theme}>Zgłoś problem</ScreenTitle>
      </ScreenHeader>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 50}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <Content>
            <Label theme={theme}>Opis problemu</Label>

            <StyledTextInput
              theme={theme}
              placeholder="Np. Awaria instalacji, brak materiałów..."
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
              placeholderTextColor={theme.colors.textSecondary}
            />

            <Label theme={theme}>Załączniki ({media.length}/5)</Label>
            <MediaGrid>
              {media.map((item, index) => (
                <MediaItem key={index} theme={theme}>
                  <RemoveMediaButton onPress={() => removeMedia(index)}>
                    <X size={16} color="white" />
                  </RemoveMediaButton>
                  {item.type === 'image' ? (
                    <Image source={{ uri: item.uri }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: '#000',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Video size={30} color="white" />
                    </View>
                  )}
                </MediaItem>
              ))}
            </MediaGrid>

            <AddMediaRow>
              <AddMediaButton theme={theme} onPress={() => pickMedia('image')}>
                <Camera size={20} color={theme.colors.primary} />
                <AddMediaText theme={theme}>Zdjęcia</AddMediaText>
              </AddMediaButton>
              <AddMediaButton theme={theme} onPress={() => pickMedia('video')}>
                <Video size={20} color={theme.colors.primary} />
                <AddMediaText theme={theme}>Wideo</AddMediaText>
              </AddMediaButton>
            </AddMediaRow>

            <SubmitButton theme={theme} onPress={handleSubmit} disabled={uploading}>
              {uploading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Send size={20} color="white" />
                  <SubmitButtonText theme={theme}>Wyślij do Dyrektora</SubmitButtonText>
                </>
              )}
            </SubmitButton>
          </Content>
        </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
};

export default ReportProblemScreen;
