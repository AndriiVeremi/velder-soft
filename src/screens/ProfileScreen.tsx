import React, { useState, useEffect } from 'react';
import {
  View,
  Text as RNText,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import styled from 'styled-components/native';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { theme } from '../config/theme';
import { notify } from '../utils/notify';
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
`;

const EmailText = styled(RNText)`
  font-size: 16px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-bottom: 20px;
`;

const RoleBadge = styled.View<{ isAdmin: boolean }>`
  background-color: ${(props) => (props.isAdmin ? '#FFF3E0' : '#E8EAF6')};
  padding: 6px 16px;
  border-radius: 20px;
  flex-direction: row;
  align-items: center;
  margin-bottom: 30px;
`;

const RoleText = styled(RNText)<{ isAdmin: boolean }>`
  font-size: 12px;
  font-weight: bold;
  color: ${(props) => (props.isAdmin ? '#E65100' : '#1A237E')};
  margin-left: 8px;
`;

const InfoSection = styled.View`
  width: 100%;
  border-top-width: 1px;
  border-top-color: #f0f0f0;
  padding-top: 20px;
`;

const EditInput = styled.TextInput`
  font-size: 18px;
  font-weight: bold;
  border-bottom-width: 2px;
  border-bottom-color: ${(props) => props.theme.colors.primary};
  text-align: center;
  min-width: 200px;
`;

const TimePickerContainer = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 12px;
  margin-top: 10px;
  justify-content: center;
  border: 1px solid #eee;
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
  background-color: #fff;
  border: 1px solid ${(props) => props.theme.colors.error};
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
`;

const ProfileScreen = () => {
  const { user, userData, role } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [startH, setStartH] = useState(8);
  const [startM, setStartM] = useState(0);
  const [endH, setEndH] = useState(17);
  const [endM, setEndM] = useState(0);

  useEffect(() => {
    if (userData?.name) setName(userData.name);
    if (userData?.notificationStart) {
      const [h, m] = userData.notificationStart.split(':');
      setStartH(parseInt(h));
      setStartM(parseInt(m));
    }
    if (userData?.notificationEnd) {
      const [h, m] = userData.notificationEnd.split(':');
      setEndH(parseInt(h));
      setEndM(parseInt(m));
    }
  }, [userData]);

  const saveSettings = async () => {
    setLoading(true);
    const start = `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;
    const end = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notificationStart: start,
        notificationEnd: end,
        name: name,
      });
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
    <Container theme={theme}>
      <Content theme={theme}>
        <ProfileCard theme={theme}>
          <AvatarCircle theme={theme}>
            <User size={40} color={theme.colors.primary} />
          </AvatarCircle>

          {isEditing ? (
            <View style={{ alignItems: 'center', marginBottom: 15 }}>
              <EditInput theme={theme} value={name} onChangeText={setName} autoFocus />
            </View>
          ) : (
            <NameContainer>
              <NameText>{userData?.name || 'Użytkownik'}</NameText>
              <TouchableOpacity onPress={() => setIsEditing(true)} style={{ marginLeft: 10 }}>
                <Edit2 size={16} color="#999" />
              </TouchableOpacity>
            </NameContainer>
          )}

          <EmailText theme={theme}>{user?.email}</EmailText>

          <RoleBadge isAdmin={role === 'DIRECTOR'} theme={theme}>
            <Shield size={14} color={role === 'DIRECTOR' ? '#E65100' : '#1A237E'} />
            <RoleText isAdmin={role === 'DIRECTOR'}>{role}</RoleText>
          </RoleBadge>

          <InfoSection theme={theme}>
            <RNText style={{ fontWeight: 'bold', marginBottom: 15, fontSize: 16 }}>
              Ustawienia powiadomień
            </RNText>

            <RNText style={{ fontSize: 12, color: '#666' }}>
              Początek pracy (Pierwszy sygnał):
            </RNText>
            <TimePickerContainer>
              <TimeBlock>
                <TouchableOpacity onPress={() => adjustTime('sh', 1)}>
                  <ChevronUp size={24} color={theme.colors.primary} />
                </TouchableOpacity>
                <TimeValue theme={theme}>{startH.toString().padStart(2, '0')}</TimeValue>
                <TouchableOpacity onPress={() => adjustTime('sh', -1)}>
                  <ChevronDown size={24} color={theme.colors.primary} />
                </TouchableOpacity>
              </TimeBlock>
              <RNText style={{ fontSize: 24, fontWeight: 'bold', marginHorizontal: 10 }}>:</RNText>
              <TimeBlock>
                <TouchableOpacity onPress={() => adjustTime('sm', 5)}>
                  <ChevronUp size={24} color={theme.colors.primary} />
                </TouchableOpacity>
                <TimeValue theme={theme}>{startM.toString().padStart(2, '0')}</TimeValue>
                <TouchableOpacity onPress={() => adjustTime('sm', -5)}>
                  <ChevronDown size={24} color={theme.colors.primary} />
                </TouchableOpacity>
              </TimeBlock>
            </TimePickerContainer>

            <RNText style={{ fontSize: 12, color: '#666', marginTop: 20 }}>
              Koniec pracy (Tryb ciszy po):
            </RNText>
            <TimePickerContainer>
              <TimeBlock>
                <TouchableOpacity onPress={() => adjustTime('eh', 1)}>
                  <ChevronUp size={24} color={theme.colors.primary} />
                </TouchableOpacity>
                <TimeValue theme={theme}>{endH.toString().padStart(2, '0')}</TimeValue>
                <TouchableOpacity onPress={() => adjustTime('eh', -1)}>
                  <ChevronDown size={24} color={theme.colors.primary} />
                </TouchableOpacity>
              </TimeBlock>
              <RNText style={{ fontSize: 24, fontWeight: 'bold', marginHorizontal: 10 }}>:</RNText>
              <TimeBlock>
                <TouchableOpacity onPress={() => adjustTime('em', 5)}>
                  <ChevronUp size={24} color={theme.colors.primary} />
                </TouchableOpacity>
                <TimeValue theme={theme}>{endM.toString().padStart(2, '0')}</TimeValue>
                <TouchableOpacity onPress={() => adjustTime('em', -5)}>
                  <ChevronDown size={24} color={theme.colors.primary} />
                </TouchableOpacity>
              </TimeBlock>
            </TimePickerContainer>

            <TouchableOpacity
              onPress={saveSettings}
              style={{
                backgroundColor: theme.colors.primary,
                padding: 15,
                borderRadius: 10,
                marginTop: 25,
                alignItems: 'center',
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <RNText style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                  Zapisz zmiany
                </RNText>
              )}
            </TouchableOpacity>
          </InfoSection>
        </ProfileCard>

        <LogoutButton theme={theme} onPress={handleLogout}>
          <LogOut size={20} color={theme.colors.error} />
          <RNText
            style={{ color: theme.colors.error, fontWeight: 'bold', marginLeft: 10, fontSize: 16 }}
          >
            Wyloguj się
          </RNText>
        </LogoutButton>
      </Content>
    </Container>
  );
};

export default ProfileScreen;
