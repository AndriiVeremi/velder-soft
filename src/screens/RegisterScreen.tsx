import React, { useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Text as RNText,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import styled from 'styled-components/native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAppTheme } from '../context/ThemeContext';
import { notify } from '../utils/notify';

const Container = styled(KeyboardAvoidingView)`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

const ScrollContainer = styled.ScrollView.attrs({
  contentContainerStyle: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
})``;

const Card = styled.View`
  background-color: ${(props) => props.theme.colors.surface};
  padding: ${(props) => props.theme.spacing.xl}px;
  border-radius: ${(props) => props.theme.borderRadius.lg}px;
  max-width: 400px;
  width: 100%;
  align-self: center;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 15px;
  elevation: 5;
`;

const Title = styled(RNText)`
  font-size: 24px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
  text-align: center;
  margin-bottom: ${(props) => props.theme.spacing.xl}px;
`;

const Input = styled.TextInput`
  background-color: ${(props) => props.theme.colors.background};
  padding: ${(props) => props.theme.spacing.md}px;
  border-radius: ${(props) => props.theme.borderRadius.md}px;
  margin-bottom: ${(props) => props.theme.spacing.md}px;
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const Button = styled.TouchableOpacity`
  background-color: ${(props) => props.theme.colors.primary};
  padding: ${(props) => props.theme.spacing.md}px;
  border-radius: ${(props) => props.theme.borderRadius.md}px;
  align-items: center;
`;

const ButtonText = styled(RNText)`
  color: white;
  font-weight: bold;
  font-size: 16px;
`;

const SecondaryButton = styled.TouchableOpacity`
  margin-top: ${(props) => props.theme.spacing.lg}px;
  align-items: center;
`;

const LinkText = styled(RNText)`
  color: ${(props) => props.theme.colors.primary};
`;

const RegisterScreen = ({ navigation }: any) => {
  const { theme } = useAppTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      notify.error('Proszę wypełnić wszystkie pola');
      return;
    }

    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      if (!user) {
        notify.error('Nie udało się utworzyć konta');
        return;
      }

      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        role: 'EMPLOYEE',
        isActive: false,
        createdAt: serverTimestamp(),
      });

      notify.success('Konto zostało utworzone. Poczekaj na aktywację przez Dyrektora.');
    } catch (error: any) {
      console.error(error);
      notify.error('Nie udało się utworzyć konta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      theme={theme}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 50}
    >
      <ScrollContainer>
        <Card theme={theme}>
          <Title theme={theme}>Rejestracja</Title>
          <Input theme={theme} placeholder="Imię i Nazwisko" value={name} onChangeText={setName} />
          <Input
            theme={theme}
            placeholder="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
          <Input
            theme={theme}
            placeholder="Hasło"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button theme={theme} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <ButtonText theme={theme}>Zarejestruj się</ButtonText>
            )}
          </Button>

          <SecondaryButton onPress={() => navigation.goBack()}>
            <LinkText theme={theme}>Masz już konto? Zaloguj się</LinkText>
          </SecondaryButton>
        </Card>
      </ScrollContainer>
    </Container>
  );
};

export default RegisterScreen;
