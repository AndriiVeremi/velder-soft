import React from 'react';
import { View, Text as RNText, TouchableOpacity, Modal, ScrollView, TextInput } from 'react-native';
import styled from 'styled-components/native';
import { X, Mic, CheckCircle2 } from 'lucide-react-native';
import {
  ModalOverlay,
  ModalContent,
  Label,
  VoiceInputContainer,
  MicButton,
  ListeningIndicator,
  TimePicker,
} from '../CommonUI';

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: () => void;
  theme: any;
  role: string;
  workers: any[];
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  hour: number;
  setHour: (v: number) => void;
  minute: number;
  setMinute: (v: number) => void;
  isUrgent: boolean;
  setIsUrgent: (v: boolean) => void;
  selectedWorkerId: string;
  setSelectedWorkerId: (v: string) => void;
  isListening: boolean;
  toggleListening: () => void;
}

const StyledInput = styled.TextInput`
  background-color: ${(props) => props.theme.colors.background};
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 15px;
  color: ${(props) => props.theme.colors.text};
  font-size: ${(props) => props.theme.fontSize.f16}px;
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
`;

const AddBtn = styled.TouchableOpacity`
  background-color: ${(props) => props.theme.colors.primary};
  padding: 16px;
  border-radius: 12px;
  margintop: 30px;
  align-items: center;
`;

const AddBtnText = styled(RNText)`
  color: white;
  font-weight: bold;
  font-size: ${(props) => props.theme.fontSize.f16}px;
`;

export const AddTaskModal: React.FC<AddTaskModalProps> = (props) => {
  const {
    visible,
    onClose,
    onAdd,
    theme,
    role,
    workers,
    title,
    setTitle,
    description,
    setDescription,
    hour,
    setHour,
    minute,
    setMinute,
    isUrgent,
    setIsUrgent,
    selectedWorkerId,
    setSelectedWorkerId,
    isListening,
    toggleListening,
  } = props;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <ModalOverlay>
        <ModalContent theme={theme}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}
            >
              <RNText
                style={{
                  fontSize: theme.fontSize.f20,
                  fontWeight: 'bold',
                  color: theme.colors.text,
                }}
              >
                Nowe zadanie
              </RNText>
              <TouchableOpacity onPress={onClose}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <Label theme={theme}>Tytuł zadania</Label>
            <StyledInput
              theme={theme}
              placeholder="Np. Kontrola instalacji"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={theme.colors.textSecondary}
            />

            <Label theme={theme}>Opis (opcjonalnie)</Label>
            <VoiceInputContainer
              theme={theme}
              style={{ marginBottom: 4, alignItems: 'flex-start' }}
            >
              <TextInput
                placeholder="Dodatkowe informacje..."
                value={description}
                onChangeText={setDescription}
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={3}
                style={{
                  flex: 1,
                  minHeight: 80,
                  textAlignVertical: 'top',
                  padding: 12,
                  color: theme.colors.text,
                  fontSize: theme.fontSize.f16,
                }}
              />
              <MicButton
                active={isListening}
                theme={theme}
                onPress={toggleListening}
                style={{ marginTop: 8 }}
              >
                <Mic size={24} color={isListening ? 'white' : theme.colors.primary} />
              </MicButton>
            </VoiceInputContainer>
            <ListeningIndicator active={isListening} theme={theme} style={{ marginBottom: 15 }} />

            {role === 'DIRECTOR' && (
              <>
                <Label theme={theme}>Przypisz do</Label>
                <View style={{ marginBottom: 15 }}>
                  {[{ id: 'all', name: 'Wszyscy pracownicy' }, ...workers].map((w) => (
                    <TouchableOpacity
                      key={w.id}
                      onPress={() => setSelectedWorkerId(w.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 10,
                        borderRadius: 8,
                        marginBottom: 4,
                        backgroundColor:
                          selectedWorkerId === w.id
                            ? theme.colors.primary + '20'
                            : theme.colors.background,
                        borderWidth: 1,
                        borderColor:
                          selectedWorkerId === w.id ? theme.colors.primary : theme.colors.border,
                      }}
                    >
                      <View
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 9,
                          borderWidth: 2,
                          borderColor:
                            selectedWorkerId === w.id ? theme.colors.primary : theme.colors.border,
                          backgroundColor:
                            selectedWorkerId === w.id ? theme.colors.primary : 'transparent',
                          marginRight: 10,
                        }}
                      />
                      <RNText style={{ color: theme.colors.text, fontSize: theme.fontSize.f15 }}>
                        {w.name}
                      </RNText>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Label theme={theme}>Godzina</Label>
            <TimePicker
              hour={hour}
              minute={minute}
              onHourChange={setHour}
              onMinuteChange={setMinute}
              theme={theme}
            />

            {role === 'DIRECTOR' && (
              <TouchableOpacity
                onPress={() => setIsUrgent(!isUrgent)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 20,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: isUrgent ? theme.colors.error + '15' : theme.colors.background,
                  borderWidth: 1,
                  borderColor: isUrgent ? theme.colors.error : theme.colors.border,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: isUrgent ? theme.colors.error : theme.colors.border,
                    backgroundColor: isUrgent ? theme.colors.error : 'transparent',
                    marginRight: 12,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {isUrgent && <CheckCircle2 size={14} color="white" />}
                </View>
                <RNText
                  style={{
                    color: isUrgent ? theme.colors.error : theme.colors.text,
                    fontWeight: 'bold',
                    fontSize: theme.fontSize.f16,
                  }}
                >
                  Oznacz jako PILNE 🚨
                </RNText>
              </TouchableOpacity>
            )}

            <AddBtn theme={theme} onPress={onAdd}>
              <AddBtnText theme={theme}>Dodaj zadanie</AddBtnText>
            </AddBtn>
          </ScrollView>
        </ModalContent>
      </ModalOverlay>
    </Modal>
  );
};
