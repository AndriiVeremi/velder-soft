import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { NavigationContainer, RouteProp } from '@react-navigation/native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { MainLayout } from './src/components/Layout';
import { View, ActivityIndicator, LogBox } from 'react-native';
import styled from 'styled-components/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  registerForPushNotificationsAsync,
  setBadgeCount,
  setupNotificationListeners,
} from './src/utils/notifications';
import { WebToaster } from './src/components/WebToaster';
import HomeScreen from './src/screens/HomeScreen';
import TasksScreen from './src/screens/TasksScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ServiceScreen from './src/screens/ServiceScreen';
import UsersScreen from './src/screens/UsersScreen';
import VacationsScreen from './src/screens/VacationsScreen';
import RemindersScreen from './src/screens/RemindersScreen';
import AnnouncementsScreen from './src/screens/AnnouncementsScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import AddProjectScreen from './src/screens/AddProjectScreen';
import ProjectDetailsScreen from './src/screens/ProjectDetailsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PendingApprovalScreen from './src/screens/PendingApprovalScreen';
import ReportProblemScreen from './src/screens/ReportProblemScreen';
import DirectorReportsScreen from './src/screens/DirectorReportsScreen';
import AboutCompanyScreen from './src/screens/AboutCompanyScreen';
import DocsScreen from './src/screens/DocsScreen';
import SendRequestScreen from './src/screens/SendRequestScreen';
import { RootStackParamList } from './src/config/navigationTypes';

LogBox.ignoreLogs([
  'Image: style.tintColor is deprecated',
  'Blocked aria-hidden on an element',
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

const Stack = createStackNavigator<RootStackParamList>();

const CenteredContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  background-color: ${(props) => props.theme.colors.background};
`;

const SplashLogo = styled.Image`
  width: 220px;
  height: 60px;
  resize-mode: contain;
  margin-bottom: 20px;
`;

const LoadingText = styled.Text`
  font-size: 14px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 10px;
  font-weight: 500;
`;

type RouteKey = keyof RootStackParamList;

interface LayoutWrapperProps<K extends RouteKey> {
  navigation: StackNavigationProp<RootStackParamList, K>;
  route: RouteProp<RootStackParamList, K>;
}

const withLayout = <K extends RouteKey>(
  Screen: React.ComponentType<{
    navigation: StackNavigationProp<RootStackParamList, K>;
    route: RouteProp<RootStackParamList, K>;
  }>,
  routeName: K
) => {
  return (props: LayoutWrapperProps<K>) => (
    <MainLayout navigation={props.navigation} currentRoute={routeName}>
      <Screen {...props} />
    </MainLayout>
  );
};

const AuthenticatedStack = () => {
  const { theme } = useAppTheme();
  return (
    <>
      <StatusBar style="light" backgroundColor={theme.colors.primary} />
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.colors.primary,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTitleStyle: { fontWeight: 'bold', color: '#FFFFFF' },
          headerTintColor: '#FFFFFF',
        }}
      >
        <Stack.Screen
          name="Home"
          component={withLayout(HomeScreen, 'Home')}
          options={{ title: 'Start' }}
        />
        <Stack.Screen
          name="Tasks"
          component={withLayout(TasksScreen, 'Tasks')}
          options={{ title: 'Zadania' }}
        />
        <Stack.Screen
          name="Dashboard"
          component={withLayout(DashboardScreen, 'Dashboard')}
          options={{ title: 'Projekty' }}
        />
        <Stack.Screen
          name="Service"
          component={withLayout(ServiceScreen, 'Service')}
          options={{ title: 'Serwis' }}
        />
        <Stack.Screen
          name="Users"
          component={withLayout(UsersScreen, 'Users')}
          options={{ title: 'Pracownicy' }}
        />
        <Stack.Screen
          name="Vacations"
          component={withLayout(VacationsScreen, 'Vacations')}
          options={{ title: 'Urlopy' }}
        />
        <Stack.Screen
          name="Reminders"
          component={withLayout(RemindersScreen, 'Reminders')}
          options={{ title: 'Przypomnienia' }}
        />
        <Stack.Screen
          name="Announcements"
          component={withLayout(AnnouncementsScreen, 'Announcements')}
          options={{ title: 'Ogłoszenia' }}
        />
        <Stack.Screen
          name="Profile"
          component={withLayout(ProfileScreen, 'Profile')}
          options={{ title: 'Profil' }}
        />
        <Stack.Screen
          name="LiniaDoSzefa"
          component={withLayout(SendRequestScreen, 'LiniaDoSzefa')}
          options={{ title: 'Linia do Szefa' }}
        />
        <Stack.Screen
          name="ReportProblem"
          component={withLayout(ReportProblemScreen, 'ReportProblem')}
          options={{ title: 'Zgłoś problem' }}
        />
        <Stack.Screen
          name="DirectorReports"
          component={withLayout(DirectorReportsScreen, 'DirectorReports')}
          options={{ title: 'Zgłoszenia' }}
        />
        <Stack.Screen
          name="About"
          component={withLayout(AboutCompanyScreen, 'About')}
          options={{ title: 'O firmie' }}
        />
        <Stack.Screen
          name="Docs"
          component={withLayout(DocsScreen, 'Docs')}
          options={{ title: 'Dokumentacja' }}
        />
        <Stack.Screen
          name="AddProject"
          component={AddProjectScreen}
          options={{ title: 'Nowy Projekt' }}
        />
        <Stack.Screen
          name="ProjectDetails"
          component={ProjectDetailsScreen}
          options={{ title: 'Szczegóły' }}
        />
      </Stack.Navigator>
    </>
  );
};

const RootNavigation = () => {
  const { user, isActive, loading } = useAuth();
  const { theme } = useAppTheme();

  if (loading) {
    return (
      <CenteredContainer theme={theme}>
        <SplashLogo source={require('./assets/velder.png')} />
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <LoadingText theme={theme}>Inicjalizacja systemu...</LoadingText>
      </CenteredContainer>
    );
  }

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    );
  }

  if (!isActive) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
      </Stack.Navigator>
    );
  }

  return <AuthenticatedStack />;
};

import { RootSiblingParent } from 'react-native-root-siblings';

export default function App() {
  useEffect(() => {
    registerForPushNotificationsAsync();
    setBadgeCount(0);
    const cleanup = setupNotificationListeners();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <RootSiblingParent>
      <SafeAreaProvider>
        <AppThemeProvider>
          <AuthProvider>
            <NavigationContainer>
              <RootNavigation />
            </NavigationContainer>
            <WebToaster />
          </AuthProvider>
        </AppThemeProvider>
      </SafeAreaProvider>
    </RootSiblingParent>
  );
}
