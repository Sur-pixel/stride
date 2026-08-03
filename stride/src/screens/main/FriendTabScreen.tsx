import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Button,
  ErrorMessage,
  InfoMessage,
  Screen,
  TextInput,
} from '../../components';
import { CompareCard } from '../../components/MetricCard';
import { useProfile } from '../../context/ProfileContext';
import { useSemester } from '../../context/SemesterContext';
import { fetchPartnerProfile } from '../../services/semesterService';
import { colors, radii, spacing, typography } from '../../theme';
import { Profile } from '../../types/database';

const INVITE_STORAGE_KEY = 'stride.partnerInvite';

type InviteDraft = {
  email: string;
  sentAt: string;
};

export function FriendTabScreen() {
  const { profile } = useProfile();
  const { snapshot, bundle } = useSemester();
  const [email, setEmail] = useState('');
  const [invite, setInvite] = useState<InviteDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [partnerError, setPartnerError] = useState<string | null>(null);

  useEffect(() => {
    void AsyncStorage.getItem(INVITE_STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        setInvite(JSON.parse(raw) as InviteDraft);
      } catch {
        // ignore corrupt local invite state
      }
    });
  }, []);

  useEffect(() => {
    if (!profile?.partner_id) {
      setPartner(null);
      setPartnerError(null);
      return;
    }

    void fetchPartnerProfile(profile.partner_id)
      .then((row) => {
        setPartner(row);
        setPartnerError(null);
      })
      .catch((err) => {
        setPartner(null);
        setPartnerError(
          err instanceof Error
            ? err.message
            : 'Partner profile is not readable yet.',
        );
      });
  }, [profile?.partner_id]);

  const handleSendInvite = async () => {
    setError(null);
    setInfo(null);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }

    setSending(true);

    // TODO: Backend invitation — create partner_invitations table + email/RPC.
    // Persist a local waiting state until invitations are implemented.
    const draft: InviteDraft = {
      email: trimmed,
      sentAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(INVITE_STORAGE_KEY, JSON.stringify(draft));
    setInvite(draft);
    setInfo('Invitation saved on this device. Backend delivery is not connected yet.');
    setSending(false);
  };

  const handleClearInvite = async () => {
    await AsyncStorage.removeItem(INVITE_STORAGE_KEY);
    setInvite(null);
    setInfo(null);
  };

  if (profile?.partner_id) {
    const partnerName = partner?.name?.split(' ')[0] ?? 'Partner';
    const youGym = snapshot?.gym?.percent ?? 0;
    const youStudy = snapshot?.study?.percent ?? 0;

    return (
      <Screen contentStyle={styles.content}>
        <Text style={styles.eyebrow}>ACCOUNTABILITY</Text>
        <Text style={styles.title}>You & {partnerName}</Text>
        <Text style={styles.subtitle}>
          {bundle
            ? `Week ${snapshot?.timeline.weekNumber ?? '—'} of ${snapshot?.timeline.totalWeeks ?? '—'} · ${snapshot?.timeline.daysRemaining ?? '—'} days remaining`
            : 'Connected'}
        </Text>

        {partnerError ? (
          <InfoMessage
            message={`Partner linked, but shared progress isn’t readable yet. ${partnerError}`}
          />
        ) : null}

        {snapshot?.gym ? (
          <CompareCard
            title="Gym"
            deltaLabel="Your gym pace this semester"
            deltaTone="neutral"
            youPercent={youGym}
            // TODO: Replace with partner gym percent once partner progress RLS exists.
            partnerPercent={youGym}
            youColor={colors.gym}
            partnerColor={colors.partner}
            partnerName={partnerName}
          />
        ) : null}

        {snapshot?.study ? (
          <CompareCard
            title="Study"
            deltaLabel="Your study pace this semester"
            deltaTone="neutral"
            youPercent={youStudy}
            // TODO: Replace with partner study percent once partner progress RLS exists.
            partnerPercent={youStudy}
            youColor={colors.study}
            partnerColor={colors.partner}
            partnerName={partnerName}
          />
        ) : null}

        {!snapshot?.gym && !snapshot?.study ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No tracks to compare yet</Text>
            <Text style={styles.body}>
              Add gym or study during a future semester setup to unlock comparison.
            </Text>
          </View>
        ) : null}
      </Screen>
    );
  }

  if (invite) {
    return (
      <Screen contentStyle={styles.content}>
        <Text style={styles.eyebrow}>ACCOUNTABILITY</Text>
        <Text style={styles.title}>Invitation sent</Text>
        <Text style={styles.subtitle}>
          Waiting for {invite.email} to accept.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pending partner</Text>
          <Text style={styles.body}>
            We’ll show the comparison dashboard here as soon as you’re connected.
          </Text>
          <InfoMessage message="TODO: Replace local invite state with Supabase invitation records and realtime acceptance." />
          <Button
            title="Cancel invitation"
            variant="secondary"
            onPress={() => void handleClearInvite()}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.content}>
      <Text style={styles.eyebrow}>ACCOUNTABILITY</Text>
      <Text style={styles.title}>Add a friend</Text>
      <Text style={styles.subtitle}>
        Invite an accountability partner to compare gym and study pace.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Send an invitation</Text>
        <Text style={styles.body}>
          Enter their email to invite them to Stride. You’ll both see a shared
          progress dashboard once they accept.
        </Text>

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
        <InfoMessage message={info} />

        <Button
          title="Send Invitation"
          onPress={() => void handleSendInvite()}
          loading={sending}
        />
      </View>
    </Screen>
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
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
