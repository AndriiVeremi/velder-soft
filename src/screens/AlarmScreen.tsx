import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { RootStackParamList } from '../config/navigationTypes';
import { REMINDER_REPEAT_COUNT, REMINDER_SIGNALS_COUNT, REMINDER_INTERVAL_SECONDS } from '../utils/notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Alarm'>;
  route: RouteProp<RootStackParamList, 'Alarm'>;
};

const AlarmScreen: React.FC<Props> = ({ navigation, route }) => {
  const { reminderId, title } = route.params;
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    startSound();
    return () => {
      stopSound();
    };
  }, []);

  const startSound = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sound/reminder.wav'),
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      soundRef.current = sound;
    } catch (e) {
      console.warn('AlarmScreen: cannot start sound', e);
    }
  };

  const stopSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (e) {}
  };

  const cancelAllSignals = async () => {
    for (let i = 0; i < REMINDER_REPEAT_COUNT; i++) {
      try {
        await Notifications.cancelScheduledNotificationAsync(`${reminderId}_${i}`);
      } catch (e) {}
    }
  };

  const handleSnooze = async () => {
    await stopSound();
    await cancelAllSignals();

    const snoozeBase = new Date(Date.now() + 5 * 60 * 1000);
    for (let i = 0; i < REMINDER_SIGNALS_COUNT; i++) {
      const scheduleDate = new Date(snoozeBase.getTime() + i * REMINDER_INTERVAL_SECONDS * 1000);
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: `${reminderId}_${i}`,
          content: {
            title: 'Przypomnienie (powrót) 🔔',
            body: title,
            sound: 'reminder.wav',
            categoryIdentifier: 'reminder',
            data: { reminderId, title },
          },
          trigger: {
            type: SchedulableTriggerInputTypes.DATE,
            date: scheduleDate,
            channelId: 'reminders',
          },
        });
      } catch (e) {}
    }

    navigation.goBack();
  };

  const handleDismiss = async () => {
    await stopSound();
    await cancelAllSignals();
    try {
      await deleteDoc(doc(db, 'reminders', reminderId));
    } catch (e) {}
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />
      <Text style={styles.bell}>🔔</Text>
      <Text style={styles.label}>Ważne przypomnienie!</Text>
      <Text style={styles.title}>{title}</Text>
      <TouchableOpacity style={styles.snoozeBtn} onPress={handleSnooze} activeOpacity={0.8}>
        <Text style={styles.snoozeText}>Za 5 minut</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss} activeOpacity={0.8}>
        <Text style={styles.dismissText}>Wyłącz</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AlarmScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  bell: {
    fontSize: 72,
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    color: '#aaa',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 56,
    lineHeight: 34,
  },
  snoozeBtn: {
    backgroundColor: '#008744',
    borderRadius: 16,
    paddingVertical: 18,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  snoozeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  dismissBtn: {
    borderWidth: 2,
    borderColor: '#e53935',
    borderRadius: 16,
    paddingVertical: 18,
    width: '100%',
    alignItems: 'center',
  },
  dismissText: {
    color: '#e53935',
    fontSize: 18,
    fontWeight: '700',
  },
});
