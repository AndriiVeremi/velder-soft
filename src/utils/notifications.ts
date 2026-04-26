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
      const token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: '60063075-7a9b-47f6-ba92-4021b7514fed', // Ваш ID з app.json
        })
      ).data;
      console.log('Push Token acquired:', token);
      return token;
    } catch (tokenErr) {
      console.warn('Failed to get push token:', tokenErr);
      return null;
    }
  } catch (err) {
    console.warn('Registration for push notifications failed:', err);
    return null;
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

export async function sendPushNotification(tokens: string[], title: string, body: string) {
  if (tokens.length === 0) return;

  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title: title,
    body: body,
    priority: 'high',
  }));

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
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
