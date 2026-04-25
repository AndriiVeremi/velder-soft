import React, { useState, useEffect } from 'react';
import { View, Platform, Dimensions, TouchableOpacity, Text as RNText, Image } from 'react-native';
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
} from 'lucide-react-native';
import { theme } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

type NavigationProp = {
  navigate: (screen: string, params?: object) => void;
  goBack: () => void;
};

const getIsDesktop = () => Platform.OS === 'web' && Dimensions.get('window').width > 768;

const RootContainer = styled.View<{ isDesktop: boolean }>`
  flex: 1;
  flex-direction: ${(props) => (props.isDesktop ? 'row' : 'column')};
  background-color: ${(props) => props.theme.colors.background};
`;

const Sidebar = styled.View`
  width: 260px;
  background-color: ${(props) => props.theme.colors.surface};
  border-right-width: 1px;
  border-right-color: ${(props) => props.theme.colors.border};
  padding: ${(props) => props.theme.spacing.lg}px;
`;

const SidebarLogoContainer = styled.View`
  align-items: center;
  margin-bottom: 40px;
  padding: 10px 0;
`;

const SidebarLogo = styled.Image`
  width: 180px;
  height: 50px;
  resize-mode: contain;
`;

const NavItem = styled.TouchableOpacity<{ active?: boolean }>`
  flex-direction: row;
  align-items: center;
  padding: 14px 16px;
  border-radius: ${(props) => props.theme.borderRadius.md}px;
  background-color: ${(props) => (props.active ? theme.colors.accent : 'transparent')};
  margin-bottom: 8px;
`;

const NavText = styled(RNText)<{ active?: boolean }>`
  margin-left: 12px;
  font-size: 16px;
  font-weight: ${(props) => (props.active ? 'bold' : '500')};
  color: ${(props) => (props.active ? props.theme.colors.primary : props.theme.colors.text)};
`;

const BottomTabs = styled.View`
  flex-direction: row;
  height: 70px;
  background-color: ${(props) => props.theme.colors.surface};
  border-top-width: 1px;
  border-top-color: ${(props) => props.theme.colors.border};
  justify-content: space-around;
  align-items: center;
  padding-bottom: ${Platform.OS === 'ios' ? 20 : 0}px;
`;

const TabItem = styled.TouchableOpacity`
  align-items: center;
  justify-content: center;
  flex: 1;
`;

const TabLabel = styled(RNText)<{ active?: boolean }>`
  font-size: 11px;
  margin-top: 4px;
  font-weight: ${(props) => (props.active ? 'bold' : 'normal')};
  color: ${(props) =>
    props.active ? props.theme.colors.primary : props.theme.colors.textSecondary};
`;

const ContentArea = styled.View`
  flex: 1;
`;

const Spacer = styled.View`
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
  navigation: NavigationProp;
  currentRoute: string;
}

export const MainLayout = ({ children, navigation, currentRoute }: MainLayoutProps) => {
  const { role } = useAuth();
  const [isDesktop, setIsDesktop] = useState(getIsDesktop);

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
        { name: 'Tasks', label: 'Zadania', icon: CheckSquare },
        { name: 'Dashboard', label: 'Projekty', icon: LayoutGrid },
        { name: 'Service', label: 'Serwis', icon: Wrench },
      ],
    },
    {
      title: 'Moje',
      items: [
        { name: 'Reminders', label: 'Przypomnienia', icon: Bell },
        ...(role !== 'DIRECTOR' ? [{ name: 'Vacations', label: 'Urlop', icon: Palmtree }] : []),
        { name: 'Profile', label: 'Profil', icon: User },
      ],
    },
    ...(role === 'DIRECTOR'
      ? [
          {
            title: 'Zespół',
            items: [
              { name: 'Users', label: 'Pracownicy', icon: Users },
              { name: 'Announcements', label: 'Ogłoszenia', icon: Megaphone },
              {
                name: 'Vacations',
                label: 'Wnioski Urlopowe',
                icon: Palmtree,
                params: { isAdminView: true },
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
                    <item.icon
                      size={18}
                      color={currentRoute === item.name ? theme.colors.primary : theme.colors.text}
                    />
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

  const mobileItems = [
    { name: 'Home', label: 'Start', icon: Home },
    { name: 'Tasks', label: 'Zadania', icon: CheckSquare },
    { name: 'Dashboard', label: 'Projekty', icon: LayoutGrid },
    { name: 'Reminders', label: 'Przypomnień', icon: Bell },
    { name: 'Profile', label: 'Profil', icon: User },
  ];

  return (
    <RootContainer theme={theme} isDesktop={false}>
      <ContentArea>{children}</ContentArea>

      <BottomTabs theme={theme}>
        {mobileItems.map((item) => (
          <TabItem
            key={item.name + (item.params ? '_admin' : '')}
            onPress={() => navigation.navigate(item.name, item.params as any)}
          >
            <item.icon
              size={20}
              color={currentRoute === item.name ? theme.colors.primary : theme.colors.textSecondary}
            />
            <TabLabel theme={theme} active={currentRoute === item.name} style={{ fontSize: 9 }}>
              {item.label}
            </TabLabel>
          </TabItem>
        ))}
      </BottomTabs>
    </RootContainer>
  );
};
