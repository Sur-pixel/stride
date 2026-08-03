import { StyleSheet, Text, View } from 'react-native';
import {
  Button,
  Card,
  OnboardingHeader,
  Screen,
} from '../../components';
import { useOnboarding } from '../../context/OnboardingContext';
import { colors, spacing, typography } from '../../theme';

export function FinishScreen() {
  const { data, completeOnboarding } = useOnboarding();

  const tracksLabel = data.tracks
    .map((track) => (track === 'gym' ? 'Gym' : 'Study'))
    .join(' · ');

  return (
    <Screen contentStyle={styles.content}>
      <OnboardingHeader
        stepLabel="All set"
        title="You're ready to stride"
        subtitle="Your preferences are saved for this session. Home is next."
      />

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Your setup</Text>
        <View style={styles.rows}>
          <SummaryRow label="Tracking" value={tracksLabel || '—'} />
          {data.tracks.includes('gym') ? (
            <SummaryRow
              label="Gym days"
              value={
                data.gymDaysPerWeek
                  ? `${data.gymDaysPerWeek}x · ${data.workoutDays.join(', ')}`
                  : '—'
              }
            />
          ) : null}
          {data.tracks.includes('study') ? (
            <>
              <SummaryRow
                label="Courses"
                value={String(data.courseLoad ?? '—')}
              />
              <SummaryRow
                label="Sessions"
                value={`${data.studySessionsPerWeek} / week`}
              />
              <SummaryRow
                label="Course names"
                value={data.courseNames.filter(Boolean).join(', ') || '—'}
              />
            </>
          ) : null}
        </View>
      </Card>

      <Button
        title="Go to Home"
        onPress={completeOnboarding}
        style={styles.button}
      />
    </Screen>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  card: {
    gap: spacing.lg,
  },
  cardTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  rows: {
    gap: spacing.lg,
  },
  row: {
    gap: spacing.xs,
  },
  rowLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  rowValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  button: {
    marginTop: spacing.xxxl,
  },
});
