import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedCard, Screen } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { useSemester } from '../../context/SemesterContext';
import { useInvitations } from '../../context/InvitationsContext';
import {
  fetchPartnerProfile,
} from '../../services/semesterService';
import { unpairPartner } from '../../services/invitationService';
import { colors, radii, spacing, typography } from '../../theme';
import { Profile } from '../../types/database';

const PREFS_KEY = 'stride.settings.prefs';

type Prefs = {
  dailyReminder: boolean;
  sharePace: boolean;
};

const defaultPrefs: Prefs = {
  dailyReminder: true,
  sharePace: true,
};

export function SettingsTabScreen() {
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { bundle } = useSemester();
  const { refresh: refreshInvitations } = useInvitations();
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [unpairing, setUnpairing] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(PREFS_KEY).then((raw) => {
      if (!raw) return;
      try {
        setPrefs({ ...defaultPrefs, ...(JSON.parse(raw) as Prefs) });
      } catch {
        // ignore corrupt prefs
      }
    });
  }, []);

  useEffect(() => {
    if (!profile?.partner_id) {
      setPartner(null);
      return;
    }
    void fetchPartnerProfile(profile.partner_id)
      .then(setPartner)
      .catch(() => setPartner(null));
  }, [profile?.partner_id]);

  const updatePref = async (key: keyof Prefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
  };

  const weeklyStudySessions = useMemo(() => {
    if (!bundle) return 0;
    const total = bundle.courses.reduce((s, c) => s + c.total_sessions, 0);
    if (total === 0) return 0;
    const start = new Date(`${bundle.semester.start_date}T12:00:00`);
    const end = new Date(`${bundle.semester.end_date}T12:00:00`);
    const dayMs = 1000 * 60 * 60 * 24;
    const days = Math.round((end.getTime() - start.getTime()) / dayMs) + 1;
    const weeks = Math.max(1, Math.ceil(days / 7));
    return Math.round(total / weeks);
  }, [bundle]);

  const hasGym = Boolean(bundle?.gymSchedule);
  const hasStudy = Boolean(bundle?.courses.length);

  const partnerFirstName = partner?.name?.split(' ')[0] ?? null;
  const shareLabel = partnerFirstName
    ? `Share pace with ${partnerFirstName}`
    : 'Share pace with partner';

  const handleUnpair = () => {
    Alert.alert(
      'Unpair partner?',
      'You will lose the shared dashboard until you pair again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpair',
          style: 'destructive',
          onPress: async () => {
            setUnpairing(true);
            try {
              await unpairPartner();
              await refreshInvitations();
            } finally {
              setUnpairing(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Screen contentStyle={styles.content}>
      <Text style={styles.eyebrow}>YOUR SETUP</Text>
      <Text style={styles.title}>Settings</Text>

      <AnimatedCard delay={40} style={styles.card}>
        <Text style={styles.sectionTitle}>Weekly goals</Text>
        {hasGym && bundle?.gymSchedule ? (
          <SettingsRow
            tint={colors.gym}
            label="Gym"
            value={`${bundle.gymSchedule.days_per_week} / week`}
            last={!hasStudy}
          />
        ) : null}
        {hasStudy ? (
          <SettingsRow
            tint={colors.study}
            label="Study"
            value={`${weeklyStudySessions} sessions / week`}
            last
          />
        ) : null}
        {!hasGym && !hasStudy ? (
          <Text style={styles.empty}>No weekly goals for this semester.</Text>
        ) : null}
      </AnimatedCard>

      {hasStudy && bundle ? (
        <AnimatedCard delay={80} style={styles.card}>
          <Text style={styles.sectionTitle}>Course load</Text>
          {bundle.courses.map((course, i) => (
            <View
              key={course.id}
              style={[
                styles.courseRow,
                i < bundle.courses.length - 1 ? styles.rowBorder : null,
              ]}
            >
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{course.difficulty_rank}</Text>
              </View>
              <View style={styles.courseCopy}>
                <Text style={styles.rowLabel}>{course.name}</Text>
                <Text style={styles.courseSub}>
                  {course.sessions_completed} / {course.total_sessions} sessions
                </Text>
              </View>
            </View>
          ))}
        </AnimatedCard>
      ) : null}

      <AnimatedCard delay={120} style={styles.card}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <PreferenceRow
          title="Daily reminder"
          subtitle="One nudge each morning"
          value={prefs.dailyReminder}
          onValueChange={(value) => void updatePref('dailyReminder', value)}
        />
        <PreferenceRow
          title={shareLabel}
          subtitle="Percentages only"
          value={prefs.sharePace}
          onValueChange={(value) => void updatePref('sharePace', value)}
          last
        />
      </AnimatedCard>

      <AnimatedCard delay={160} style={styles.card}>
        <Text style={styles.sectionTitle}>Partner</Text>
        {profile?.partner_id ? (
          <>
            <View style={styles.partnerRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(partnerFirstName?.[0] ?? 'P').toUpperCase()}
                </Text>
              </View>
              <View style={styles.partnerCopy}>
                <Text style={styles.partnerName}>
                  {partner?.name ?? 'Connected partner'}
                </Text>
                <Text style={styles.partnerMeta}>
                  {partner?.created_at
                    ? `Paired since ${formatPairedSince(partner.created_at)}`
                    : 'Accountability partner'}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textTertiary}
              />
            </View>
            <Pressable
              onPress={handleUnpair}
              disabled={unpairing}
              style={({ pressed }) => [
                styles.unpair,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.unpairText}>
                {unpairing ? 'Unpairing…' : 'Unpair partner'}
              </Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.empty}>
            No partner yet. Invite one from the Friend tab.
          </Text>
        )}
      </AnimatedCard>

      <Pressable
        onPress={() => void signOut()}
        style={({ pressed }) => [
          styles.signOut,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </Screen>
  );
}

function formatPairedSince(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'recently';
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function SettingsRow({
  tint,
  label,
  value,
  last = false,
}: {
  tint: string;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last ? null : styles.rowBorder]}>
      <View style={styles.rowDot}>
        <View style={[styles.rowDotInner, { backgroundColor: tint }]} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </View>
  );
}

function PreferenceRow({
  title,
  subtitle,
  value,
  onValueChange,
  last = false,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.prefRow, last ? null : styles.rowBorder]}>
      <View style={styles.prefCopy}>
        <Text style={styles.prefTitle}>{title}</Text>
        <Text style={styles.prefSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.textPrimary }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  eyebrow: {
    ...typography.section,
    color: colors.textSecondary,
  },
  title: {
    ...typography.hero,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  card: {
    padding: spacing.xxl,
    paddingVertical: spacing.xl,
  },
  sectionTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowDot: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowDotInner: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
  },
  rowLabel: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  rowValue: {
    ...typography.body,
    color: colors.textSecondary,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  courseCopy: {
    flex: 1,
    gap: 2,
  },
  courseSub: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  prefCopy: {
    flex: 1,
    gap: 2,
  },
  prefTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  prefSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
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
  partnerCopy: {
    flex: 1,
    gap: 2,
  },
  partnerName: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  partnerMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  unpair: {
    alignSelf: 'flex-start',
    paddingTop: spacing.md,
  },
  unpairText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.danger,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    paddingVertical: spacing.sm,
  },
  signOut: {
    alignSelf: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  pressed: {
    opacity: 0.6,
  },
  signOutText: {
    ...typography.button,
    color: colors.danger,
  },
});
