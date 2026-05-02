import { Audio } from 'expo-av';
import { Platform } from 'react-native';

let soundObject: Audio.Sound | null = null;

export const playDoneSound = async () => {
  if (Platform.OS === 'web') return;
  try {
    if (soundObject) {
      await soundObject.unloadAsync();
    }
    const { sound } = await Audio.Sound.createAsync(require('../../assets/sound/done.wav'), {
      shouldPlay: true,
    });
    soundObject = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        soundObject = null;
      }
    });
  } catch (error) {
    console.warn('Failed to play local sound:', error);
  }
};
