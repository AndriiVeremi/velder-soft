import React from 'react';
import {
  View,
  Text as RNText,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import styled from 'styled-components/native';
import { X, Mic } from 'lucide-react-native';
import { Calendar } from 'react-native-calendars';
import {
  ModalOverlay,
  ModalContent,
  Label,
  VoiceInputContainer,
  MicButton,
  ListeningIndicator,
  TimePicker,
} from '../CommonUI';
import { getCalendarTheme } from '../../config/theme';

interface AddReminderModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: () => void;
  theme: any;
  title: string;
  setTitle: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  hour: number;
  setHour: (v: number) => void;
  minute: number;
  setMinute: (v: number) => void;
  isListening: boolean;
  toggleListening: () => void;
}

const StyledInput = styled.TextInput`
  flex: 1;
  padding: 15px;
  font-size: ${(props) => props.theme.fontSize.f16}px;
  color: ${(props) => props.theme.colors.text};
`;

const ActionBtn = styled.TouchableOpacity`
  background-color: ${(props) => props.theme.colors.primary};
  padding: 18px;
  border-radius: 12px;
  margin-top: 25px;
  align-items: center;
`;

const ActionBtnText = styled(RNText)`
  color: white;
  font-weight: bold;
  font-size: ${(props) => props.theme.fontSize.f16}px;
`;

export const AddReminderModal: React.FC<AddReminderModalProps> = ({
  visible,
  onClose,
  onAdd,
  theme,
  title,
  setTitle,
  date,
  setDate,
  hour,
  setHour,
  minute,
  setMinute,
  isListening,
  toggleListening,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <ModalOverlay>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ width: '100%', flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <ModalContent theme={theme}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View
                style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}
              >
                <RNText
                  style={{
                    fontSize: theme.fontSize.lg,
                    fontWeight: 'bold',
                    color: theme.colors.text,
                  }}
                >
                  Nowe przypomnienie
                </RNText>
                <TouchableOpacity onPress={onClose}>
                  <X size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <VoiceInputContainer theme={theme}>
                <StyledInput
                  theme={theme}
                  placeholder="O czym Ci przypomnieć?"
                  value={title}
                  onChangeText={setTitle}
                  placeholderTextColor={theme.colors.textSecondary}
                />
                <MicButton active={isListening} theme={theme} onPress={toggleListening}>
                  <Mic size={24} color={isListening ? 'white' : theme.colors.primary} />
                </MicButton>
              </VoiceInputContainer>
              <ListeningIndicator active={isListening} theme={theme} />

              <Label
                theme={theme}
                style={{
                  marginTop: 25,
                  marginBottom: 12,
                  fontSize: 12,
                  fontWeight: 'bold',
                  color: theme.colors.textSecondary,
                  textTransform: 'uppercase',
                }}
              >
                Data
              </Label>
              <Calendar
                onDayPress={(day: any) => setDate(day.dateString)}
                markedDates={{ [date]: { selected: true, selectedColor: theme.colors.primary } }}
                theme={getCalendarTheme(theme)}
              />

              <Label
                theme={theme}
                style={{
                  marginTop: 25,
                  marginBottom: 12,
                  fontSize: 12,
                  fontWeight: 'bold',
                  color: theme.colors.textSecondary,
                  textTransform: 'uppercase',
                }}
              >
                Godzina
              </Label>
              <TimePicker
                hour={hour}
                minute={minute}
                onHourChange={setHour}
                onMinuteChange={setMinute}
                theme={theme}
              />

              <ActionBtn theme={theme} onPress={onAdd}>
                <ActionBtnText>USTAW PRZYPOMNIENIE</ActionBtnText>
              </ActionBtn>
            </ScrollView>
          </ModalContent>
        </KeyboardAvoidingView>
      </ModalOverlay>
    </Modal>
  );
};
