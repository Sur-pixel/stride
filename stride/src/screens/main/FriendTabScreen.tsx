import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AnimatedCard,
  Button,
  ErrorMessage,
  Screen,
  TextInput,
} from '../../components';
import { CompareCard } from '../../components/MetricCard';
import { useProfile } from '../../context/ProfileContext';
import { useSemester } from '../../context/SemesterContext';
import { useInvitations } from '../../context/InvitationsContext';
import {
  fetchPartnerCurrentBundle,
  fetchPartnerProfile,
  SemesterBundle,
} from '../../services/semesterService';
import { colors, radii, spacing, typography } from '../../theme';
import { Profile } from '../../types/database';
import { buildProgressSnapshot, ProgressSnapshot } from '../../utils/progressMath';

export function FriendTabScreen() {
  const { profile } = useProfile();
  const { snapshot, bundle } = useSemester();
  const {
    incomingPending,
    outgoingPending,
    send,
    accept,
    decline,
    cancel,
  } = useInvitations();

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const [partner, setPartner] = useState<Profile | null>(null);
  const [partnerBundle, setPartnerBundle] = useState<SemesterBundle | null>(null);
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partnerError, setPartnerError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.partner_id) {
      setPartner(null);
      setPartnerBundle(null);
      setPartnerError(null);
      return;
    }

    setPartnerLoading(true);
    setPartnerError(null);
    Promise.all([
      fetchPartnerProfile(profile.partner_id),
      fetchPartnerCurrentBundle(profile.partner_id),
    ])
      .then(([p, b]) => {
        setPartner(p);
        setPartnerBundle(b);
      })
      .catch((err) => {
        setPartnerError(
          err instanceof Error ? err.message : 'Could not load partner data.',
        );
      })
      .finally(() => setPartnerLoading(false));
  }, [profile?.partner_id]);

  const handleSend = async () => {
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setSending(true);
    try {
      await send(trimmed);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation.');
    } finally {
      setSending(false);
    }
  };

  const withPendingAction = async (id: string, fn: () => Promise<void>) => {
    setPendingActionId(id);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setPendingActionId(null);
    }
  };

  // Partnered state ─────────────────────────────────────────────────────────
  if (profile?.partner_id) {
    return (
      <PartnerView
        partner={partner}
        partnerBundle={partnerBundle}
        partnerLoading={partnerLoading}
        partnerError={partnerError}
        mySnapshot={snapshot}
        haveOwnBundle={Boolean(bundle)}
      />
    );
  }

  // Incoming invitation state ───────────────────────────────────────────────
  if (incomingPending.length > 0) {
    return (
      <Screen contentStyle={styles.content}>
        <Text style={styles.eyebrow}>INVITATION</Text>
        <Text style={styles.title}>You're invited</Text>
        <Text style={styles.subtitle}>
          Accept to sync dashboards and compare pace all semester.
        </Text>

        {incomingPending.map((invite, i) => (
          <AnimatedCard
            key={invite.id}
            delay={40 + i * 40}
            style={styles.cardGap}
          >
            <View style={styles.pendingHeader}>
              <View style={styles.pendingIcon}>
                <Ionicons name="person" size={22} color={colors.partner} />
              </View>
              <View style={styles.pendingCopy}>
                <Text style={styles.cardTitle}>
                  {invite.from_name ?? 'Someone'} wants to be your partner
                </Text>
                <Text style={styles.body}>
                  You'll share progress percentages until you unpair.
                </Text>
              </View>
            </View>
            <View style={styles.inviteActions}>
              <Button
                title="Accept"
                onPress={() =>
                  void withPendingAction(invite.id, () => accept(invite.id))
                }
                loading={pendingActionId === invite.id}
                style={styles.actionButton}
              />
              <Button
                title="Decline"
                variant="secondary"
                onPress={() =>
                  void withPendingAction(invite.id, () => decline(invite.id))
                }
                style={styles.actionButton}
              />
            </View>
          </AnimatedCard>
        ))}

        <ErrorMessage message={error} />
      </Screen>
    );
  }

  // Outgoing pending state ──────────────────────────────────────────────────
  if (outgoingPending.length > 0) {
    const invite = outgoingPending[0];
    return (
      <Screen contentStyle={styles.content}>
        <Text style={styles.eyebrow}>ACCOUNTABILITY</Text>
        <Text style={styles.title}>Invitation sent</Text>
        <Text style={styles.subtitle}>
          Waiting for {invite.to_email} to accept.
        </Text>

        <AnimatedCard delay={40} style={styles.cardGap}>
          <View style={styles.pendingHeader}>
            <View style={styles.pendingIcon}>
              <Ionicons name="mail-outline" size={22} color={colors.partner} />
            </View>
            <View style={styles.pendingCopy}>
              <Text style={styles.cardTitle}>Pending partner</Text>
              <Text style={styles.body}>
                We'll unlock the comparison dashboard the moment they accept.
              </Text>
            </View>
          </View>
          <Button
            title="Cancel invitation"
            variant="secondary"
            loading={pendingActionId === invite.id}
            onPress={() =>
              void withPendingAction(invite.id, () => cancel(invite.id))
            }
          />
        </AnimatedCard>

        <ErrorMessage message={error} />
      </Screen>
    );
  }

  // Default: send invitation ────────────────────────────────────────────────
  return (
    <Screen contentStyle={styles.content}>
      <Text style={styles.eyebrow}>ACCOUNTABILITY</Text>
      <Text style={styles.title}>Invite a Friend</Text>
      <Text style={styles.subtitle}>
        Add one accountability partner to compare gym and study pace all
        semester.
      </Text>

      <AnimatedCard delay={40} style={styles.cardGap}>
        <View style={styles.inviteHero}>
          <View style={styles.inviteIcon}>
            <Ionicons name="people-outline" size={26} color={colors.partner} />
          </View>
          <View style={styles.inviteCopy}>
            <Text style={styles.cardTitle}>Send an invitation</Text>
            <Text style={styles.body}>
              Enter their email. If they've already signed up they'll see the
              invitation instantly; otherwise it'll appear the moment they join.
            </Text>
          </View>
        </View>

        <TextInput
          label="Partner email"
          value={email}
          onChangeText={setEmail}
          placeholder="friend@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
        />

        <ErrorMessage message={error} />

        <Button
          title="Send Invitation"
          onPress={() => void handleSend()}
          loading={sending}
        />
      </AnimatedCard>
    </Screen>
  );
}

type PartnerViewProps = {
  partner: Profile | null;
  partnerBundle: SemesterBundle | null;
  partnerLoading: boolean;
  partnerError: string | null;
  mySnapshot: ProgressSnapshot | null;
  haveOwnBundle: boolean;
};

function PartnerView({
  partner,
  partnerBundle,
  partnerLoading,
  partnerError,
  mySnapshot,
  haveOwnBundle,
}: PartnerViewProps) {
  const partnerFirst = partner?.name?.split(' ')[0] ?? 'Partner';

  const partnerSnapshot: ProgressSnapshot | null = partnerBundle
    ? buildProgressSnapshot(partnerBundle)
    : null;

  if (partnerLoading && !partnerBundle) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </Screen>
    );
  }

  const timeline = mySnapshot?.timeline;

  return (
    <Screen contentStyle={styles.content}>
      <Text style={styles.eyebrow}>ACCOUNTABILITY</Text>
      <Text style={styles.title}>You & {partnerFirst}</Text>
      <Text style={styles.subtitle}>
        {timeline
          ? `Week ${timeline.weekNumber} of ${timeline.totalWeeks} · ${timeline.daysRemaining} days remaining`
          : 'Connected'}
      </Text>

      {partnerError ? (
        <AnimatedCard delay={40} style={styles.cardGap}>
          <Text style={styles.cardTitle}>Partner data unavailable</Text>
          <Text style={styles.body}>{partnerError}</Text>
        </AnimatedCard>
      ) : null}

      {mySnapshot?.gym ? (
        <CompareCard
          delay={40}
          title="Gym"
          deltaLabel={paceDeltaLabel(
            'workout',
            mySnapshot.gym.percent,
            partnerSnapshot?.gym?.percent ?? null,
            partnerFirst,
          )}
          deltaTone={toneFromDelta(
            mySnapshot.gym.percent,
            partnerSnapshot?.gym?.percent ?? null,
          )}
          deltaPercent={
            partnerSnapshot?.gym
              ? mySnapshot.gym.percent - partnerSnapshot.gym.percent
              : null
          }
          youPercent={mySnapshot.gym.percent}
          partnerPercent={partnerSnapshot?.gym?.percent ?? null}
          youColor={colors.gym}
          partnerColor={colors.partner}
          partnerName={partnerFirst}
        />
      ) : null}

      {mySnapshot?.study ? (
        <CompareCard
          delay={80}
          title="Study"
          deltaLabel={paceDeltaLabel(
            'session',
            mySnapshot.study.percent,
            partnerSnapshot?.study?.percent ?? null,
            partnerFirst,
          )}
          deltaTone={toneFromDelta(
            mySnapshot.study.percent,
            partnerSnapshot?.study?.percent ?? null,
          )}
          deltaPercent={
            partnerSnapshot?.study
              ? mySnapshot.study.percent - partnerSnapshot.study.percent
              : null
          }
          youPercent={mySnapshot.study.percent}
          partnerPercent={partnerSnapshot?.study?.percent ?? null}
          youColor={colors.study}
          partnerColor={colors.partner}
          partnerName={partnerFirst}
        />
      ) : null}

      {!mySnapshot?.gym && !mySnapshot?.study ? (
        <AnimatedCard delay={40} style={styles.cardGap}>
          <Text style={styles.cardTitle}>No tracks to compare yet</Text>
          <Text style={styles.body}>
            {haveOwnBundle
              ? 'Add gym or study in a future semester to unlock comparison.'
              : 'Your comparison unlocks once you have an active semester.'}
          </Text>
        </AnimatedCard>
      ) : null}

      {!partnerSnapshot && !partnerLoading && !partnerError ? (
        <AnimatedCard delay={120} style={styles.cardGap}>
          <Text style={styles.cardTitle}>{partnerFirst} isn't in a semester</Text>
          <Text style={styles.body}>
            Comparison numbers appear once {partnerFirst}'s semester is active.
          </Text>
        </AnimatedCard>
      ) : null}
    </Screen>
  );
}

function toneFromDelta(
  you: number,
  partner: number | null,
): 'ahead' | 'behind' | 'neutral' {
  if (partner === null) return 'neutral';
  const d = you - partner;
  if (d > 0) return 'ahead';
  if (d < 0) return 'behind';
  return 'neutral';
}

function paceDeltaLabel(
  unit: 'workout' | 'session',
  youPercent: number,
  partnerPercent: number | null,
  partnerName: string,
): string {
  if (partnerPercent === null) {
    return `Shared partner pace unlocks once ${partnerName}'s semester is active`;
  }
  const delta = youPercent - partnerPercent;
  if (delta === 0) return `Even with ${partnerName}`;
  const abs = Math.abs(delta);
  return delta > 0
    ? `${abs}% ahead of ${partnerName}`
    : `${abs}% behind ${partnerName}`;
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
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  cardGap: {
    gap: spacing.lg,
  },
  cardTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
  inviteHero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  inviteIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.partnerAvatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  pendingIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.partnerAvatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});
