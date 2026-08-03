import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Screen } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { useSemester } from '../../context/SemesterContext';
import { colors, radii, spacing, typography } from '../../theme';
import { weeklyStudyTarget } from '../../utils/progressMath';

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
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);

  useEffect(() => {
    void AsyncStorage.getItem(PREFS_KEY).then((raw) => {
      if (!raw) return;
      try {
        setPrefs({ ...defaultPrefs, ...(JSON.parse(raw) as Prefs) });
      } catch {
        // ignore
      }
    });
  }, []);

  const updatePref = async (key: keyof Prefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
  };

  const gymGoal = bundle?.gymSchedule
    ? `${bundle.gymSchedule.days_per_week} / week`
    : 'Not tracking';
  const studyGoal = bundle?.courses.length
    ? `${weeklyStudyTarget(bundle.courses)} sessions / week`
    : 'Not tracking';

  return (
    <Screen contentStyle={styles.content}>
      <Text style={styles.eyebrow}>YOUR SETUP</Text>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Weekly goals</Text>
        {bundle?.gymSchedule ? (
          <SettingsRow
            tint={colors.gym}
            label="Gym"
            value={gymGoal}
            last={!bundle.courses.length}
          />
        ) : null}
        {bundle?.courses.length ? (
          <SettingsRow tint={colors.study} label="Study" value={studyGoal} last />
        ) : null}
        {!bundle?.gymSchedule && !bundle?.courses.length ? (
          <Text style={styles.empty}>No weekly goals for this semester.</Text>
        ) : null}
        {/* Grades goal omitted — not present in schema */}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <PreferenceRow
          title="Daily reminder"
          subtitle="One nudge each morning"
          value={prefs.dailyReminder}
          onValueChange={(value) => void updatePref('dailyReminder', value)}
        />
        <PreferenceRow
          title={
            profile?.partner_id
              ? 'Share pace with partner'
              : 'Share pace with partner'
          }
          subtitle="Percentages only"
          value={prefs.sharePace}
          onValueChange={(value) => void updatePref('sharePace', value)}
          last
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Partner</Text>
        {profile?.partner_id ? (
          <View style={styles.partnerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>P</Text>
            </View>
            <View style={styles.partnerCopy}>
              <Text style={styles.partnerName}>Connected partner</Text>
              <Text style={styles.partnerMeta}>
                Partner ID linked on your profile
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.empty}>
            No partner yet. Invite someone from the Friend tab.
          </Text>
        )}
      </View>

      <Pressable
        onPress={() => void signOut()}
        style={({ pressed }) => [styles.signOut, pressed ? styles.pressed : null]}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </Screen>
  );
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
      <View style={[styles.icon, { backgroundColor: `${tint}22` }]}>
        <View style={[styles.iconDot, { backgroundColor: tint }]} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
      <Text style={styles.chevron}>›</Text>
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
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.md,
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
  icon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDot: {
    width: 12,
    height: 12,
    borderRadius: radii.full,
  },
  rowLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  rowValue: {
    ...typography.body,
    color: colors.textSecondary,
  },
  chevron: {
    ...typography.title,
    color: colors.textTertiary,
    marginLeft: spacing.xs,
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
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    paddingVertical: spacing.sm,
  },
  signOut: {
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  pressed: {
    opacity: 0.85,
  },
  signOutText: {
    ...typography.button,
    color: colors.danger,
  },
});
