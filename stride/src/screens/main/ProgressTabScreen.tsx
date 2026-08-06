import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AnimatedCard, Screen } from '../../components';
import { MetricCard } from '../../components/MetricCard';
import { useSemester } from '../../context/SemesterContext';
import { colors, radii, spacing, typography } from '../../theme';
import type { CoursePace, PaceMetric } from '../../utils/progressMath';

const COURSE_COLORS = [
  colors.study,
  colors.gym,
  colors.grades,
  colors.partner,
  colors.accent,
];

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
          {error ?? 'No active semester right now.'}
        </Text>
      </Screen>
    );
  }

  const { timeline, gym, perCourse } = snapshot;
  let cardDelay = 40;

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
          delay={(cardDelay += 40)}
          title="Gym"
          percent={gym.percent}
          ringColor={colors.gym}
          currentLabel={`${gym.current} / ${gym.goal}`}
          statusColor={statusColorFor(gym.tone)}
          statusLabel={gym.statusLabel}
        />
      ) : null}

      {perCourse.map((coursePace, i) => (
        <MetricCard
          key={coursePace.course.id}
          delay={(cardDelay += 40)}
          title={coursePace.course.name}
          percent={coursePace.percent}
          ringColor={COURSE_COLORS[i % COURSE_COLORS.length]}
          currentLabel={`${coursePace.course.sessions_completed} / ${coursePace.course.total_sessions} sessions`}
          statusColor={statusColorFor(coursePace.tone)}
          statusLabel={coursePace.statusLabel}
        />
      ))}

      <AnimatedCard delay={(cardDelay += 40)} style={styles.paceCard}>
        <Text style={styles.cardTitle}>Pace</Text>
        <View style={styles.paceList}>
          {gym ? (
            <PaceRow
              color={statusColorFor(gym.tone)}
              label="Gym"
              sub={gym.statusLabel}
            />
          ) : null}
          {perCourse.map((coursePace, i) => (
            <PaceRow
              key={coursePace.course.id}
              color={COURSE_COLORS[i % COURSE_COLORS.length]}
              label={coursePace.course.name}
              sub={coursePace.statusLabel}
            />
          ))}
        </View>
      </AnimatedCard>
    </Screen>
  );
}

function statusColorFor(
  tone: PaceMetric['tone'] | CoursePace['tone'],
): string {
  if (tone === 'behind') return colors.danger;
  if (tone === 'ahead') return colors.success;
  return colors.success;
}

function PaceRow({
  color,
  label,
  sub,
}: {
  color: string;
  label: string;
  sub: string;
}) {
  return (
    <View style={styles.paceRow}>
      <View style={[styles.paceDot, { backgroundColor: color }]} />
      <View style={styles.paceCopy}>
        <Text style={styles.paceLabel}>{label}</Text>
        <Text style={styles.paceSub}>{sub}</Text>
      </View>
    </View>
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
  paceCard: {
    gap: spacing.lg,
  },
  cardTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  paceList: {
    gap: spacing.lg,
  },
  paceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  paceDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    marginTop: 8,
  },
  paceCopy: {
    flex: 1,
    gap: 2,
  },
  paceLabel: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  paceSub: {
    ...typography.caption,
    color: colors.textSecondary,
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
