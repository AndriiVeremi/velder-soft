import React from 'react';
import styled from 'styled-components/native';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAppTheme } from '../context/ThemeContext';
import { Clock, LogOut } from 'lucide-react-native';
import { Text, View } from 'react-native';

const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
  justify-content: center;
  align-items: center;
  padding: ${(props) => props.theme.spacing.xl}px;
`;

const IconWrapper = styled.View`
  width: 80px;
  height: 80px;
  justify-content: center;
  align-items: center;
  margin-bottom: ${(props) => props.theme.spacing.lg}px;
`;

const Title = styled.Text`
  font-size: ${(props) => props.theme.fontSize.xl}px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
  text-align: center;
  margin-top: ${(props) => props.theme.spacing.lg}px;
`;

const Message = styled.Text`
  font-size: ${(props) => props.theme.fontSize.f16}px;
  color: ${(props) => props.theme.colors.textSecondary};
  text-align: center;
  margin-top: ${(props) => props.theme.spacing.md}px;
  line-height: 24px;
`;

const LogoutButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  margin-top: ${(props) => props.theme.spacing.xl}px;
  padding: 12px 24px;
  background-color: ${(props) => props.theme.colors.surface};
  border-radius: ${(props) => props.theme.borderRadius.md}px;
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const LogoutText = styled.Text`
  margin-left: 10px;
  color: ${(props) => props.theme.colors.error};
  font-weight: bold;
`;

const PendingApprovalScreen = () => {
  const { theme } = useAppTheme();
  return (
    <Container theme={theme}>
      <IconWrapper theme={theme}>
        <Clock size={80} color={theme.colors.warning} />
      </IconWrapper>
      <Title theme={theme}>Oczekiwanie na zatwierdzenie</Title>
      <Message theme={theme}>
        Twoje konto zostało utworzone, ale musi zostać aktywowane przez Dyrektora. Powiadomimy Cię,
        gdy będziesz mógł się zalogować.
      </Message>

      <LogoutButton theme={theme} onPress={() => signOut(auth)}>
        <LogOut size={20} color={theme.colors.error} />
        <LogoutText theme={theme}>Wyloguj się</LogoutText>
      </LogoutButton>
    </Container>
  );
};

export default PendingApprovalScreen;
