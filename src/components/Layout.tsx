import React from 'react';
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
} from 'lucide-react-native';
import { theme } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

type NavigationProp = {
  navigate: (screen: string, params?: object) => void;
  goBack: () => void;
};

const { width } = Dimensions.get('window');
const isDesktop = Platform.OS === 'web' && width > 768;

const RootContainer = styled.View`
  flex: 1;
  flex-direction: ${isDesktop ? 'row' : 'column'};
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

interface MainLayoutProps {
  children: React.ReactNode;
  navigation: NavigationProp;
  currentRoute: string;
}

export const MainLayout = ({ children, navigation, currentRoute }: MainLayoutProps) => {
  const { role } = useAuth();

  const menuItems = [
    { name: 'Home', label: 'Start', icon: Home },
    { name: 'Tasks', label: 'Zadania', icon: CheckSquare },
    { name: 'Reminders', label: 'Przypomnienia', icon: Bell },
    { name: 'Dashboard', label: 'Projekty', icon: LayoutGrid },
    { name: 'Service', label: 'Serwis', icon: Wrench },
    { name: 'Vacations', label: 'Urlopy', icon: Palmtree },
    ...(role === 'DIRECTOR' ? [{ name: 'Users', label: 'Pracownicy', icon: Users }] : []),
    { name: 'Profile', label: 'Profil', icon: User },
  ];

  if (isDesktop) {
    return (
      <RootContainer theme={theme}>
        <Sidebar theme={theme}>
          <SidebarLogoContainer>
            <SidebarLogo source={require('../../assets/velder.png')} />
          </SidebarLogoContainer>

          {menuItems.map((item) => (
            <NavItem
              key={item.name}
              theme={theme}
              active={currentRoute === item.name}
              onPress={() => navigation.navigate(item.name)}
            >
              <item.icon
                size={22}
                color={currentRoute === item.name ? theme.colors.primary : theme.colors.text}
              />
              <NavText theme={theme} active={currentRoute === item.name}>
                {item.label}
              </NavText>
            </NavItem>
          ))}

          <Spacer />

          <NavItem theme={theme} onPress={() => signOut(auth)}>
            <LogOut size={22} color={theme.colors.error} />
            <LogoutNavText theme={theme}>Wyloguj się</LogoutNavText>
          </NavItem>
        </Sidebar>

        <ContentArea>{children}</ContentArea>
      </RootContainer>
    );
  }

  return (
    <RootContainer theme={theme}>
      <ContentArea>{children}</ContentArea>

      <BottomTabs theme={theme}>
        {menuItems.map((item) => (
          <TabItem key={item.name} onPress={() => navigation.navigate(item.name)}>
            <item.icon
              size={24}
              color={currentRoute === item.name ? theme.colors.primary : theme.colors.textSecondary}
            />
            <TabLabel theme={theme} active={currentRoute === item.name}>
              {item.label}
            </TabLabel>
          </TabItem>
        ))}
      </BottomTabs>
    </RootContainer>
  );
};
