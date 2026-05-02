import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const playDoneSound = async () => {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Sukces! ✅',
        body: 'Działanie zostało potwierdzone.',
        sound: 'done.wav',
        data: {},
      },
      trigger: null,
    });
  } catch (error) {
    console.warn('Failed to play local sound:', error);
  }
};
