import React, { useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Text as RNText,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import styled from 'styled-components/native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
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
  max-width: 420px;
  width: 100%;
  align-self: center;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 15px;
  elevation: 5;
`;

const LogoContainer = styled.View`
  align-items: center;
  margin-bottom: 40px;
`;

const Logo = styled.Image`
  width: 280px;
  height: 80px;
  resize-mode: contain;
`;

const Input = styled.TextInput`
  background-color: #f8f9fa;
  padding: 14px 16px;
  border-radius: ${(props) => props.theme.borderRadius.md}px;
  margin-bottom: ${(props) => props.theme.spacing.md}px;
  border: 1px solid ${(props) => props.theme.colors.border};
  font-size: 16px;
`;

const Button = styled.TouchableOpacity`
  background-color: ${(props) => props.theme.colors.primary};
  padding: 16px;
  border-radius: ${(props) => props.theme.borderRadius.md}px;
  align-items: center;
  margin-top: ${(props) => props.theme.spacing.sm}px;
`;

const ButtonText = styled(RNText)`
  color: white;
  font-size: 16px;
  font-weight: bold;
`;

const LinkText = styled(RNText)`
  color: ${(props) => props.theme.colors.primary};
  text-align: center;
  font-weight: 500;
`;

const LoginScreen = ({ navigation }: { navigation: { navigate: (screen: string) => void } }) => {
  const { theme } = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      notify.error('Proszę wypełnić wszystkie pola');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      notify.success('Zalogowano pomyślnie');
    } catch (error: unknown) {
      notify.error('Nieprawidłowy e-mail lub hasło');
      console.error(error);
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
          <LogoContainer>
            <Logo source={require('../../assets/velder.png')} />
          </LogoContainer>

          <Input
            theme={theme}
            placeholder="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor="#999"
          />
          <Input
            theme={theme}
            placeholder="Hasło"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#999"
          />
          <Button theme={theme} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <ButtonText theme={theme}>Zaloguj się</ButtonText>
            )}
          </Button>

          <TouchableOpacity
            style={{ marginTop: 25 }}
            onPress={() => navigation.navigate('Register')}
          >
            <LinkText theme={theme}>Nie masz konta? Zarejestruj się</LinkText>
          </TouchableOpacity>
        </Card>
      </ScrollContainer>
    </Container>
  );
};

export default LoginScreen;
