import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

type MissionRowProps = {
  title: string;
  subtitle: string;
  dotColor: string;
  completed: boolean;
  onToggle: () => void;
};

export function MissionRow({
  title,
  subtitle,
  dotColor,
  completed,
  onToggle,
}: MissionRowProps) {
  return (
    <Pressable onPress={onToggle} style={styles.row}>
      <View style={[styles.checkbox, completed ? styles.checkboxDone : null]}>
        {completed ? <View style={styles.checkMark} /> : null}
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, completed ? styles.titleDone : null]}>
          {title}
        </Text>
        <View style={styles.subtitleRow}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
    </Pressable>
  );
}

type StatusDotRowProps = {
  color: string;
  label: string;
  emphasis?: boolean;
};

export function StatusDotRow({
  color,
  label,
  emphasis = false,
}: StatusDotRowProps) {
  return (
    <View style={styles.statusRow}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusLabel, emphasis ? styles.statusEmphasis : null]}>
        {label}
      </Text>
    </View>
  );
}

export function WeekPill({ label }: { label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.textPrimary,
  },
  checkMark: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.primaryText,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  titleDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  statusLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  statusEmphasis: {
    fontWeight: '600',
  },
  pill: {
    backgroundColor: colors.inputBackground,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  pillText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
});
