import React, { useState, useEffect } from 'react';
import {
  View,
  Text as RNText,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Switch,
} from 'react-native';
import Constants from 'expo-constants';
import styled from 'styled-components/native';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../config/firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAppTheme } from '../context/ThemeContext';
import { notify } from '../utils/notify';
import { scheduleDailyReminder, setQuietHoursCache } from '../utils/notifications';
import { format } from 'date-fns';
import { StackScreenProps } from '@react-navigation/stack';
import { User, Shield, LogOut, Edit2 } from 'lucide-react-native';
import { TimePicker } from '../components/CommonUI';

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

const Content = styled.View`
  padding: ${(props) => props.theme.spacing.lg}px;
  max-width: 600px;
  width: 100%;
  align-self: center;
`;

const ProfileCard = styled.View`
  background-color: ${(props) => props.theme.colors.surface};
  border-radius: ${(props) => props.theme.borderRadius.lg}px;
  padding: ${(props) => props.theme.spacing.xl}px;
  align-items: center;
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const AvatarCircle = styled.View`
  width: 80px;
  height: 80px;
  border-radius: 40px;
  background-color: ${(props) => props.theme.colors.accent};
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  border: 2px solid ${(props) => props.theme.colors.primary};
`;

const NameContainer = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 5px;
`;

const NameText = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.xl}px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
`;

const EmailText = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f16}px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-bottom: 20px;
`;

const RoleBadge = styled.View<{ isAdmin: boolean }>`
  background-color: ${(props) =>
    props.isAdmin
      ? props.theme.isDark
        ? '#4d2c00'
        : '#FFF3E0'
      : props.theme.isDark
        ? '#1a1f3d'
        : '#E8EAF6'};
  padding: 6px 16px;
  border-radius: 20px;
  flex-direction: row;
  align-items: center;
  margin-bottom: 30px;
`;

const RoleText = styled(RNText)<{ isAdmin: boolean }>`
  font-size: ${(props) => props.theme.fontSize.f12}px;
  font-weight: bold;
  color: ${(props) =>
    props.isAdmin
      ? props.theme.isDark
        ? '#ffa726'
        : '#E65100'
      : props.theme.isDark
        ? '#90caf9'
        : '#1A237E'};
  margin-left: 8px;
`;

const InfoSection = styled.View`
  width: 100%;
  border-top-width: 1px;
  border-top-color: ${(props) => props.theme.colors.border};
  padding-top: 20px;
`;

const EditInput = styled.TextInput`
  font-size: ${(props) => props.theme.fontSize.lg}px;
  font-weight: bold;
  border-bottom-width: 2px;
  border-bottom-color: ${(props) => props.theme.colors.primary};
  text-align: center;
  min-width: 200px;
  color: ${(props) => props.theme.colors.text};
`;

const LogoutButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: ${(props) => props.theme.colors.surface};
  border: 1px solid ${(props) => props.theme.colors.error};
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
`;

const EditInputWrapper = styled.View`
  align-items: center;
  margin-bottom: 15px;
`;

const EditIconButton = styled.TouchableOpacity`
  margin-left: 10px;
`;

const SectionTitleText = styled(RNText)`
  font-weight: bold;
  margin-bottom: 15px;
  font-size: ${(props) => props.theme.fontSize.f16}px;
  color: ${(props) => props.theme.colors.text};
`;

const SectionLabel = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f12}px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-bottom: 8px;
`;

const SaveSettingsButton = styled.TouchableOpacity`
  background-color: ${(props) => props.theme.colors.primary};
  padding: 15px;
  border-radius: 10px;
  margin-top: 25px;
  align-items: center;
`;

const LogoutButtonText = styled(RNText)`
  color: ${(props) => props.theme.colors.error};
  font-weight: bold;
  margin-left: 10px;
  font-size: ${(props) => props.theme.fontSize.f16}px;
`;

type Props = StackScreenProps<any, 'Profile'>;

const ProfileScreen = ({ navigation }: Props) => {
  const { user, userData, role } = useAuth();
  const { theme, isDark, toggleTheme, fontScale, setFontScale } = useAppTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userData?.name || '');
  const [loading, setLoading] = useState(false);
  const [startH, setStartH] = useState(() => {
    if (userData?.notificationStart) return parseInt(userData.notificationStart.split(':')[0]);
    return 8;
  });
  const [startM, setStartM] = useState(() => {
    if (userData?.notificationStart) return parseInt(userData.notificationStart.split(':')[1]);
    return 0;
  });
  const [endH, setEndH] = useState(() => {
    if (userData?.notificationEnd) return parseInt(userData.notificationEnd.split(':')[0]);
    return 17;
  });
  const [endM, setEndM] = useState(() => {
    if (userData?.notificationEnd) return parseInt(userData.notificationEnd.split(':')[1]);
    return 0;
  });

  useEffect(() => {
    if (userData) {
      setQuietHoursCache(userData.notificationStart, userData.notificationEnd);
    }
  }, [userData]);

  const saveSettings = async () => {
    if (!user) return;
    setLoading(true);
    const start = `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;
    const end = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notificationStart: start,
        notificationEnd: end,
        name: name,
      });

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const q = query(
        collection(db, 'tasks'),
        where('date', '==', todayStr),
        where('done', '==', false)
      );
      const snap = await getDocs(q);
      await scheduleDailyReminder(snap.size, start);
      setQuietHoursCache(start, end);

      notify.success('Ustawienia zapisane');
      setIsEditing(false);
    } catch (e) {
      notify.error('Błąd zapisu');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Wylogować?')) signOut(auth);
    } else {
      Alert.alert('Wyloguj', 'Czy na pewno?', [
        { text: 'Anuluj' },
        { text: 'Tak', onPress: () => signOut(auth) },
      ]);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
    >
      <Container theme={theme}>
        <Content theme={theme}>
          <ProfileCard theme={theme}>
            <AvatarCircle theme={theme}>
              <User size={40} color={theme.colors.primary} />
            </AvatarCircle>

            {isEditing ? (
              <EditInputWrapper theme={theme}>
                <EditInput theme={theme} value={name} onChangeText={setName} autoFocus />
              </EditInputWrapper>
            ) : (
              <NameContainer theme={theme}>
                <NameText theme={theme}>{userData?.name || 'Użytkownik'}</NameText>
                <EditIconButton onPress={() => setIsEditing(true)} theme={theme}>
                  <Edit2 size={16} color={theme.colors.textSecondary} />
                </EditIconButton>
              </NameContainer>
            )}

            <EmailText theme={theme}>{user?.email}</EmailText>

            <RoleBadge isAdmin={role === 'DIRECTOR'} theme={theme}>
              <Shield
                size={14}
                color={role === 'DIRECTOR' ? theme.colors.warning : theme.colors.primary}
              />
              <RoleText isAdmin={role === 'DIRECTOR'} theme={theme}>
                {role}
              </RoleText>
            </RoleBadge>

            <View style={{ marginBottom: 20, alignItems: 'center' }}>
              <RNText style={{ fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4 }}>
                Status Powiadomień:
              </RNText>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: userData?.pushToken
                      ? theme.colors.primary
                      : theme.colors.error,
                    marginRight: 8,
                  }}
                />
                <RNText
                  style={{
                    fontSize: 14,
                    fontWeight: 'bold',
                    color: userData?.pushToken ? theme.colors.primary : theme.colors.error,
                  }}
                >
                  {userData?.pushToken ? 'Aktywne' : 'Błąd / Brak (Uruchom na telefonie)'}
                </RNText>
              </View>
            </View>

            <InfoSection theme={theme}>
              <SectionTitleText theme={theme}>Ustawienia powiadomień</SectionTitleText>

              <SectionLabel theme={theme}>Początek pracy (Pierwszy sygnał):</SectionLabel>
              <TimePicker
                hour={startH}
                minute={startM}
                onHourChange={setStartH}
                onMinuteChange={setStartM}
                theme={theme}
              />

              <SectionLabel theme={theme} style={{ marginTop: 20 }}>
                Koniec pracy (Tryb ciszy po):
              </SectionLabel>
              <TimePicker
                hour={endH}
                minute={endM}
                onHourChange={setEndH}
                onMinuteChange={setEndM}
                theme={theme}
              />

              <SaveSettingsButton onPress={saveSettings} theme={theme}>
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <RNText
                    style={{ color: 'white', fontWeight: 'bold', fontSize: theme.fontSize.f16 }}
                  >
                    Zapisz zmiany
                  </RNText>
                )}
              </SaveSettingsButton>
            </InfoSection>
          </ProfileCard>

          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginTop: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: theme.colors.accent,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <RNText style={{ fontSize: theme.fontSize.lg }}>{isDark ? '🌙' : '☀️'}</RNText>
              </View>
              <View>
                <RNText
                  style={{
                    fontWeight: '600',
                    color: theme.colors.text,
                    fontSize: theme.fontSize.md,
                  }}
                >
                  {isDark ? 'Tryb ciemny' : 'Tryb jasny'}
                </RNText>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={isDark ? theme.colors.surface : '#f4f3f4'}
            />
          </View>

          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginTop: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <RNText
              style={{
                fontWeight: '600',
                color: theme.colors.text,
                fontSize: theme.fontSize.md,
                marginBottom: 12,
              }}
            >
              Rozmiar czcionki
            </RNText>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {([1, 1.2, 1.4] as const).map((scale) => {
                const labels: Record<number, string> = { 1: 'A', 1.2: 'A+', 1.4: 'A++' };
                const selected = fontScale === scale;
                return (
                  <TouchableOpacity
                    key={scale}
                    onPress={() => setFontScale(scale)}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 2,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                      backgroundColor: selected
                        ? theme.colors.primary + '20'
                        : theme.colors.background,
                      alignItems: 'center',
                    }}
                  >
                    <RNText
                      style={{
                        fontSize:
                          scale === 1
                            ? theme.fontSize.md
                            : scale === 1.2
                              ? theme.fontSize.lg
                              : theme.fontSize.xl,
                        fontWeight: 'bold',
                        color: selected ? theme.colors.primary : theme.colors.text,
                      }}
                    >
                      {labels[scale]}
                    </RNText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <LogoutButton theme={theme} onPress={handleLogout}>
            <LogOut size={20} color={theme.colors.error} />
            <LogoutButtonText theme={theme}>Wyloguj się</LogoutButtonText>
          </LogoutButton>

          <View style={{ marginTop: 30, marginBottom: 20, alignItems: 'center', opacity: 0.5 }}>
            <RNText style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
              Wersja: {Constants.expoConfig?.version} | Build:{' '}
              {Platform.OS === 'android'
                ? Constants.expoConfig?.android?.versionCode
                : Constants.expoConfig?.ios?.buildNumber}
            </RNText>
            <RNText style={{ color: theme.colors.textSecondary, fontSize: 10, marginTop: 4 }}>
              Update ID: {Constants.updateId?.slice(0, 8) || 'Native Build'}
            </RNText>
          </View>
        </Content>
      </Container>
    </KeyboardAvoidingView>
  );
};

export default ProfileScreen;
