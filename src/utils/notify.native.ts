import Toast from 'react-native-root-toast';
import { Alert } from 'react-native';

export const notify = {
  success: (msg: string) => {
    Toast.show(msg, {
      duration: Toast.durations.SHORT,
      position: Toast.positions.BOTTOM,
      shadow: true,
      animation: true,
      hideOnPress: true,
      backgroundColor: '#008744',
    });
  },
  error: (msg: string) => {
    Alert.alert('Błąd', msg);
  },
};
