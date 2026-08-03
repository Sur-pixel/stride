import { StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import {
  Card,
  Chip,
  NumberStepper,
  OnboardingFooter,
  OnboardingHeader,
  Screen,
  TextInput,
} from '../../components';
import { CourseLoad, useOnboarding } from '../../context/OnboardingContext';
import { getNextOnboardingRoute } from '../../navigation/onboardingFlow';
import { OnboardingStackParamList } from '../../navigation/onboardingTypes';
import { colors, spacing, typography } from '../../theme';

type Navigation = NativeStackNavigationProp<
  OnboardingStackParamList,
  'StudySetup'
>;

const COURSE_OPTIONS: CourseLoad[] = [3, 4, 5];

export function StudySetupScreen() {
  const navigation = useNavigation<Navigation>();
  const {
    data,
    setCourseLoad,
    setCourseName,
    setStudySessionsPerWeek,
  } = useOnboarding();

  const canContinue =
    data.courseLoad !== null &&
    data.courseNames.length === data.courseLoad &&
    data.courseNames.every((name) => name.trim().length > 0);

  const handleContinue = () => {
    const next = getNextOnboardingRoute('StudySetup', data.tracks);
    if (next) {
      navigation.navigate(next);
    }
  };

  return (
    <Screen>
      <OnboardingHeader
        stepLabel="Study"
        title="Build your study plan"
        subtitle="Add your courses and weekly session target."
      />

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>How many courses?</Text>
        <View style={styles.chipRow}>
          {COURSE_OPTIONS.map((count) => (
            <Chip
              key={count}
              label={String(count)}
              selected={data.courseLoad === count}
              onPress={() => setCourseLoad(count)}
            />
          ))}
        </View>
      </Card>

      {data.courseLoad ? (
        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>Course names</Text>
          <View style={styles.form}>
            {data.courseNames.map((name, index) => (
              <TextInput
                key={`course-${index}`}
                label={`Course ${index + 1}`}
                value={name}
                onChangeText={(text) => setCourseName(index, text)}
                placeholder={`e.g. Course ${index + 1}`}
                autoCapitalize="words"
                returnKeyType={
                  index === data.courseNames.length - 1 ? 'done' : 'next'
                }
              />
            ))}
          </View>
        </Card>
      ) : null}

      <Card style={styles.card}>
        <NumberStepper
          value={data.studySessionsPerWeek}
          onChange={setStudySessionsPerWeek}
          min={1}
          max={14}
          label="Study sessions per week"
        />
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
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  form: {
    gap: spacing.xl,
  },
});
