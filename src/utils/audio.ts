import { Platform } from 'react-native';
import { createAudioPlayer } from 'expo-audio';

export const playDoneSound = async () => {
  if (Platform.OS === 'web') return;
  try {
    const player = createAudioPlayer(require('../../assets/sound/done.wav'));
    await player.play();
    setTimeout(() => {
      try {
        player.release();
      } catch (e) {}
    }, 3000);
  } catch (error) {
    console.warn('Failed to play local sound:', error);
  }
};
