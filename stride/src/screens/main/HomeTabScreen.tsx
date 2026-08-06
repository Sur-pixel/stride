import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { AnimatedCard, AnimatedNumber, Screen } from '../../components';
import { MissionRow, StatusDotRow, WeekPill } from '../../components/MissionRow';
import { useProfile } from '../../context/ProfileContext';
import { useSemester } from '../../context/SemesterContext';
import { colors, radii, spacing, typography } from '../../theme';
import type { MainTabParamList } from '../../navigation/MainTabNavigator';
import {
  diffDays,
  formatLongDate,
  getGreeting,
  overallPaceLabel,
  parseIsoDate,
  startOfDay,
} from '../../utils/progressMath';

const COURSE_COLORS = [
  colors.study,
  colors.gym,
  colors.grades,
  colors.partner,
  colors.accent,
];

export function HomeTabScreen() {
  const { profile } = useProfile();
  const {
    bundle,
    snapshot,
    upcoming,
    isLoading,
    error,
    refresh,
    setGymCompletedToday,
    completeSession,
    undoSession,
  } = useSemester();
  const [pending, setPending] = useState(false);
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();

  const today = useMemo(() => new Date(), []);
  const greeting = getGreeting(today);

  const pace = useMemo(() => {
    if (!snapshot) return { title: 'On Pace', tone: 'on_pace' as const };
    return overallPaceLabel([snapshot.gym, ...snapshot.perCourse]);
  }, [snapshot]);

  const toggleGym = async () => {
    if (!snapshot) return;
    setPending(true);
    try {
      await setGymCompletedToday(!snapshot.todayGymDone);
    } finally {
      setPending(false);
    }
  };

  const toggleSession = async (courseId: string, wasCompleted: boolean) => {
    setPending(true);
    try {
      if (wasCompleted) {
        await undoSession(courseId);
      } else {
        await completeSession(courseId);
      }
    } finally {
      setPending(false);
    }
  };

  if (isLoading && !bundle && !upcoming) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

  if (!bundle) {
    // No current semester — either between semesters or before first starts.
    return (
      <BetweenSemestersView
        upcoming={upcoming}
        today={today}
        error={error}
        onRefresh={() => void refresh()}
      />
    );
  }

  if (!snapshot) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

  const weekLabel = `WEEK ${snapshot.timeline.weekNumber} OF ${snapshot.timeline.totalWeeks}`;
  const paceTone = pace.tone;
  const paceOrbBg =
    paceTone === 'behind' ? colors.dangerSoft : colors.successSoft;
  const paceDotColor =
    paceTone === 'behind' ? colors.danger : colors.success;

  const gymDoneOrOff = !snapshot.todayIsGymDay || snapshot.todayGymDone;
  const missionsAllDone = snapshot.todayMissions.every((m) => m.completed);
  const allDoneToday = gymDoneOrOff && missionsAllDone;

  const tip = buildTip(paceTone, allDoneToday);

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.date}>{formatLongDate(today)}</Text>
        <WeekPill label={weekLabel} />
      </View>
      <Text style={styles.greeting}>{greeting}</Text>

      <AnimatedCard delay={40} style={styles.card}>
        <Text style={styles.cardTitle}>Today's Mission</Text>
        <View style={styles.missionList}>
          {snapshot.todayIsGymDay && bundle.gymSchedule ? (
            <MissionRow
              title="Gym"
              subtitle={`${bundle.gymSchedule.days_per_week} days / week`}
              dotColor={colors.gym}
              completed={snapshot.todayGymDone}
              onToggle={() => {
                if (!pending) void toggleGym();
              }}
            />
          ) : null}
          {snapshot.todayMissions.map((mission) => {
            const rank = mission.difficultyRank;
            const color = COURSE_COLORS[(rank - 1) % COURSE_COLORS.length];
            return (
              <MissionRow
                key={`${mission.courseId}-${mission.completed ? 'done' : 'todo'}`}
                title={mission.courseName}
                subtitle="1 session"
                dotColor={color}
                completed={mission.completed}
                onToggle={() => {
                  if (!pending) void toggleSession(mission.courseId, mission.completed);
                }}
              />
            );
          })}
          {!snapshot.todayIsGymDay && snapshot.todayMissions.length === 0 ? (
            <Text style={styles.emptyMission}>
              Nothing scheduled for today — rest up.
            </Text>
          ) : null}
        </View>
      </AnimatedCard>

      <AnimatedCard delay={80} style={styles.card}>
        <Text style={styles.eyebrowSm}>You're currently</Text>
        <View style={styles.paceRow}>
          <View style={[styles.paceOrb, { backgroundColor: paceOrbBg }]}>
            <View style={[styles.paceDot, { backgroundColor: paceDotColor }]} />
          </View>
          <Text style={styles.paceTitle}>{pace.title}</Text>
        </View>
        <View style={styles.statusList}>
          {snapshot.gym ? (
            <StatusDotRow
              color={toneColor(snapshot.gym.tone)}
              label={`Gym · ${snapshot.gym.statusLabel}`}
            />
          ) : null}
          {snapshot.perCourse.map((coursePace) => (
            <StatusDotRow
              key={coursePace.course.id}
              color={toneColor(coursePace.tone)}
              label={`${coursePace.course.name} · ${coursePace.statusLabel}`}
            />
          ))}
        </View>
        <Text style={styles.tip}>{tip}</Text>
      </AnimatedCard>

      {profile?.partner_id ? (
        <PartnerSummaryCard
          gymPercent={snapshot.gym?.percent ?? 0}
          studyPercent={snapshot.study?.percent ?? 0}
          gymCurrent={snapshot.gym?.current ?? 0}
          gymGoal={snapshot.gym?.goal ?? 0}
          studyCurrent={snapshot.study?.current ?? 0}
          studyGoal={snapshot.study?.goal ?? 0}
        />
      ) : (
        <InvitePartnerCard onPress={() => navigation.navigate('FriendTab')} />
      )}
    </Screen>
  );
}

function buildTip(
  tone: 'ahead' | 'behind' | 'on_pace',
  allDone: boolean,
): string {
  if (allDone) {
    if (tone === 'behind') {
      return "Today's mission is done — keep chipping away to close the gap.";
    }
    if (tone === 'ahead') {
      return "Today's mission is done — you're ahead of pace.";
    }
    return "Today's mission is done — right on track.";
  }
  if (tone === 'behind') {
    return "You're behind pace — finish today's mission to start closing the gap.";
  }
  if (tone === 'ahead') {
    return "You're ahead — finish today's mission to keep the lead.";
  }
  return "You're on pace — finish today's mission to stay there.";
}

function toneColor(tone: 'ahead' | 'behind' | 'on_pace' | 'neutral'): string {
  if (tone === 'behind') return colors.danger;
  if (tone === 'ahead') return colors.success;
  return colors.success;
}

type BetweenSemestersProps = {
  upcoming: import('../../types/database').Semester | null;
  today: Date;
  error: string | null;
  onRefresh: () => void;
};

function BetweenSemestersView({
  upcoming,
  today,
  error,
  onRefresh,
}: BetweenSemestersProps) {
  if (upcoming) {
    const start = parseIsoDate(upcoming.start_date);
    const daysUntil = Math.max(0, diffDays(startOfDay(today), start));
    return (
      <Screen contentStyle={styles.content}>
        <Text style={styles.eyebrowSm}>UP NEXT</Text>
        <Text style={styles.greeting}>{upcoming.name}</Text>
        <AnimatedCard delay={40} style={styles.card}>
          <Text style={styles.cardTitle}>Starts in</Text>
          <View style={styles.countdownRow}>
            <AnimatedNumber
              value={daysUntil}
              duration={800}
              style={styles.countdownNumber}
            />
            <Text style={styles.countdownUnit}>
              {daysUntil === 1 ? 'day' : 'days'}
            </Text>
          </View>
          <Text style={styles.tip}>
            Your plan is ready. Sessions unlock the moment {upcoming.name} begins.
          </Text>
        </AnimatedCard>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.content}>
      <Text style={styles.eyebrowSm}>NO ACTIVE SEMESTER</Text>
      <Text style={styles.greeting}>Ready when you are</Text>
      <AnimatedCard delay={40} style={styles.card}>
        <Text style={styles.cardTitle}>Plan your next semester</Text>
        <Text style={styles.tip}>
          {error
            ? error
            : "You don't have a semester in progress right now. Set one up to get today's plan."}
        </Text>
        <Pressable onPress={onRefresh} style={styles.retry}>
          <Text style={styles.retryText}>Refresh</Text>
        </Pressable>
      </AnimatedCard>
    </Screen>
  );
}

type PartnerSummaryCardProps = {
  gymPercent: number;
  studyPercent: number;
  gymCurrent: number;
  gymGoal: number;
  studyCurrent: number;
  studyGoal: number;
};

function PartnerSummaryCard({
  gymPercent,
  studyPercent,
  gymCurrent,
  gymGoal,
  studyCurrent,
  studyGoal,
}: PartnerSummaryCardProps) {
  return (
    <AnimatedCard delay={120} style={styles.card}>
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
          <Ionicons name="checkmark" size={14} color={colors.success} />
          <Text style={styles.missionBadgeText}>Connected</Text>
        </View>
      </View>
      <View style={styles.metricRow}>
        <MetricStat
          value={gymPercent}
          color={colors.gym}
          label="Gym"
          sublabel={`${gymCurrent} / ${gymGoal} workouts`}
        />
        <MetricStat
          value={studyPercent}
          color={colors.study}
          label="Study"
          sublabel={`${studyCurrent} / ${studyGoal} sessions`}
        />
      </View>
    </AnimatedCard>
  );
}

function MetricStat({
  value,
  color,
  label,
  sublabel,
}: {
  value: number;
  color: string;
  label: string;
  sublabel: string;
}) {
  return (
    <View style={styles.metricStat}>
      <AnimatedNumber
        value={value}
        suffix="%"
        duration={800}
        style={[styles.metricValue, { color }]}
      />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricSub}>{sublabel}</Text>
    </View>
  );
}

function InvitePartnerCard({ onPress }: { onPress: () => void }) {
  return (
    <AnimatedCard delay={120} style={styles.card}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.inviteInner,
          pressed ? styles.pressed : null,
        ]}
      >
        <View style={styles.inviteIcon}>
          <Ionicons name="person-add-outline" size={22} color={colors.partner} />
        </View>
        <View style={styles.inviteCopy}>
          <Text style={styles.inviteTitle}>Add an accountability partner</Text>
          <Text style={styles.inviteBody}>
            Invite one friend to compare progress and stay honest all semester.
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.textTertiary}
        />
      </Pressable>
    </AnimatedCard>
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
    gap: spacing.lg,
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
  eyebrowSm: {
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
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  countdownNumber: {
    ...typography.hero,
    color: colors.textPrimary,
    fontSize: 56,
    lineHeight: 60,
  },
  countdownUnit: {
    ...typography.title,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  partnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  partnerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  metricStat: {
    flex: 1,
    gap: 2,
  },
  metricValue: {
    ...typography.title,
    fontSize: 26,
    lineHeight: 30,
  },
  metricLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginTop: 2,
  },
  metricSub: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  inviteInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  inviteIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.partnerAvatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteCopy: {
    flex: 1,
    gap: 4,
  },
  inviteTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inviteBody: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.7,
  },
  retry: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  retryText: {
    ...typography.button,
    color: colors.primaryText,
  },
});
