import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import {
  AuthFooterLink,
  AuthHeader,
  Button,
  Card,
  ErrorMessage,
  InfoMessage,
  Screen,
  TextInput,
} from '../../components';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../navigation/types';
import { spacing } from '../../theme';

type SignUpNavigation = NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;

export function SignUpScreen() {
  const navigation = useNavigation<SignUpNavigation>();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreateAccount = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setInfo(null);
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setInfo(null);
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setInfo(null);
      setError('Password must be at least 6 characters.');
      return;
    }

    setError(null);
    setInfo(null);
    setLoading(true);

    const { error: signUpError, needsEmailConfirmation } = await signUp(
      name,
      email,
      password,
    );

    if (signUpError) {
      setError(signUpError);
    } else if (needsEmailConfirmation) {
      setInfo(
        'Account created. Check your email to confirm your account before signing in.',
      );
    }

    setLoading(false);
  };

  return (
    <Screen>
      <AuthHeader
        eyebrow="Get started"
        title="Create account"
        subtitle="Set up your profile and start tracking what matters."
      />

      <Card>
        <View style={styles.form}>
          <TextInput
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            editable={!loading}
          />

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            editable={!loading}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            editable={!loading}
          />

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={() => void handleCreateAccount()}
            editable={!loading}
          />

          <ErrorMessage message={error} />
          <InfoMessage message={info} />

          <Button
            title="Create Account"
            onPress={() => void handleCreateAccount()}
            loading={loading}
            style={styles.button}
          />
        </View>
      </Card>

      <AuthFooterLink
        prompt="Already have an account?"
        actionLabel="Sign In"
        onPress={() => navigation.navigate('Login')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.xl,
  },
  button: {
    marginTop: spacing.sm,
  },
});
