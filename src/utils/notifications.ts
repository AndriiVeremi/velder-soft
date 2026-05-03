import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../config/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { navigationRef } from '../navigation/navigationRef';

const PUSH_FUNCTION_URL =
  'https://us-central1-velder-project.cloudfunctions.net/sendPushNotification';

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
    return cur < startMin || cur >= endMin;
  } else {
    return cur >= endMin && cur < startMin;
  }
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    return {
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
    };
  },
});

export const REMINDER_REPEAT_COUNT = 20;
/** @deprecated use REMINDER_INTERVAL_SECONDS */
export const REMINDER_INTERVAL_MINUTES = 1;
export const REMINDER_SIGNALS_COUNT = 10;
export const REMINDER_INTERVAL_SECONDS = 30;

export async function setupReminderCategory() {
  if (Platform.OS === 'web') return;
  await Notifications.setNotificationCategoryAsync('reminder', [
    {
      identifier: 'snooze',
      buttonTitle: 'Za 5 minut',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'dismiss',
      buttonTitle: 'Wyłącz',
      options: { isDestructive: true, opensAppToForeground: false },
    },
  ]);
}

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return;

  try {
    if (Platform.OS === 'android') {
      const CHANNEL_MIGRATION_KEY = 'notif_channels_v4';
      const migrated = await AsyncStorage.getItem(CHANNEL_MIGRATION_KEY);
      if (!migrated) {
        for (const id of [
          'default',
          'alerts',
          'alerts_v2',
          'alerts_v3',
          'reminders',
          'reminders_v2',
          'done',
          'done_v1',
        ]) {
          try {
            await Notifications.deleteNotificationChannelAsync(id);
          } catch (_) {}
        }
        await AsyncStorage.setItem(CHANNEL_MIGRATION_KEY, '1');
      }

      await Notifications.setNotificationChannelAsync('default', {
        name: 'Domyślny',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#008744',
        enableVibrate: true,
        showBadge: true,
        sound: 'alert.wav',
      });

      await Notifications.setNotificationChannelAsync('alerts', {
        name: 'Alerts',
        importance: Notifications.AndroidImportance.MAX,
        enableVibrate: true,
        vibrationPattern: [0, 500, 200, 500],
        showBadge: true,
        sound: 'alert.wav',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Przypomnienia',
        importance: Notifications.AndroidImportance.MAX,
        enableVibrate: true,
        vibrationPattern: [0, 500, 500, 500, 500, 500],
        showBadge: true,
        sound: 'reminder.wav',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
      });

      await Notifications.setNotificationChannelAsync('done', {
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

function navigateToAlarm(reminderId: string, title: string) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Alarm', { reminderId, title });
  }
}

export function setupNotificationListeners() {
  if (Platform.OS === 'web') return;

  const handleResponse = async (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    const reminderId = data?.reminderId as string | undefined;
    const actionId = response.actionIdentifier;

    if (!reminderId) return;

    if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      navigateToAlarm(reminderId, (data?.title as string) || '');
      return;
    }

    if (actionId === 'dismiss') {
      try {
        await deleteDoc(doc(db, 'reminders', reminderId));
      } catch (e) {
        console.warn('Failed to delete reminder from DB:', e);
      }
      for (let i = 0; i < REMINDER_REPEAT_COUNT; i++) {
        try {
          await Notifications.cancelScheduledNotificationAsync(`${reminderId}_${i}`);
        } catch (e) {}
      }
    }

    if (actionId === 'snooze') {
      for (let i = 0; i < REMINDER_REPEAT_COUNT; i++) {
        try {
          await Notifications.cancelScheduledNotificationAsync(`${reminderId}_${i}`);
        } catch (e) {}
      }
      const snoozeBase = new Date(Date.now() + 5 * 60 * 1000);
      for (let i = 0; i < REMINDER_SIGNALS_COUNT; i++) {
        const scheduleDate = new Date(snoozeBase.getTime() + i * REMINDER_INTERVAL_SECONDS * 1000);
        try {
          await Notifications.scheduleNotificationAsync({
            identifier: `${reminderId}_${i}`,
            content: {
              title: 'Przypomnienie (powrót) 🔔',
              body: (data?.title as string) || '',
              sound: 'reminder.wav',
              categoryIdentifier: 'reminder',
              data: { reminderId, title: data?.title },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: scheduleDate,
              channelId: 'reminders',
            },
          });
        } catch (e) {}
      }
    }
  };

  // Foreground: відкрити AlarmScreen одразу при отриманні нагадування
  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data;
    if (data?.reminderId) {
      navigateToAlarm(data.reminderId as string, (data.title as string) || '');
    }
  });

  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) handleResponse(response);
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener(handleResponse);

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}

type PushRecipient =
  | string
  | { token: string; notificationStart?: string; notificationEnd?: string };

export async function sendPushNotification(
  recipients: PushRecipient[],
  title: string,
  body: string,
  channelId: 'alerts' | 'reminders' | 'done' = 'alerts'
) {
  if (recipients.length === 0) return;

  const soundFile =
    channelId === 'done' ? 'done.wav' : channelId === 'reminders' ? 'reminder.wav' : 'alert.wav';

  const messages = recipients
    .map((r) => {
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
          sound: silent ? null : soundFile,
        },
        _displayInForeground: true,
        ttl: 3600,
      };
    })
    .filter((m) => !!m.to);

  if (messages.length === 0) return;

  if (Platform.OS === 'web') {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        console.error('[Push API] No auth token');
        return;
      }
      await fetch(PUSH_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          recipients: messages.map((m) => m.to),
          title,
          body,
          channelId,
        }),
      });
    } catch (error) {
      console.error('[Push API] Cloud Function Error:', error);
    }
    return;
  }

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
    const tickets = Array.isArray(result?.data) ? result.data : [];
    tickets.forEach((ticket: any, i: number) => {
      if (ticket.status === 'error') {
        console.error(`[Push API] Ticket ${i} error:`, ticket.message, ticket.details);
      }
    });
  } catch (error) {
    console.error('[Push API] Error:', error);
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
      sound: 'alert.wav',
      badge: taskCount,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: hour,
      minute: minute,
      channelId: 'alerts',
    },
  });
}
