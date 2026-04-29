import { Alert, Platform } from 'react-native';

export function confirmDelete(
  message: string,
  onConfirm: () => void,
  title = 'Usuń',
  confirmText = 'Tak'
) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'Anuluj' },
      { text: confirmText, onPress: onConfirm, style: 'destructive' },
    ]);
  }
}
