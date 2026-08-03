import { StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import {
  Card,
  Chip,
  OnboardingFooter,
  OnboardingHeader,
  Screen,
} from '../../components';
import {
  DAYS_OF_WEEK,
  useOnboarding,
} from '../../context/OnboardingContext';
import { getNextOnboardingRoute } from '../../navigation/onboardingFlow';
import { OnboardingStackParamList } from '../../navigation/onboardingTypes';
import { colors, spacing, typography } from '../../theme';

type Navigation = NativeStackNavigationProp<OnboardingStackParamList, 'GymSetup'>;

const DAY_OPTIONS = [2, 3, 4, 5, 6, 7];

export function GymSetupScreen() {
  const navigation = useNavigation<Navigation>();
  const { data, setGymDaysPerWeek, toggleWorkoutDay } = useOnboarding();

  const selectedCount = data.workoutDays.length;
  const targetCount = data.gymDaysPerWeek;
  const canContinue =
    targetCount !== null && selectedCount === targetCount;

  const handleContinue = () => {
    const next = getNextOnboardingRoute('GymSetup', data.tracks);
    if (next) {
      navigation.navigate(next);
    }
  };

  return (
    <Screen>
      <OnboardingHeader
        stepLabel="Gym"
        title="Plan your training week"
        subtitle="Choose how often you train, then pick the days."
      />

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>Days per week</Text>
        <View style={styles.chipRow}>
          {DAY_OPTIONS.map((days) => (
            <Chip
              key={days}
              label={String(days)}
              selected={data.gymDaysPerWeek === days}
              onPress={() => setGymDaysPerWeek(days)}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Workout days</Text>
          <Text style={styles.helper}>
            {targetCount === null
              ? 'Select days per week first'
              : `${selectedCount} of ${targetCount} selected`}
          </Text>
        </View>
        <View style={styles.chipRow}>
          {DAYS_OF_WEEK.map((day) => {
            const selected = data.workoutDays.includes(day);
            const atLimit =
              targetCount !== null &&
              !selected &&
              selectedCount >= targetCount;

            return (
              <Chip
                key={day}
                label={day}
                selected={selected}
                disabled={targetCount === null || atLimit}
                onPress={() => toggleWorkoutDay(day)}
              />
            );
          })}
        </View>
      </Card>

      <OnboardingFooter onPress={handleContinue} disabled={!canContinue} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    gap: spacing.lg,
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  helper: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
