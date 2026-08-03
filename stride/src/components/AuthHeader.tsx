import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

type AuthHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

export function AuthHeader({ eyebrow, title, subtitle }: AuthHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

type AuthFooterLinkProps = {
  prompt: string;
  actionLabel: string;
  onPress: () => void;
};

export function AuthFooterLink({
  prompt,
  actionLabel,
  onPress,
}: AuthFooterLinkProps) {
  return (
    <View style={styles.footer}>
      <Text style={styles.prompt}>{prompt}</Text>
      <Pressable onPress={onPress} hitSlop={8}>
        <Text style={styles.action}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  eyebrow: {
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxl,
  },
  prompt: {
    ...typography.body,
    color: colors.textSecondary,
  },
  action: {
    ...typography.bodyMedium,
    color: colors.accent,
  },
});
