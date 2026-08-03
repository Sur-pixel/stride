import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Screen } from '../../components';
import { MissionRow, StatusDotRow, WeekPill } from '../../components/MissionRow';
import { useProfile } from '../../context/ProfileContext';
import { useSemester } from '../../context/SemesterContext';
import { colors, radii, spacing, typography } from '../../theme';
import {
  formatLongDate,
  getGreeting,
  overallPaceLabel,
} from '../../utils/progressMath';

const COURSE_DOTS = [colors.study, colors.grades, colors.gym, colors.partner];

export function HomeTabScreen() {
  const { profile } = useProfile();
  const {
    bundle,
    snapshot,
    isLoading,
    error,
    refresh,
    setGymCompletedToday,
    setStudySessionsToday,
  } = useSemester();
  const [pending, setPending] = useState(false);

  const today = useMemo(() => new Date(), []);
  const greeting = getGreeting(today);

  const completedSessions = snapshot?.todayProgress?.study_sessions_completed ?? 0;
  const gymDone = snapshot?.todayProgress?.gym_completed ?? false;

  const tip = useMemo(() => {
    if (!bundle || !snapshot) return 'Complete today’s mission to stay on track.';
    if (snapshot.todayIsGymDay && !gymDone) {
      return 'Finish today’s gym session to stay on track.';
    }
    const nextCourse = bundle.courses[completedSessions];
    if (nextCourse) {
      return `Finish today’s ${nextCourse.name} session to stay on track.`;
    }
    return 'Nice work — today’s mission is clear.';
  }, [bundle, snapshot, gymDone, completedSessions]);

  const pace = overallPaceLabel(snapshot?.gym ?? null, snapshot?.study ?? null);

  const toggleGym = async () => {
    setPending(true);
    try {
      await setGymCompletedToday(!gymDone);
    } finally {
      setPending(false);
    }
  };

  const toggleCourse = async (index: number) => {
    setPending(true);
    try {
      const isDone = index < completedSessions;
      const next = isDone ? index : index + 1;
      await setStudySessionsToday(next);
    } finally {
      setPending(false);
    }
  };

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
        <Text style={styles.errorTitle}>Couldn't load your semester</Text>
        <Text style={styles.errorBody}>
          {error ?? 'No active semester found.'}
        </Text>
        <Pressable onPress={() => void refresh()} style={styles.retry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </Screen>
    );
  }

  const weekLabel = `WEEK ${snapshot.timeline.weekNumber} OF ${snapshot.timeline.totalWeeks}`;

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.date}>{formatLongDate(today)}</Text>
        <WeekPill label={weekLabel} />
      </View>
      <Text style={styles.greeting}>{greeting}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Mission</Text>
        <View style={styles.missionList}>
          {snapshot.todayIsGymDay ? (
            <MissionRow
              title="Gym"
              subtitle={`${bundle.gymSchedule?.days_per_week ?? 0} days / week`}
              dotColor={colors.gym}
              completed={gymDone}
              onToggle={() => {
                if (!pending) void toggleGym();
              }}
            />
          ) : null}
          {bundle.courses.map((course, index) => (
            <MissionRow
              key={course.id}
              title={course.name}
              subtitle={`${course.target_study_sessions_per_week} sessions / week`}
              dotColor={COURSE_DOTS[index % COURSE_DOTS.length]}
              completed={index < completedSessions}
              onToggle={() => {
                if (!pending) void toggleCourse(index);
              }}
            />
          ))}
          {!snapshot.todayIsGymDay && bundle.courses.length === 0 ? (
            <Text style={styles.emptyMission}>Nothing scheduled for today.</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.eyebrow}>You're currently</Text>
        <View style={styles.paceRow}>
          <View
            style={[
              styles.paceOrb,
              {
                backgroundColor:
                  pace.tone === 'behind' ? colors.dangerSoft : colors.successSoft,
              },
            ]}
          >
            <View
              style={[
                styles.paceDot,
                {
                  backgroundColor:
                    pace.tone === 'behind' ? colors.danger : colors.success,
                },
              ]}
            />
          </View>
          <Text style={styles.paceTitle}>{pace.title}</Text>
        </View>
        <View style={styles.statusList}>
          {snapshot.gym ? (
            <StatusDotRow
              color={
                snapshot.gym.tone === 'behind' ? colors.danger : colors.success
              }
              label={snapshot.gym.statusLabel}
            />
          ) : null}
          {snapshot.study ? (
            <StatusDotRow
              color={
                snapshot.study.tone === 'behind' ? colors.danger : colors.success
              }
              label={snapshot.study.statusLabel}
            />
          ) : null}
        </View>
        <Text style={styles.tip}>{tip}</Text>
      </View>

      {profile?.partner_id ? (
        <View style={styles.card}>
          <View style={styles.partnerHeader}>
            <View style={styles.partnerIdentity}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>P</Text>
              </View>
              <View>
                <Text style={styles.partnerName}>Partner</Text>
                <Text style={styles.partnerRole}>Accountability partner</Text>
              </View>
            </View>
            <View style={styles.missionBadge}>
              <Text style={styles.missionBadgeText}>Connected</Text>
            </View>
          </View>
          {/* TODO: Partner metrics require partner RLS + shared progress reads */}
          <Text style={styles.partnerHint}>
            Partner comparison unlocks once partner progress sharing is enabled.
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  date: {
    ...typography.section,
    color: colors.textSecondary,
    flex: 1,
  },
  greeting: {
    ...typography.hero,
    color: colors.textPrimary,
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
  missionList: {
    gap: spacing.sm,
  },
  emptyMission: {
    ...typography.body,
    color: colors.textSecondary,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  paceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  paceOrb: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paceDot: {
    width: 12,
    height: 12,
    borderRadius: radii.full,
  },
  paceTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  statusList: {
    gap: spacing.md,
  },
  tip: {
    ...typography.body,
    color: colors.textSecondary,
  },
  partnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partnerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.partnerAvatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.bodyMedium,
    color: colors.partner,
    fontWeight: '700',
  },
  partnerName: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  partnerRole: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  missionBadge: {
    backgroundColor: colors.successSoft,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  missionBadgeText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  partnerHint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  errorTitle: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  errorBody: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  retry: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
  },
  retryText: {
    ...typography.button,
    color: colors.primaryText,
  },
});
