import React, { useEffect, useState } from 'react';
import {
  View,
  Text as RNText,
  FlatList,
  ActivityIndicator,
  Switch,
  TouchableOpacity,
} from 'react-native';
import styled from 'styled-components/native';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAppTheme } from '../context/ThemeContext';
import { User, Shield, Trash2, Mail, CheckCircle, XCircle } from 'lucide-react-native';
import { notify } from '../utils/notify';
import { confirmDelete } from '../utils/confirm';
import { ScreenHeader, ScreenTitle } from '../components/CommonUI';
import { sendPushNotification } from '../utils/notifications';
import { StackScreenProps } from '@react-navigation/stack';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'DIRECTOR' | 'EMPLOYEE';
  isActive: boolean;
  pushToken?: string;
  createdAt?: any;
}

const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

const UserCard = styled.View`
  background-color: ${(props) => props.theme.colors.surface};
  padding: ${(props) => props.theme.spacing.md}px;
  margin: ${(props) => props.theme.spacing.sm}px ${(props) => props.theme.spacing.md}px;
  border-radius: ${(props) => props.theme.borderRadius.md}px;
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const UserMainInfo = styled.View`
  flex-direction: row;
  align-items: center;
`;

const Avatar = styled.View<{ active: boolean }>`
  width: 50px;
  height: 50px;
  border-radius: 25px;
  background-color: ${(props) =>
    props.active ? props.theme.colors.accent : props.theme.colors.border};
  justify-content: center;
  align-items: center;
  border: 2px solid
    ${(props) => (props.active ? props.theme.colors.primary : props.theme.colors.border)};
`;

const Info = styled.View`
  flex: 1;
  margin-left: 15px;
`;

const UserName = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f16}px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
`;

const UserEmail = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.sm}px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 2px;
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
  padding: 2px 8px;
  border-radius: 4px;
  align-self: flex-start;
  margin-top: 5px;
  flex-direction: row;
  align-items: center;
`;

const RoleText = styled(RNText)<{ isAdmin: boolean }>`
  font-size: ${(props) => props.theme.fontSize.f10}px;
  font-weight: bold;
  color: ${(props) =>
    props.isAdmin
      ? props.theme.isDark
        ? '#ffa726'
        : '#E65100'
      : props.theme.isDark
        ? '#90caf9'
        : '#1A237E'};
  margin-left: 4px;
`;

const Controls = styled.View`
  flex-direction: row;
  align-items: center;
  border-top-width: 1px;
  border-top-color: ${(props) => props.theme.colors.border};
  margin-top: 15px;
  padding-top: 10px;
  justify-content: space-around;
`;

const StatusLabel = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f14}px;
  font-weight: 500;
  color: ${(props) => props.theme.colors.text};
`;

type Props = StackScreenProps<any, 'Users'>;

const UsersScreen = ({ navigation, route }: Props) => {
  const { theme } = useAppTheme();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as UserData);
        setUsers(data);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const toggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isActive: !currentStatus });

      if (!currentStatus) {
        try {
          const activatedUser = users.find((u) => u.id === userId);
          if (activatedUser?.pushToken) {
            await sendPushNotification(
              [
                {
                  token: activatedUser.pushToken,
                  notificationStart: (activatedUser as any).notificationStart,
                  notificationEnd: (activatedUser as any).notificationEnd,
                },
              ],
              'Konto aktywowane! 🎉',
              'Twoje konto zostało aktywowane. Możesz teraz korzystać z aplikacji.'
            );
          }
        } catch (pushErr) {
          console.warn('Failed to notify user:', pushErr);
        }
      }

      notify.success(!currentStatus ? 'Konto aktywowane' : 'Konto deaktywowane');
    } catch (e) {
      notify.error('Błąd aktualizacji');
    }
  };

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'DIRECTOR' ? 'EMPLOYEE' : 'DIRECTOR';
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      notify.success(`Zmieniono rolę na ${newRole}`);
    } catch (e) {
      notify.error('Błąd zmiany roli');
    }
  };

  const deleteUser = (userId: string) => {
    confirmDelete(
      'Czy na pewno chcesz usunąć tego użytkownika?',
      async () => {
        await deleteDoc(doc(db, 'users', userId));
        notify.success('Użytkownik usunięty');
      },
      'Usuń użytkownika',
      'Usuń'
    );
  };

  if (loading) {
    return (
      <Container theme={theme} style={{ justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </Container>
    );
  }

  return (
    <Container theme={theme}>
      <ScreenHeader theme={theme}>
        <ScreenTitle theme={theme}>Pracownicy i Uprawnienia</ScreenTitle>
      </ScreenHeader>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <UserCard theme={theme}>
            <UserMainInfo>
              <Avatar theme={theme} active={item.isActive}>
                <User
                  size={24}
                  color={item.isActive ? theme.colors.primary : theme.colors.textSecondary}
                />
              </Avatar>
              <Info>
                <UserName theme={theme}>{item.name}</UserName>
                <UserEmail theme={theme}>{item.email}</UserEmail>
                <TouchableOpacity onPress={() => toggleRole(item.id, item.role)}>
                  <RoleBadge theme={theme} isAdmin={item.role === 'DIRECTOR'}>
                    <Shield
                      size={12}
                      color={
                        item.role === 'DIRECTOR'
                          ? theme.isDark
                            ? '#ffa726'
                            : '#E65100'
                          : theme.isDark
                            ? '#90caf9'
                            : '#1A237E'
                      }
                    />
                    <RoleText theme={theme} isAdmin={item.role === 'DIRECTOR'}>
                      {item.role}
                    </RoleText>
                  </RoleBadge>
                </TouchableOpacity>
              </Info>
              <TouchableOpacity onPress={() => deleteUser(item.id)} style={{ padding: 10 }}>
                <Trash2 size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </UserMainInfo>

            <Controls theme={theme}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {item.isActive ? (
                  <CheckCircle size={16} color={theme.colors.success} />
                ) : (
                  <XCircle size={16} color={theme.colors.error} />
                )}
                <StatusLabel theme={theme} style={{ marginLeft: 8 }}>
                  {item.isActive ? 'Aktywny dostęp' : 'Brak dostępu'}
                </StatusLabel>
              </View>
              <Switch
                value={item.isActive}
                onValueChange={() => toggleStatus(item.id, item.isActive)}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              />
            </Controls>
          </UserCard>
        )}
        ListEmptyComponent={
          <RNText style={{ textAlign: 'center', marginTop: 50, color: theme.colors.textSecondary }}>
            Brak zarejestrowanych użytkowników
          </RNText>
        }
      />
    </Container>
  );
};

export default UsersScreen;
