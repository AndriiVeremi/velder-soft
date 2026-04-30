import Toast from 'react-native-root-toast';
import { Alert, Platform } from 'react-native';

export const notify = {
  success: (msg: string) => {
    if (Platform.OS === 'web') {
      // Для вебу залишаємо як є (там react-hot-toast)
      console.log('Success:', msg);
      return;
    }
    
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
    if (Platform.OS === 'web') {
      console.log('Error:', msg);
      return;
    }

    Alert.alert('Błąd', msg);
  },
};
