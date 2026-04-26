import React, { useState, useEffect } from 'react';
import {
  View,
  Platform,
  Dimensions,
  TouchableOpacity,
  Text as RNText,
  Image,
  ScrollView,
} from 'react-native';
import styled from 'styled-components/native';
import {
  LayoutGrid,
  Users,
  User,
  LogOut,
  Home,
  CheckSquare,
  Wrench,
  Palmtree,
  Bell,
  Megaphone,
  Menu,
  ChevronRight,
  X,
  AlertTriangle,
  Inbox,
  Info,
} from 'lucide-react-native';
import { useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

const { width } = Dimensions.get('window');
const getIsDesktop = () => Platform.OS === 'web' && width > 768;

const RootContainer = styled.View<{ isDesktop?: boolean }>`
  flex: 1;
  flex-direction: ${(props) => (props.isDesktop ? 'row' : 'column')};
  background-color: ${(props) => props.theme.colors.background};
`;

const Sidebar = styled.View`
  width: 280px;
  background-color: ${(props) => props.theme.colors.surface};
  border-right-width: 1px;
  border-right-color: ${(props) => props.theme.colors.border};
  padding: 20px 0;
`;

const SidebarLogoContainer = styled.View`
  padding: 0 20px;
  margin-bottom: 30px;
  align-items: center;
`;

const SidebarLogo = styled.Image`
  width: 180px;
  height: 50px;
  resize-mode: contain;
`;

const NavItem = styled.TouchableOpacity<{ active?: boolean }>`
  flex-direction: row;
  align-items: center;
  padding: 12px 20px;
  margin: 2px 10px;
  border-radius: 10px;
  background-color: ${(props) => (props.active ? props.theme.colors.accent : 'transparent')};
`;

const NavText = styled(RNText)<{ active?: boolean }>`
  margin-left: 12px;
  font-size: 15px;
  font-weight: ${(props) => (props.active ? 'bold' : '500')};
  color: ${(props) => (props.active ? props.theme.colors.primary : props.theme.colors.text)};
`;

const BottomTabs = styled.View`
  flex-direction: row;
  height: 65px;
  background-color: ${(props) => props.theme.colors.surface};
  border-top-width: 1px;
  border-top-color: ${(props) => props.theme.colors.border};
  elevation: 10;
`;

const TabItem = styled.TouchableOpacity`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const IconContainer = styled.View`
  position: relative;
`;

const BadgeDot = styled.View`
  position: absolute;
  top: -2px;
  right: -2px;
  background-color: ${(props) => props.theme.colors.error};
  width: 10px;
  height: 10px;
  border-radius: 5px;
  border-width: 1.5px;
  border-color: ${(props) => props.theme.colors.surface};
  z-index: 10;
`;

const TabLabel = styled(RNText)<{ active?: boolean }>`
  font-size: 11px;
  margin-top: 4px;
  font-weight: ${(props) => (props.active ? 'bold' : 'normal')};
  color: ${(props) =>
    props.active ? props.theme.colors.primary : props.theme.colors.textSecondary};
`;

const MoreMenuOverlay = styled.Modal``;

const MoreMenuBackdrop = styled.TouchableOpacity`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: flex-end;
`;

const MoreMenuContent = styled.View`
  background-color: ${(props) => props.theme.colors.surface};
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  padding: 20px;
  border-top-width: 1px;
  border-top-color: ${(props) => props.theme.colors.border};
`;

const MoreMenuTitle = styled(RNText)`
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 20px;
  color: ${(props) => props.theme.colors.text};
`;

const MoreMenuItem = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  padding: 15px 0;
  border-bottom-width: 1px;
  border-bottom-color: ${(props) => props.theme.colors.border};
`;

const MoreMenuText = styled(RNText)`
  flex: 1;
  font-size: 16px;
  margin-left: 15px;
  color: ${(props) => props.theme.colors.text};
`;

const ContentArea = styled.View`
  flex: 1;
`;

const LogoutNavText = styled(NavText)`
  color: ${(props) => props.theme.colors.error};
`;

const SectionHeader = styled(RNText)`
  font-size: 11px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.textSecondary};
  text-transform: uppercase;
  margin-top: 20px;
  margin-bottom: 10px;
  margin-left: 16px;
  letter-spacing: 1px;
`;

const SidebarScroll = styled.ScrollView`
  flex: 1;
`;

interface MainLayoutProps {
  children: React.ReactNode;
  navigation: NavigationProp<any>;
  currentRoute: string;
}

export const MainLayout = ({ children, navigation, currentRoute }: MainLayoutProps) => {
  const { user, role } = useAuth();
  const { theme } = useAppTheme();
  const [moreVisible, setMoreVisible] = useState(false);
  const [isDesktop, setIsDesktop] = useState(getIsDesktop);
  const insets = useSafeAreaInsets();

  // Стан для бейджів
  const [badges, setBadges] = useState({
    reports: 0,
    vacations: 0,
    announcements: 0,
    tasks: 0,
    service: 0,
    pendingUsers: 0,
  });

  useEffect(() => {
    if (!user) return;

    const unsubscribes: (() => void)[] = [];

    // 1. Для Директора: Звіти про проблеми
    if (role === 'DIRECTOR') {
      const q = query(collection(db, 'reports'));
      unsubscribes.push(
        onSnapshot(q, (snap) => {
          setBadges((prev) => ({ ...prev, reports: snap.size }));
        })
      );

      // 2. Для Директора: Заяви на відпустку (PENDING)
      const vQ = query(collection(db, 'vacations'), where('status', '==', 'PENDING'));
      unsubscribes.push(
        onSnapshot(vQ, (snap) => {
          setBadges((prev) => ({ ...prev, vacations: snap.size }));
        })
      );

      // 3. Для Директора: Користувачі, що чекають активації
      const uQ_pending = query(collection(db, 'users'), where('isActive', '==', false));
      unsubscribes.push(
        onSnapshot(uQ_pending, (snap) => {
          setBadges((prev) => ({ ...prev, pendingUsers: snap.size }));
        })
      );
    }

    // 4. Оголошення (якщо є сьогодні)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const aQ = query(collection(db, 'announcements'), where('createdAt', '>=', today));
    unsubscribes.push(
      onSnapshot(aQ, (snap) => {
        setBadges((prev) => ({ ...prev, announcements: snap.size }));
      })
    );

    // 5. Завдання (тільки персональні для працівника)
    if (role === 'EMPLOYEE') {
      const tQ = query(
        collection(db, 'tasks'),
        where('assignedTo', '==', user.uid),
        where('done', '==', false)
      );
      unsubscribes.push(
        onSnapshot(tQ, (snap) => {
          setBadges((prev) => ({ ...prev, tasks: snap.size }));
        })
      );
    }

    // 6. Сервіс (Загальний для всіх - тільки PENDING)
    const sQ = query(collection(db, 'services'), where('status', '==', 'PENDING'));
    unsubscribes.push(
      onSnapshot(sQ, (snap) => {
        setBadges((prev) => ({ ...prev, service: snap.size }));
      })
    );

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [user, role]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const subscription = Dimensions.addEventListener('change', () => {
      setIsDesktop(getIsDesktop());
    });
    return () => subscription.remove();
  }, []);

  const sections = [
    {
      title: 'Główne',
      items: [{ name: 'Home', label: 'Start', icon: Home }],
    },
    {
      title: 'Praca i Projekty',
      items: [
        { name: 'Tasks', label: 'Zadania', icon: CheckSquare, badge: badges.tasks },
        { name: 'Dashboard', label: 'Projekty', icon: LayoutGrid },
        { name: 'Service', label: 'Serwis', icon: Wrench, badge: badges.service },
        ...(role !== 'DIRECTOR'
          ? [{ name: 'ReportProblem', label: 'Zgłoś problem', icon: AlertTriangle }]
          : []),
      ],
    },
    {
      title: 'Moje',
      items: [
        { name: 'Reminders', label: 'Przypomnienia', icon: Bell },
        ...(role !== 'DIRECTOR' ? [{ name: 'Vacations', label: 'Urlop', icon: Palmtree }] : []),
        { name: 'Profile', label: 'Profil', icon: User },
        { name: 'About', label: 'O firmie', icon: Info },
      ],
    },
    ...(role === 'DIRECTOR'
      ? [
          {
            title: 'Zespół',
            items: [
              { name: 'Users', label: 'Pracownicy', icon: Users, badge: badges.pendingUsers },
              {
                name: 'Announcements',
                label: 'Ogłoszenia',
                icon: Megaphone,
                badge: badges.announcements,
              },
              { name: 'DirectorReports', label: 'Zgłoszenia', icon: Inbox, badge: badges.reports },
              {
                name: 'Vacations',
                label: 'Wnioski Urlopowe',
                icon: Palmtree,
                params: { isAdminView: true },
                badge: badges.vacations,
              },
            ],
          },
        ]
      : []),
  ];

  if (isDesktop) {
    return (
      <RootContainer theme={theme} isDesktop={true}>
        <Sidebar theme={theme}>
          <SidebarLogoContainer>
            <SidebarLogo source={require('../../assets/velder.png')} />
          </SidebarLogoContainer>

          <SidebarScroll showsVerticalScrollIndicator={false}>
            {sections.map((section) => (
              <View key={section.title} style={{ marginBottom: 10 }}>
                <SectionHeader theme={theme}>{section.title}</SectionHeader>
                {section.items.map((item) => (
                  <NavItem
                    key={item.name + (item.params ? '_admin' : '')}
                    theme={theme}
                    active={currentRoute === item.name}
                    onPress={() => navigation.navigate(item.name, item.params as any)}
                  >
                    <IconContainer>
                      <item.icon
                        size={18}
                        color={
                          currentRoute === item.name ? theme.colors.primary : theme.colors.text
                        }
                      />
                      {(item as any).badge > 0 && <BadgeDot theme={theme} />}
                    </IconContainer>
                    <NavText
                      theme={theme}
                      active={currentRoute === item.name}
                      style={{ fontSize: 14 }}
                    >
                      {item.label}
                    </NavText>
                  </NavItem>
                ))}
              </View>
            ))}
          </SidebarScroll>

          <NavItem
            theme={theme}
            onPress={() => signOut(auth)}
            style={{
              marginTop: 'auto',
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              paddingTop: 15,
            }}
          >
            <LogOut size={18} color={theme.colors.error} />
            <LogoutNavText theme={theme} style={{ fontSize: 14 }}>
              Wyloguj się
            </LogoutNavText>
          </NavItem>
        </Sidebar>

        <ContentArea>{children}</ContentArea>
      </RootContainer>
    );
  }

  const allMobileItems = sections.flatMap((s) => s.items);
  const visibleItems = allMobileItems.slice(0, 4);
  const hiddenItems = allMobileItems.slice(4);

  return (
    <RootContainer theme={theme} isDesktop={false}>
      <ContentArea>{children}</ContentArea>

      <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.colors.surface }}>
        <BottomTabs theme={theme}>
          {visibleItems.map((item) => (
            <TabItem
              key={item.name + (item.params ? '_admin' : '')}
              onPress={() => navigation.navigate(item.name, item.params as any)}
            >
              <IconContainer>
                <item.icon
                  size={22}
                  color={
                    currentRoute === item.name ? theme.colors.primary : theme.colors.textSecondary
                  }
                />
                {(item as any).badge > 0 && <BadgeDot theme={theme} />}
              </IconContainer>
              <TabLabel theme={theme} active={currentRoute === item.name}>
                {item.label}
              </TabLabel>
            </TabItem>
          ))}
          <TabItem onPress={() => setMoreVisible(true)}>
            <IconContainer>
              <Menu size={22} color={theme.colors.textSecondary} />
              {hiddenItems.some((item: any) => item.badge > 0) && <BadgeDot theme={theme} />}
            </IconContainer>
            <TabLabel theme={theme}>Menu</TabLabel>
          </TabItem>
        </BottomTabs>
      </SafeAreaView>

      <MoreMenuOverlay
        visible={moreVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMoreVisible(false)}
      >
        <MoreMenuBackdrop activeOpacity={1} onPress={() => setMoreVisible(false)}>
          <SafeAreaView
            edges={['bottom']}
            style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
          >
            <MoreMenuContent theme={theme}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 20,
                }}
              >
                <MoreMenuTitle theme={theme}>Więcej opcji</MoreMenuTitle>
                <TouchableOpacity onPress={() => setMoreVisible(false)}>
                  <X size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              {hiddenItems.map((item) => (
                <MoreMenuItem
                  key={item.name + (item.params ? '_admin' : '')}
                  onPress={() => {
                    setMoreVisible(false);
                    navigation.navigate(item.name, item.params as any);
                  }}
                >
                  <IconContainer>
                    <item.icon size={22} color={theme.colors.primary} />
                    {(item as any).badge > 0 && <BadgeDot theme={theme} />}
                  </IconContainer>
                  <MoreMenuText theme={theme}>{item.label}</MoreMenuText>
                  <ChevronRight size={18} color="#ccc" />
                </MoreMenuItem>
              ))}

              <MoreMenuItem
                onPress={() => {
                  setMoreVisible(false);
                  signOut(auth);
                }}
                style={{ borderBottomWidth: 0, marginTop: 10 }}
              >
                <LogOut size={22} color={theme.colors.error} />
                <MoreMenuText theme={theme} style={{ color: theme.colors.error }}>
                  Wyloguj się
                </MoreMenuText>
              </MoreMenuItem>
            </MoreMenuContent>
          </SafeAreaView>
        </MoreMenuBackdrop>
      </MoreMenuOverlay>
    </RootContainer>
  );
};
