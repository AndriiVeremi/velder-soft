import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

let _quietStart: string | undefined;
let _quietEnd: string | undefined;

export function setQuietHoursCache(start?: string, end?: string) {
  _quietStart = start;
  _quietEnd = end;
}

export function isQuietHours(start?: string, end?: string): boolean {
  const s = start ?? _quietStart;
  const e = end ?? _quietEnd;
  if (!s || !e) return false;

  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = s.split(':').map(Number);
  const [eh, em] = e.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  if (startMin <= endMin) {
    return cur >= startMin && cur < endMin;
  } else {
    return cur >= startMin || cur < endMin;
  }
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    const isPersonalReminder = !!data?.reminderId;
    const shouldPlaySound = isPersonalReminder || !isQuietHours();
    return {
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound,
      shouldSetBadge: true,
    };
  },
});

export const REMINDER_REPEAT_COUNT = 20;
export const REMINDER_INTERVAL_MINUTES = 1;

export async function setupReminderCategory() {
  if (Platform.OS === 'web') return;
  await Notifications.setNotificationCategoryAsync('reminder', [
    {
      identifier: 'snooze',
      buttonTitle: 'Za 5 minut',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'dismiss',
      buttonTitle: 'Wyłącz',
      options: { isDestructive: true, opensAppToForeground: true },
    },
  ]);
}

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Domyślny',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#008744',
        enableVibrate: true,
        showBadge: true,
        sound: 'alert.wav',
      });

      await Notifications.setNotificationChannelAsync('alerts_v2', {
        name: 'Alerts',
        importance: Notifications.AndroidImportance.MAX,
        enableVibrate: true,
        vibrationPattern: [0, 500, 200, 500],
        showBadge: true,
        sound: 'alert.wav',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      await Notifications.setNotificationChannelAsync('reminders_v2', {
        name: 'Przypomnienia',
        importance: Notifications.AndroidImportance.MAX,
        enableVibrate: true,
        vibrationPattern: [0, 500, 500, 500, 500, 500],
        showBadge: true,
        sound: 'reminder.wav',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
      });

      await Notifications.setNotificationChannelAsync('done_v1', {
        name: 'Potwierdzenia',
        importance: Notifications.AndroidImportance.DEFAULT,
        enableVibrate: true,
        vibrationPattern: [0, 250],
        showBadge: true,
        sound: 'done.wav',
      });
    }

    await setupReminderCategory();

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
          projectId: '60063075-7a9b-47f6-ba92-4021b7514fed',
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

  const handleResponse = async (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    const reminderId = data?.reminderId;
    const actionId = response.actionIdentifier;

    console.log('Notification Response Received:', { actionId, reminderId, data });

    if (!reminderId) return;

    if (actionId === 'dismiss' || actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      console.log(`Attempting to dismiss reminder: ${reminderId}`);
      for (let i = 0; i < REMINDER_REPEAT_COUNT; i++) {
        try {
          const idToCancel = `${reminderId}_${i}`;
          await Notifications.cancelScheduledNotificationAsync(idToCancel);
          console.log(`Cancelled: ${idToCancel}`);
        } catch (e) {
          console.warn(`Failed to cancel ${reminderId}_${i}:`, e);
        }
      }
    }

    if (actionId === 'snooze') {
      console.log(`Snoozing reminder: ${reminderId}`);
      for (let i = 0; i < REMINDER_REPEAT_COUNT; i++) {
        try {
          await Notifications.cancelScheduledNotificationAsync(`${reminderId}_${i}`);
        } catch (e) {}
      }
      const snoozeBase = new Date(Date.now() + 5 * 60 * 1000);
      const SIGNALS_IN_SNOOZE = 3;
      for (let i = 0; i < SIGNALS_IN_SNOOZE; i++) {
        const scheduleDate = new Date(snoozeBase.getTime() + i * REMINDER_INTERVAL_MINUTES * 60000);
        try {
          await Notifications.scheduleNotificationAsync({
            identifier: `${reminderId}_${i}`,
            content: {
              title: `Przypomnienie (powrót) 🔔`,
              body: (data?.title as string) || '',
              sound: 'reminder.wav',
              categoryIdentifier: 'reminder',
              data: { reminderId, title: data?.title },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: scheduleDate,
              channelId: 'reminders_v2',
            },
          });
        } catch (e) {}
      }
    }
  };

  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) handleResponse(response);
  });

  const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);

  return () => subscription.remove();
}

type PushRecipient =
  | string
  | { token: string; notificationStart?: string; notificationEnd?: string };

export async function sendPushNotification(
  recipients: PushRecipient[],
  title: string,
  body: string,
  channelId: 'alerts_v2' | 'reminders_v2' | 'done_v1' = 'alerts_v2'
) {
  if (recipients.length === 0) return;

  const soundFile =
    channelId === 'done_v1'
      ? 'done.wav'
      : channelId === 'reminders_v2'
        ? 'reminder.wav'
        : 'alert.wav';

  const messages = recipients.map((r) => {
    const token = typeof r === 'string' ? r : r.token;
    const start = typeof r === 'string' ? undefined : r.notificationStart;
    const end = typeof r === 'string' ? undefined : r.notificationEnd;
    const silent = isQuietHours(start, end);
    return {
      to: token,
      sound: silent ? null : soundFile,
      title,
      body,
      priority: 'high',
      channelId: channelId,
      android: {
        channelId: channelId,
        sound: silent ? null : true,
      },
      _displayInForeground: true,
      ttl: 3600,
    };
  });

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    const result = await response.json();
    console.log('Push notification result:', result);
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
      body: `Dziś na liście: ${taskCount} zadaң. Powodzenia!`,
      sound: 'alert.wav',
      badge: taskCount,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: hour,
      minute: minute,
      channelId: 'default',
    },
  });
}
