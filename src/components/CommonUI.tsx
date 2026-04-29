import React from 'react';
import { TouchableOpacity, Text as RNText, View } from 'react-native';
import styled from 'styled-components/native';
import { ChevronUp, ChevronDown } from 'lucide-react-native';

const TimePickerContainer = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: ${(props) => props.theme.colors.background};
  padding: 15px;
  border-radius: 12px;
  justify-content: center;
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const TimeBlock = styled.View`
  align-items: center;
  width: 50px;
`;

const TimeValue = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f24}px;
  font-weight: bold;
  margin: 5px 0;
  color: ${(props) => props.theme.colors.text};
`;

const TimeSeparator = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f24}px;
  font-weight: bold;
  margin-horizontal: 10px;
  color: ${(props) => props.theme.colors.text};
`;

interface TimePickerProps {
  hour: number;
  minute: number;
  onHourChange: (newH: number) => void;
  onMinuteChange: (newM: number) => void;
  theme: any;
}

export const TimePicker = ({
  hour,
  minute,
  onHourChange,
  onMinuteChange,
  theme,
}: TimePickerProps) => {
  const adjust = (current: number, delta: number, max: number) => {
    let next = current + delta;
    if (next > max) return 0;
    if (next < 0) return max;
    return next;
  };

  return (
    <TimePickerContainer theme={theme}>
      <TimeBlock theme={theme}>
        <TouchableOpacity onPress={() => onHourChange(adjust(hour, 1, 23))}>
          <ChevronUp size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <TimeValue theme={theme}>{hour.toString().padStart(2, '0')}</TimeValue>
        <TouchableOpacity onPress={() => onHourChange(adjust(hour, -1, 23))}>
          <ChevronDown size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </TimeBlock>
      <TimeSeparator theme={theme}>:</TimeSeparator>
      <TimeBlock theme={theme}>
        <TouchableOpacity onPress={() => onMinuteChange(adjust(minute, 5, 55))}>
          <ChevronUp size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <TimeValue theme={theme}>{minute.toString().padStart(2, '0')}</TimeValue>
        <TouchableOpacity onPress={() => onMinuteChange(adjust(minute, -5, 55))}>
          <ChevronDown size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </TimeBlock>
    </TimePickerContainer>
  );
};

export const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

export const ModalContent = styled.View`
  background-color: ${(props) => props.theme.colors.surface};
  width: 100%;
  max-width: 500px;
  padding: 25px;
  border-radius: 20px;
  elevation: 10;
`;
