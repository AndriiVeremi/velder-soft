import React from 'react';
import { View, Text as RNText, TouchableOpacity, Modal, TextInput } from 'react-native';
import styled from 'styled-components/native';
import { X, Mic } from 'lucide-react-native';
import {
  ModalOverlay,
  ModalContent,
  Label,
  VoiceInputContainer,
  MicButton,
  ListeningIndicator,
} from '../CommonUI';

interface AddServiceModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: () => void;
  theme: any;
  hospital: string;
  setHospital: (v: string) => void;
  department: string;
  setDepartment: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  isListening: boolean;
  toggleListening: () => void;
}

const StyledInput = styled.TextInput`
  background-color: ${(props) => props.theme.colors.background};
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 15px;
  color: ${(props) => props.theme.colors.text};
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
`;

const AddBtn = styled.TouchableOpacity`
  backgroundcolor: ${(props) => props.theme.colors.primary};
  padding: 16px;
  border-radius: 12px;
  margintop: 20px;
  alignitems: center;
`;

const AddBtnText = styled(RNText)`
  color: white;
  fontweight: bold;
  fontsize: ${(props) => props.theme.fontSize.f16}px;
`;

export const AddServiceModal: React.FC<AddServiceModalProps> = ({
  visible,
  onClose,
  onAdd,
  theme,
  hospital,
  setHospital,
  department,
  setDepartment,
  description,
  setDescription,
  isListening,
  toggleListening,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <ModalOverlay>
        <ModalContent theme={theme}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
            <RNText
              style={{ fontSize: theme.fontSize.f20, fontWeight: 'bold', color: theme.colors.text }}
            >
              Nowe zgłoszenie
            </RNText>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <Label theme={theme}>Szpital</Label>
          <StyledInput
            theme={theme}
            placeholder="Nazwa szpitala"
            value={hospital}
            onChangeText={setHospital}
            placeholderTextColor={theme.colors.textSecondary}
          />

          <Label theme={theme}>Oddział</Label>
          <StyledInput
            theme={theme}
            placeholder="Nazwa oddziału"
            value={department}
            onChangeText={setDepartment}
            placeholderTextColor={theme.colors.textSecondary}
          />

          <Label theme={theme}>Opis problemu / Prace</Label>
          <VoiceInputContainer theme={theme} style={{ marginBottom: 20 }}>
            <StyledInput
              theme={theme}
              placeholder="Co należy zrobić..."
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
              placeholderTextColor={theme.colors.textSecondary}
              style={{
                flex: 1,
                height: 100,
                textAlignVertical: 'top',
                marginBottom: 0,
                borderWidth: 0,
              }}
            />
            <MicButton active={isListening} theme={theme} onPress={toggleListening}>
              <Mic size={24} color={isListening ? 'white' : theme.colors.primary} />
            </MicButton>
          </VoiceInputContainer>
          <ListeningIndicator active={isListening} theme={theme} />

          <AddBtn theme={theme} onPress={onAdd}>
            <AddBtnText theme={theme}>Wyślij zgłoszenie</AddBtnText>
          </AddBtn>
        </ModalContent>
      </ModalOverlay>
    </Modal>
  );
};
