import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import { AnimatedCard } from './AnimatedCard';
import { ProgressRing } from './ProgressRing';

type MetricCardProps = {
  title: string;
  percent: number;
  ringColor: string;
  currentLabel: string;
  statusColor: string;
  statusLabel: string;
  delay?: number;
};

export function MetricCard({
  title,
  percent,
  ringColor,
  currentLabel,
  statusColor,
  statusLabel,
  delay = 0,
}: MetricCardProps) {
  return (
    <AnimatedCard delay={delay} style={styles.card}>
      <View style={styles.top}>
        <ProgressRing percent={percent} color={ringColor} size={104} strokeWidth={10} />
        <View style={styles.meta}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.values}>{currentLabel}</Text>
          <Text style={styles.caption}>Current / Goal</Text>
        </View>
      </View>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={styles.statusLabel}>{statusLabel}</Text>
      </View>
    </AnimatedCard>
  );
}

type CompareCardProps = {
  title: string;
  deltaLabel: string;
  deltaTone: 'ahead' | 'behind' | 'neutral';
  deltaPercent: number | null;
  youPercent: number;
  partnerPercent: number | null;
  youColor: string;
  partnerColor: string;
  partnerName: string;
  delay?: number;
};

export function CompareCard({
  title,
  deltaLabel,
  deltaTone,
  deltaPercent,
  youPercent,
  partnerPercent,
  youColor,
  partnerColor,
  partnerName,
  delay = 0,
}: CompareCardProps) {
  const showDelta = deltaPercent !== null;
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
  const sign = deltaTone === 'ahead' ? '+' : deltaTone === 'behind' ? '−' : '';

  return (
    <AnimatedCard delay={delay} style={styles.card}>
      <View style={styles.compareHeader}>
        <View style={styles.compareCopy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.compareSubtitle}>{deltaLabel}</Text>
        </View>
        {showDelta ? (
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>
              {sign}
              {Math.abs(deltaPercent ?? 0)}%
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.compareRings}>
        <View style={styles.compareItem}>
          <ProgressRing percent={youPercent} color={youColor} size={96} />
          <Text style={styles.compareLabel}>YOU</Text>
        </View>
        <View style={styles.compareItem}>
          {partnerPercent !== null ? (
            <ProgressRing
              percent={partnerPercent}
              color={partnerColor}
              size={96}
            />
          ) : (
            <View style={styles.placeholderRing}>
              <Text style={styles.placeholderText}>—</Text>
            </View>
          )}
          <Text style={styles.compareLabel}>{partnerName.toUpperCase()}</Text>
        </View>
      </View>
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  values: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  caption: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  statusLabel: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.textPrimary,
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
  placeholderRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 9,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  placeholderText: {
    ...typography.title,
    color: colors.textTertiary,
  },
});
