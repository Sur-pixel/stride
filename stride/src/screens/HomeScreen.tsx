import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Screen } from '../components';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, typography } from '../theme';

export function HomeScreen() {
  const { user, signOut } = useAuth();
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email ||
    'there';

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <Text style={styles.eyebrow}>STRIDE</Text>
      <Text style={styles.title}>You're in</Text>
      <Text style={styles.subtitle}>Welcome back, {displayName}.</Text>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Session active</Text>
        <Text style={styles.cardBody}>
          Your account is authenticated and will stay signed in on this device.
        </Text>
        <Button title="Sign Out" onPress={() => void signOut()} style={styles.button} />
      </Card>
    </Screen>
  );
}

export function AuthLoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.textPrimary} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
  },
  eyebrow: {
    ...typography.section,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.hero,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xxxl,
  },
  card: {
    gap: spacing.md,
  },
  cardTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  cardBody: {
    ...typography.body,
    color: colors.textSecondary,
  },
  button: {
    marginTop: spacing.sm,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
