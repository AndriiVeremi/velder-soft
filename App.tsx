import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { MainLayout } from './src/components/Layout';
import { View, ActivityIndicator, Text as RNText, Platform, LogBox } from 'react-native';
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

LogBox.ignoreLogs(['Image: style.tintColor is deprecated', 'Blocked aria-hidden on an element']);

type RootStackParamList = {
  Home: undefined;
  Tasks: undefined;
  Dashboard: undefined;
  Service: undefined;
  Users: undefined;
  Vacations: undefined;
  Reminders: undefined;
  Announcements: undefined;
  Profile: undefined;
  AddProject: undefined;
  ProjectDetails: { project: unknown };
  Login: undefined;
  Register: undefined;
  PendingApproval: undefined;
  ReportProblem: undefined;
  DirectorReports: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const CenteredContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  background-color: ${(props) => props.theme.colors.background};
`;

type RouteKey = keyof RootStackParamList;

const withLayout =
  (Screen: React.ComponentType<any>, routeName: RouteKey) =>
  ({
    navigation,
    route,
  }: {
    navigation: StackNavigationProp<RootStackParamList, RouteKey>;
    route: any;
  }) => (
    <MainLayout navigation={navigation} currentRoute={routeName}>
      <Screen navigation={navigation} route={route} />
    </MainLayout>
  );

const AuthenticatedStack = () => {
  const { theme } = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTitleStyle: { fontWeight: 'bold', color: theme.colors.text },
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
  );
};

const RootNavigation = () => {
  const { user, isActive, loading } = useAuth();
  const { theme } = useAppTheme();

  if (loading) {
    return (
      <CenteredContainer>
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
  );
}
