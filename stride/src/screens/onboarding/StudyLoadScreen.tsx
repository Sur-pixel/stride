import { StyleSheet, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import {
  OnboardingFooter,
  OnboardingHeader,
  Screen,
  SelectableCard,
} from '../../components';
import { CourseLoad, useOnboarding } from '../../context/OnboardingContext';
import { getNextOnboardingRoute } from '../../navigation/onboardingFlow';
import { OnboardingStackParamList } from '../../navigation/onboardingTypes';
import { spacing } from '../../theme';

type Navigation = NativeStackNavigationProp<OnboardingStackParamList, 'StudyLoad'>;

const LOAD_OPTIONS: { value: CourseLoad; title: string; subtitle: string }[] = [
  { value: 3, title: '3 courses', subtitle: 'A lighter semester load.' },
  { value: 4, title: '4 courses', subtitle: 'A balanced academic week.' },
  { value: 5, title: '5 courses', subtitle: 'A full course schedule.' },
];

export function StudyLoadScreen() {
  const navigation = useNavigation<Navigation>();
  const { data, setCourseLoad } = useOnboarding();

  const canContinue = data.courseLoad !== null;

  const handleContinue = () => {
    const next = getNextOnboardingRoute('StudyLoad', data.tracks);
    if (next) {
      navigation.navigate(next);
    }
  };

  return (
    <Screen>
      <OnboardingHeader
        stepLabel="Study"
        title="What's your course load?"
        subtitle="We'll use this to set up your study plan."
      />

      <View style={styles.options}>
        {LOAD_OPTIONS.map((option) => (
          <SelectableCard
            key={option.value}
            title={option.title}
            subtitle={option.subtitle}
            selected={data.courseLoad === option.value}
            onPress={() => setCourseLoad(option.value)}
          />
        ))}
      </View>

      <OnboardingFooter onPress={handleContinue} disabled={!canContinue} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: spacing.lg,
  },
});
