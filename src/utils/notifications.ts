import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#008744',
        enableVibrate: true,
        showBadge: true,
        sound: 'default',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    if (!Device.isDevice) return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    try {
      const token = await Notifications.getExpoPushTokenAsync();
      console.log('Push Token acquired');
    } catch (tokenErr) {
      console.warn('Failed to get push token:', tokenErr);
    }
  } catch (err) {
    console.warn('Registration for push notifications failed:', err);
  }
}

export async function setBadgeCount(count: number) {
  if (Platform.OS === 'web') return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') {
      await Notifications.setBadgeCountAsync(count);
    }
  } catch (e) {}
}

export function setupNotificationListeners() {
  if (Platform.OS === 'web') return;

  const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
    const data = response.notification.request.content.data;
    const reminderId = data?.reminderId;

    if (reminderId) {
      for (let i = 0; i < 3; i++) {
        try {
          await Notifications.cancelScheduledNotificationAsync(`${reminderId}_${i}`);
        } catch (e) {}
      }
    }
  });

  return () => subscription.remove();
}

export async function scheduleDailyReminder(taskCount: number, startTime: string = '09:00') {
  if (Platform.OS === 'web') return;

  const DAILY_REMINDER_ID = 'daily-tasks-reminder';

  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
  } catch (e) {}

  if (taskCount === 0) return;

  const [hour, minute] = startTime.split(':').map(Number);

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: 'Dzień dobry! Masz zadania 📋',
      body: `Dziś na liście: ${taskCount} zadań. Powodzenia!`,
      sound: true,
      badge: taskCount,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: hour,
      minute: minute,
    },
  });
}
