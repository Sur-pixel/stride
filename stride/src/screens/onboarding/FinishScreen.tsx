import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Button,
  Card,
  ErrorMessage,
  OnboardingHeader,
  Screen,
} from '../../components';
import {
  getSemesterDurationLabel,
  useOnboarding,
} from '../../context/OnboardingContext';
import { colors, spacing, typography } from '../../theme';

function formatDisplayDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function FinishScreen() {
  const { data, completeOnboarding } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tracksLabel = data.tracks
    .map((track) => (track === 'gym' ? 'Gym' : 'Study'))
    .join(' · ');

  const durationLabel = getSemesterDurationLabel(
    data.semesterStartDate,
    data.semesterEndDate,
  );

  const handleFinish = async () => {
    setError(null);
    setLoading(true);

    const { error: saveError } = await completeOnboarding();

    if (saveError) {
      setError(saveError);
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  return (
    <Screen contentStyle={styles.content}>
      <OnboardingHeader
        stepLabel="Finish"
        title="You're ready to stride"
        subtitle="Review your setup, then save it to start tracking."
      />

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Your setup</Text>
        <View style={styles.rows}>
          <SummaryRow label="Tracking" value={tracksLabel || '—'} />
          <SummaryRow
            label="Semester"
            value={data.semesterName.trim() || '—'}
          />
          <SummaryRow
            label="Dates"
            value={`${formatDisplayDate(data.semesterStartDate)} → ${formatDisplayDate(data.semesterEndDate)}`}
          />
          {durationLabel ? (
            <SummaryRow label="Duration" value={durationLabel} />
          ) : null}
          {data.tracks.includes('study') ? (
            <>
              <SummaryRow
                label="Courses"
                value={data.courseNames.filter(Boolean).join(', ') || '—'}
              />
              <SummaryRow
                label="Sessions"
                value={`${data.studySessionsPerWeek} / week`}
              />
            </>
          ) : null}
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
        </View>
      </Card>

      <ErrorMessage message={error} />

      <Button
        title="Finish"
        onPress={() => void handleFinish()}
        loading={loading}
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
    marginBottom: spacing.lg,
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
    marginTop: spacing.xl,
  },
});
