import { useState, useCallback } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { notify } from '../utils/notify';

interface UseVoiceRecognitionProps {
  lang?: string;
  onResult: (transcript: string) => void;
}

export const useVoiceRecognition = ({ lang = 'pl-PL', onResult }: UseVoiceRecognitionProps) => {
  const [isListening, setIsListening] = useState(false);

  useSpeechRecognitionEvent('result', (event) => {
    if (event.results[0]?.transcript) {
      onResult(event.results[0].transcript);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });

  const startListening = useCallback(async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      notify.error('Brak uprawnień do mikrofonu');
      return;
    }

    setIsListening(true);
    ExpoSpeechRecognitionModule.start({
      lang,
      interimResults: true,
      continuous: false,
    });
  }, [lang]);

  const stopListening = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    startListening,
    stopListening,
    toggleListening,
  };
};
