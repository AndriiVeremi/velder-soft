import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return null;
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;
  }
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#008744',
    });
  }
}

export async function setBadgeCount(count: number) {
  if (Platform.OS === 'web') return;
  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.granted || permissions.canAskAgain) {
    await Notifications.setBadgeCountAsync(count);
  }
}

export async function scheduleDailyReminder(taskCount: number, startTime: string = '09:00') {
  if (Platform.OS === 'web' || taskCount === 0) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }

  const [hour, minute] = startTime.split(':').map(Number);

  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Dzień dobry! Masz zadania 📋',
      body: `Dziś na liście: ${taskCount} zadań. Powodzenia!`,
      sound: true,
      badge: taskCount,
    },
    trigger: {
      hour: hour,
      minute: minute,
      repeats: true,
    } as Notifications.DailyTriggerInput,
  });
}
