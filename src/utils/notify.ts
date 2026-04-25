import { Alert } from 'react-native';

export const notify = {
  success: (msg: string) => {
    Alert.alert('Sukces', msg);
  },
  error: (msg: string) => {
    Alert.alert('Błąd', msg);
  },
};
