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
  Screen,
  TextInput,
} from '../../components';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../navigation/types';
import { spacing } from '../../theme';

type LoginNavigation = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
  const navigation = useNavigation<LoginNavigation>();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setError(null);
    setLoading(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError);
    }

    setLoading(false);
  };

  return (
    <Screen>
      <AuthHeader
        eyebrow="Welcome back"
        title="Sign in"
        subtitle="Continue building your daily rhythm with Stride."
      />

      <Card>
        <View style={styles.form}>
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
            placeholder="Your password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={() => void handleSignIn()}
            editable={!loading}
          />

          <ErrorMessage message={error} />

          <Button
            title="Sign In"
            onPress={() => void handleSignIn()}
            loading={loading}
            style={styles.button}
          />
        </View>
      </Card>

      <AuthFooterLink
        prompt="Don't have an account?"
        actionLabel="Sign Up"
        onPress={() => navigation.navigate('SignUp')}
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
