import { StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import {
  Card,
  DateField,
  OnboardingFooter,
  OnboardingHeader,
  Screen,
  TextInput,
} from '../../components';
import {
  getSemesterDurationLabel,
  useOnboarding,
} from '../../context/OnboardingContext';
import { getNextOnboardingRoute } from '../../navigation/onboardingFlow';
import { OnboardingStackParamList } from '../../navigation/onboardingTypes';
import { colors, spacing, typography } from '../../theme';

type Navigation = NativeStackNavigationProp<OnboardingStackParamList, 'Semester'>;

export function SemesterScreen() {
  const navigation = useNavigation<Navigation>();
  const {
    data,
    setSemesterName,
    setSemesterStartDate,
    setSemesterEndDate,
  } = useOnboarding();

  const durationLabel = getSemesterDurationLabel(
    data.semesterStartDate,
    data.semesterEndDate,
  );

  const datesValid =
    !!data.semesterStartDate &&
    !!data.semesterEndDate &&
    data.semesterEndDate >= data.semesterStartDate;

  const canContinue = data.semesterName.trim().length > 0 && datesValid;

  const handleContinue = () => {
    const next = getNextOnboardingRoute('Semester', data.tracks);
    if (next) {
      navigation.navigate(next);
    }
  };

  return (
    <Screen>
      <OnboardingHeader
        stepLabel="Semester"
        title="Set up your semester"
        subtitle="Stride tracks everything inside one active semester."
      />

      <Card style={styles.card}>
        <View style={styles.form}>
          <TextInput
            label="Semester name"
            value={data.semesterName}
            onChangeText={setSemesterName}
            placeholder="e.g. Fall 2026"
            autoCapitalize="words"
            returnKeyType="done"
          />

          <DateField
            label="Start date"
            value={data.semesterStartDate}
            onChange={setSemesterStartDate}
            maximumDate={
              data.semesterEndDate
                ? new Date(`${data.semesterEndDate}T12:00:00`)
                : undefined
            }
          />

          <DateField
            label="End date"
            value={data.semesterEndDate}
            onChange={setSemesterEndDate}
            minimumDate={
              data.semesterStartDate
                ? new Date(`${data.semesterStartDate}T12:00:00`)
                : undefined
            }
          />

          {durationLabel ? (
            <Text style={styles.duration}>Duration: {durationLabel}</Text>
          ) : null}
        </View>
      </Card>

      <OnboardingFooter onPress={handleContinue} disabled={!canContinue} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.xl,
  },
  duration: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
