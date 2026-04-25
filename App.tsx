import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { ThemeProvider } from 'styled-components/native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { theme } from './src/config/theme';
import { MainLayout } from './src/components/Layout';
import { View, ActivityIndicator, Text as RNText, Platform, LogBox } from 'react-native';
import styled from 'styled-components/native';
import { registerForPushNotificationsAsync } from './src/utils/notifications';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import TasksScreen from './src/screens/TasksScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ServiceScreen from './src/screens/ServiceScreen';
import UsersScreen from './src/screens/UsersScreen';
import VacationsScreen from './src/screens/VacationsScreen';
import RemindersScreen from './src/screens/RemindersScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import AddProjectScreen from './src/screens/AddProjectScreen';
import ProjectDetailsScreen from './src/screens/ProjectDetailsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PendingApprovalScreen from './src/screens/PendingApprovalScreen';

LogBox.ignoreLogs(['Image: style.tintColor is deprecated', 'Blocked aria-hidden on an element']);

// Динамічний імпорт Toaster тільки для вебу
let Toaster: React.FC = () => null;
if (Platform.OS === 'web') {
  try {
    Toaster = require('react-hot-toast').Toaster;
  } catch (e) {}
}

type RootStackParamList = {
  Home: undefined;
  Tasks: undefined;
  Dashboard: undefined;
  Service: undefined;
  Users: undefined;
  Vacations: undefined;
  Reminders: undefined;
  Profile: undefined;
  AddProject: undefined;
  ProjectDetails: { project: unknown };
  Login: undefined;
  Register: undefined;
  PendingApproval: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const CenteredContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  background-color: ${(props: { theme: { colors: { background: string } } }) =>
    props.theme.colors.background};
`;

interface ScreenProps {
  navigation: StackNavigationProp<RootStackParamList, keyof RootStackParamList>;
}

const HomeWithLayout = ({ navigation }: ScreenProps) => (
  <MainLayout navigation={navigation} currentRoute="Home">
    <HomeScreen navigation={navigation} />
  </MainLayout>
);

const TasksWithLayout = ({ navigation }: ScreenProps) => (
  <MainLayout navigation={navigation} currentRoute="Tasks">
    <TasksScreen />
  </MainLayout>
);

const DashboardWithLayout = ({ navigation }: ScreenProps) => (
  <MainLayout navigation={navigation} currentRoute="Dashboard">
    <DashboardScreen navigation={navigation} />
  </MainLayout>
);

const ServiceWithLayout = ({ navigation }: ScreenProps) => (
  <MainLayout navigation={navigation} currentRoute="Service">
    <ServiceScreen />
  </MainLayout>
);

const UsersWithLayout = ({ navigation }: ScreenProps) => (
  <MainLayout navigation={navigation} currentRoute="Users">
    <UsersScreen />
  </MainLayout>
);

const VacationsWithLayout = ({ navigation }: ScreenProps) => (
  <MainLayout navigation={navigation} currentRoute="Vacations">
    <VacationsScreen />
  </MainLayout>
);

const RemindersWithLayout = ({ navigation }: ScreenProps) => (
  <MainLayout navigation={navigation} currentRoute="Reminders">
    <RemindersScreen />
  </MainLayout>
);

const ProfileWithLayout = ({ navigation }: ScreenProps) => (
  <MainLayout navigation={navigation} currentRoute="Profile">
    <ProfileScreen />
  </MainLayout>
);

const AuthenticatedStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="Home" component={HomeWithLayout} options={{ title: 'Start' }} />
      <Stack.Screen name="Tasks" component={TasksWithLayout} options={{ title: 'Zadania' }} />
      <Stack.Screen
        name="Dashboard"
        component={DashboardWithLayout}
        options={{ title: 'Projekty' }}
      />
      <Stack.Screen name="Service" component={ServiceWithLayout} options={{ title: 'Serwis' }} />
      <Stack.Screen name="Users" component={UsersWithLayout} options={{ title: 'Pracownicy' }} />
      <Stack.Screen
        name="Vacations"
        component={VacationsWithLayout}
        options={{ title: 'Urlopy' }}
      />
      <Stack.Screen
        name="Reminders"
        component={RemindersWithLayout}
        options={{ title: 'Przypomnienia' }}
      />
      <Stack.Screen name="Profile" component={ProfileWithLayout} options={{ title: 'Profil' }} />
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

  if (loading) {
    return (
      <CenteredContainer theme={theme}>
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
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigation />
        </NavigationContainer>
        {Platform.OS === 'web' && <Toaster />}
      </AuthProvider>
    </ThemeProvider>
  );
}
