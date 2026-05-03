import React, { useEffect, useRef } from 'react';
import {
  View,
  Text as RNText,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import styled from 'styled-components/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { RootStackParamList } from '../config/navigationTypes';
import {
  REMINDER_REPEAT_COUNT,
  REMINDER_SIGNALS_COUNT,
  REMINDER_INTERVAL_SECONDS,
} from '../utils/notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { BellRing, X, Timer } from 'lucide-react-native';
import { useAppTheme } from '../context/ThemeContext';

const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
  align-items: center;
  justify-content: center;
  padding: 30px;
`;

const Glow = styled(Animated.View)<{ color: string }>`
  position: absolute;
  width: 250px;
  height: 250px;
  border-radius: 125px;
  background-color: ${(props) => props.color};
`;

const IconContainer = styled(Animated.View)`
  margin-bottom: 40px;
  background-color: ${(props) => (props.theme.isDark ? '#1a1a1a' : '#f0f0f0')};
  padding: 30px;
  border-radius: 100px;
  border-width: 2px;
  border-color: ${(props) => props.theme.colors.border};
`;

const Label = styled(RNText)`
  font-size: 14px;
  color: ${(props) => props.theme.colors.textSecondary};
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: 12px;
  font-weight: 600;
`;

const Title = styled(RNText)`
  font-size: 28px;
  font-weight: 900;
  color: ${(props) => props.theme.colors.text};
  text-align: center;
  margin-bottom: 60px;
  line-height: 36px;
`;

const ButtonGroup = styled.View`
  width: 100%;
  gap: 16px;
`;

const SnoozeBtn = styled.TouchableOpacity`
  background-color: ${(props) => props.theme.colors.primary};
  border-radius: 20px;
  padding: 20px;
  width: 100%;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  elevation: 10;
  shadow-color: ${(props) => props.theme.colors.primary};
  shadow-opacity: 0.3;
  shadow-radius: 15px;
`;

const SnoozeText = styled(RNText)`
  color: white;
  font-size: 18px;
  font-weight: bold;
  margin-left: 10px;
`;

const DismissBtn = styled.TouchableOpacity`
  background-color: transparent;
  border-radius: 20px;
  padding: 20px;
  width: 100%;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border-width: 2px;
  border-color: ${(props) => props.theme.colors.error};
`;

const DismissText = styled(RNText)`
  color: ${(props) => props.theme.colors.error};
  font-size: 18px;
  font-weight: bold;
  margin-left: 10px;
`;

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Alarm'>;
  route: RouteProp<RootStackParamList, 'Alarm'>;
};

const AlarmScreen: React.FC<Props> = ({ navigation, route }) => {
  const { reminderId, title } = route.params;
  const { theme } = useAppTheme();
  const soundRef = useRef<Audio.Sound | null>(null);

  const shake = useSharedValue(0);
  const pulse = useSharedValue(1);

  const startSound = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      const { sound } = await Audio.Sound.createAsync(require('../../assets/sound/reminder.wav'), {
        shouldPlay: true,
        isLooping: true,
        volume: 1.0,
      });
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

  useEffect(() => {
    startSound();

    shake.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      ),
      -1,
      true
    );

    pulse.value = withRepeat(withTiming(1.4, { duration: 1500 }), -1, true);

    return () => {
      stopSound();
    };
  }, [pulse, shake]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${shake.value}deg` }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.4], [0.15, 0], 'clamp'),
  }));

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
      if (reminderId !== 'test') {
        await deleteDoc(doc(db, 'reminders', reminderId));
      }
    } catch (e) {}
    navigation.goBack();
  };

  return (
    <Container theme={theme}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <Glow color={theme.colors.primary} style={animatedGlowStyle} />

      <IconContainer theme={theme} style={animatedIconStyle}>
        <BellRing size={80} color={theme.colors.primary} strokeWidth={2.5} />
      </IconContainer>

      <Label theme={theme}>Ważne przypomnienie</Label>
      <Title theme={theme}>{title}</Title>

      <ButtonGroup>
        <SnoozeBtn theme={theme} onPress={handleSnooze} activeOpacity={0.7}>
          <Timer size={24} color="#fff" />
          <SnoozeText>Za 5 minut</SnoozeText>
        </SnoozeBtn>

        <DismissBtn theme={theme} onPress={handleDismiss} activeOpacity={0.7}>
          <X size={24} color={theme.colors.error} />
          <DismissText theme={theme}>Wyłącz</DismissText>
        </DismissBtn>
      </ButtonGroup>
    </Container>
  );
};

export default AlarmScreen;
