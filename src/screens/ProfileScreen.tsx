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
import styled from 'styled-components/native';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../config/firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAppTheme } from '../context/ThemeContext';
import { notify } from '../utils/notify';
import { scheduleDailyReminder } from '../utils/notifications';
import { format } from 'date-fns';
import { StackScreenProps } from '@react-navigation/stack';
import {
  User,
  Mail,
  Shield,
  LogOut,
  Edit2,
  Check,
  X,
  Bell,
  ChevronUp,
  ChevronDown,
} from 'lucide-react-native';

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
  font-size: 22px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
`;

const EmailText = styled(RNText)`
  font-size: 16px;
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
  font-size: 12px;
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
  font-size: 18px;
  font-weight: bold;
  border-bottom-width: 2px;
  border-bottom-color: ${(props) => props.theme.colors.primary};
  text-align: center;
  min-width: 200px;
  color: ${(props) => props.theme.colors.text};
`;

const TimePickerContainer = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: ${(props) => props.theme.colors.background};
  padding: 15px;
  border-radius: 12px;
  margin-top: 10px;
  justify-content: center;
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const TimeBlock = styled.View`
  align-items: center;
  width: 50px;
`;

const TimeValue = styled(RNText)`
  font-size: 24px;
  font-weight: bold;
  margin: 5px 0;
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
  font-size: 16px;
  color: ${(props) => props.theme.colors.text};
`;

const SectionLabel = styled(RNText)`
  font-size: 12px;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const TimeSeparator = styled(RNText)`
  font-size: 24px;
  font-weight: bold;
  margin-horizontal: 10px;
  color: ${(props) => props.theme.colors.text};
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
  font-size: 16px;
`;

type Props = StackScreenProps<any, 'Profile'>;

const ProfileScreen = ({ navigation, route }: Props) => {
  const { user, userData, role } = useAuth();
  const { theme, isDark, toggleTheme } = useAppTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [startH, setStartH] = useState(8);
  const [startM, setStartM] = useState(0);
  const [endH, setEndH] = useState(17);
  const [endM, setEndM] = useState(0);

  useEffect(() => {
    if (!userData) return;
    Promise.resolve().then(() => {
      if (userData.name) setName(userData.name);
      if (userData.notificationStart) {
        const [h, m] = userData.notificationStart.split(':');
        setStartH(parseInt(h));
        setStartM(parseInt(m));
      }
      if (userData.notificationEnd) {
        const [h, m] = userData.notificationEnd.split(':');
        setEndH(parseInt(h));
        setEndM(parseInt(m));
      }
    });
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

      notify.success('Ustawienia zapisane');
      setIsEditing(false);
    } catch (e) {
      notify.error('Błąd zapisu');
    } finally {
      setLoading(false);
    }
  };

  const adjustTime = (type: 'sh' | 'sm' | 'eh' | 'em', val: number) => {
    if (type === 'sh')
      setStartH((p) => {
        let n = p + val;
        if (n > 23) return 0;
        if (n < 0) return 23;
        return n;
      });
    if (type === 'sm')
      setStartM((p) => {
        let n = p + val;
        if (n > 55) return 0;
        if (n < 0) return 55;
        return n;
      });
    if (type === 'eh')
      setEndH((p) => {
        let n = p + val;
        if (n > 23) return 0;
        if (n < 0) return 23;
        return n;
      });
    if (type === 'em')
      setEndM((p) => {
        let n = p + val;
        if (n > 55) return 0;
        if (n < 0) return 55;
        return n;
      });
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

            <InfoSection theme={theme}>
              <SectionTitleText theme={theme}>Ustawienia powiadomień</SectionTitleText>

              <SectionLabel theme={theme}>Początek pracy (Pierwszy sygnał):</SectionLabel>
              <TimePickerContainer theme={theme}>
                <TimeBlock theme={theme}>
                  <TouchableOpacity onPress={() => adjustTime('sh', 1)}>
                    <ChevronUp size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TimeValue theme={theme}>{startH.toString().padStart(2, '0')}</TimeValue>
                  <TouchableOpacity onPress={() => adjustTime('sh', -1)}>
                    <ChevronDown size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                </TimeBlock>
                <TimeSeparator theme={theme}>:</TimeSeparator>
                <TimeBlock theme={theme}>
                  <TouchableOpacity onPress={() => adjustTime('sm', 5)}>
                    <ChevronUp size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TimeValue theme={theme}>{startM.toString().padStart(2, '0')}</TimeValue>
                  <TouchableOpacity onPress={() => adjustTime('sm', -5)}>
                    <ChevronDown size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                </TimeBlock>
              </TimePickerContainer>

              <SectionLabel theme={theme} style={{ marginTop: 20 }}>
                Koniec pracy (Tryb ciszy po):
              </SectionLabel>
              <TimePickerContainer theme={theme}>
                <TimeBlock theme={theme}>
                  <TouchableOpacity onPress={() => adjustTime('eh', 1)}>
                    <ChevronUp size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TimeValue theme={theme}>{endH.toString().padStart(2, '0')}</TimeValue>
                  <TouchableOpacity onPress={() => adjustTime('eh', -1)}>
                    <ChevronDown size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                </TimeBlock>
                <TimeSeparator theme={theme}>:</TimeSeparator>
                <TimeBlock theme={theme}>
                  <TouchableOpacity onPress={() => adjustTime('sm', 5)}>
                    <ChevronUp size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TimeValue theme={theme}>{endM.toString().padStart(2, '0')}</TimeValue>
                  <TouchableOpacity onPress={() => adjustTime('sm', -5)}>
                    <ChevronDown size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                </TimeBlock>
              </TimePickerContainer>

              <SaveSettingsButton onPress={saveSettings} theme={theme}>
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <RNText style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
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
                <RNText style={{ fontSize: 18 }}>{isDark ? '🌙' : '☀️'}</RNText>
              </View>
              <View>
                <RNText style={{ fontWeight: '600', color: theme.colors.text, fontSize: 15 }}>
                  {isDark ? 'Tryb ciemny' : 'Tryb jasny'}
                </RNText>
                <RNText style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                  {isDark ? 'Przełącz na jasny' : 'Przełącz na ciemny'}
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

          <LogoutButton theme={theme} onPress={handleLogout}>
            <LogOut size={20} color={theme.colors.error} />
            <LogoutButtonText theme={theme}>Wyloguj się</LogoutButtonText>
          </LogoutButton>
        </Content>
      </Container>
    </KeyboardAvoidingView>
  );
};

export default ProfileScreen;
