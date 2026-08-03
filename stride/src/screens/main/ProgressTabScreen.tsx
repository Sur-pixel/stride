import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components';
import { MetricCard } from '../../components/MetricCard';
import { StatusDotRow } from '../../components/MissionRow';
import { useSemester } from '../../context/SemesterContext';
import { colors, radii, spacing, typography } from '../../theme';

export function ProgressTabScreen() {
  const { bundle, snapshot, isLoading, error } = useSemester();

  if (isLoading && !bundle) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

  if (error || !bundle || !snapshot) {
    return (
      <Screen>
        <Text style={styles.errorTitle}>Progress unavailable</Text>
        <Text style={styles.errorBody}>
          {error ?? 'No active semester found.'}
        </Text>
      </Screen>
    );
  }

  const { timeline, gym, study } = snapshot;

  return (
    <Screen contentStyle={styles.content}>
      <Text style={styles.eyebrow}>THIS SEMESTER</Text>
      <Text style={styles.title}>Progress</Text>
      <Text style={styles.subtitle}>
        Week {timeline.weekNumber} of {timeline.totalWeeks} ·{' '}
        {timeline.daysRemaining} days remaining
      </Text>

      {gym ? (
        <MetricCard
          title="Gym"
          percent={gym.percent}
          ringColor={colors.gym}
          currentLabel={`${gym.current} / ${gym.goal}`}
          statusColor={gym.tone === 'behind' ? colors.danger : colors.success}
          statusLabel={gym.statusLabel}
        />
      ) : null}

      {study ? (
        <MetricCard
          title="Study"
          percent={study.percent}
          ringColor={colors.study}
          currentLabel={`${study.current} / ${study.goal} sessions`}
          statusColor={study.tone === 'behind' ? colors.danger : colors.success}
          statusLabel={study.statusLabel}
        />
      ) : null}

      {/* Grades are not in the current schema — keep layout space only if added later. */}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pace</Text>
        <View style={styles.paceList}>
          {gym ? (
            <View style={styles.paceItem}>
              <StatusDotRow
                color={gym.tone === 'behind' ? colors.danger : colors.success}
                label="Gym"
                emphasis
              />
              <Text style={styles.paceSub}>{gym.statusLabel}</Text>
            </View>
          ) : null}
          {study ? (
            <View style={styles.paceItem}>
              <StatusDotRow
                color={study.tone === 'behind' ? colors.danger : colors.success}
                label="Study"
                emphasis
              />
              <Text style={styles.paceSub}>{study.statusLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
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
    marginBottom: spacing.sm,
  },
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
  cardTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  paceList: {
    gap: spacing.lg,
  },
  paceItem: {
    gap: spacing.xs,
  },
  paceSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.lg + 8,
  },
  errorTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  errorBody: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
