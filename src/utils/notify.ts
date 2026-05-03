import Toast from 'react-native-root-toast';
import { Alert, Platform } from 'react-native';

export const notify = {
  success: (msg: string) => {
    if (Platform.OS === 'web') return;

    Toast.show(msg, {
      duration: Toast.durations.SHORT,
      position: Toast.positions.BOTTOM,
      shadow: true,
      animation: true,
      hideOnPress: true,
      delay: 0,
      backgroundColor: '#008744',
    });
  },
  error: (msg: string) => {
    if (Platform.OS === 'web') return;

    Alert.alert('Błąd', msg);
  },
};
