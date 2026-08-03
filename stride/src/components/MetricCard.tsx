import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import { ProgressRing } from './ProgressRing';
import { StatusDotRow } from './MissionRow';

type MetricCardProps = {
  title: string;
  percent: number;
  ringColor: string;
  currentLabel: string;
  statusColor: string;
  statusLabel: string;
};

export function MetricCard({
  title,
  percent,
  ringColor,
  currentLabel,
  statusColor,
  statusLabel,
}: MetricCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <ProgressRing percent={percent} color={ringColor} />
        <View style={styles.meta}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.values}>{currentLabel}</Text>
          <Text style={styles.caption}>Current / Goal</Text>
        </View>
      </View>
      <StatusDotRow color={statusColor} label={statusLabel} />
    </View>
  );
}

type CompareCardProps = {
  title: string;
  deltaLabel: string;
  deltaTone: 'ahead' | 'behind' | 'neutral';
  youPercent: number;
  partnerPercent: number;
  youColor: string;
  partnerColor: string;
  partnerName: string;
};

export function CompareCard({
  title,
  deltaLabel,
  deltaTone,
  youPercent,
  partnerPercent,
  youColor,
  partnerColor,
  partnerName,
}: CompareCardProps) {
  const badgeBg =
    deltaTone === 'ahead'
      ? colors.successSoft
      : deltaTone === 'behind'
        ? colors.dangerSoft
        : colors.inputBackground;
  const badgeColor =
    deltaTone === 'ahead'
      ? colors.success
      : deltaTone === 'behind'
        ? colors.danger
        : colors.textSecondary;

  return (
    <View style={styles.card}>
      <View style={styles.compareHeader}>
        <View style={styles.compareCopy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.compareSubtitle}>{deltaLabel}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>
            {deltaTone === 'ahead' ? '+' : deltaTone === 'behind' ? '' : ''}
            {Math.abs(youPercent - partnerPercent)}%
          </Text>
        </View>
      </View>
      <View style={styles.compareRings}>
        <View style={styles.compareItem}>
          <ProgressRing percent={youPercent} color={youColor} size={96} />
          <Text style={styles.compareLabel}>YOU</Text>
        </View>
        <View style={styles.compareItem}>
          <ProgressRing percent={partnerPercent} color={partnerColor} size={96} />
          <Text style={styles.compareLabel}>{partnerName.toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    padding: spacing.xxl,
    gap: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  meta: {
    flex: 1,
    gap: 4,
  },
  title: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  values: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  caption: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  compareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  compareCopy: {
    flex: 1,
    gap: 4,
  },
  compareSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  badge: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
  },
  compareRings: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
  },
  compareItem: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  compareLabel: {
    ...typography.section,
    color: colors.textSecondary,
  },
});
