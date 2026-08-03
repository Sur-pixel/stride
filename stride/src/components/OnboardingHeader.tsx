import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

type OnboardingHeaderProps = {
  stepLabel: string;
  title: string;
  subtitle: string;
};

export function OnboardingHeader({
  stepLabel,
  title,
  subtitle,
}: OnboardingHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.step}>{stepLabel}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  step: {
    ...typography.section,
    color: colors.textSecondary,
  },
  title: {
    ...typography.hero,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
