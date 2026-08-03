import { StyleSheet, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '../components';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { AuthNavigator } from './AuthNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { AuthLoadingScreen } from '../screens/AuthLoadingScreen';
import { colors, spacing, typography } from '../theme';

export type RootStackParamList = {
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function ProfileErrorScreen({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.errorScreen}>
      <Text style={styles.errorTitle}>Couldn't load profile</Text>
      <Text style={styles.errorBody}>{message}</Text>
      <Button title="Try Again" onPress={onRetry} />
    </View>
  );
}

export function RootNavigator() {
  const { session, isLoading: authLoading } = useAuth();
  const {
    profile,
    isLoading: profileLoading,
    error: profileError,
    refreshProfile,
  } = useProfile();

  if (authLoading) {
    return <AuthLoadingScreen />;
  }

  if (!session) {
    return <AuthNavigator />;
  }

  if (profileLoading || (!profile && !profileError)) {
    return <AuthLoadingScreen />;
  }

  if (profileError || !profile) {
    return (
      <ProfileErrorScreen
        message={
          profileError ??
          'Your profile could not be loaded. Confirm the database migration has been applied.'
        }
        onRetry={() => void refreshProfile()}
      />
    );
  }

  if (!profile.onboarding_complete) {
    return <OnboardingNavigator />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Main" component={MainTabNavigator} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: spacing.screen,
    gap: spacing.lg,
  },
  errorTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  errorBody: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
});
