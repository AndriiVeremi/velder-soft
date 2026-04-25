import { Alert, Platform } from 'react-native';

let webToast: any = null;
if (Platform.OS === 'web') {
  try {
    webToast = require('react-hot-toast').toast;
  } catch (e) {
    console.warn('Toast library not found');
  }
}

export const notify = {
  success: (msg: string) => {
    if (Platform.OS === 'web' && webToast) {
      webToast.success(msg);
    } else {
      Alert.alert('Sukces', msg);
    }
  },
  error: (msg: string) => {
    if (Platform.OS === 'web' && webToast) {
      webToast.error(msg);
    } else {
      Alert.alert('Błąd', msg);
    }
  },
};
