import { StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import {
  Card,
  NumberStepper,
  OnboardingFooter,
  OnboardingHeader,
  Screen,
} from '../../components';
import { useOnboarding } from '../../context/OnboardingContext';
import { getNextOnboardingRoute } from '../../navigation/onboardingFlow';
import { OnboardingStackParamList } from '../../navigation/onboardingTypes';
import { spacing } from '../../theme';

type Navigation = NativeStackNavigationProp<
  OnboardingStackParamList,
  'StudySessions'
>;

export function StudySessionsScreen() {
  const navigation = useNavigation<Navigation>();
  const { data, setStudySessionsPerWeek } = useOnboarding();

  const handleContinue = () => {
    const next = getNextOnboardingRoute('StudySessions', data.tracks);
    if (next) {
      navigation.navigate(next);
    }
  };

  return (
    <Screen>
      <OnboardingHeader
        stepLabel="Study"
        title="How many study sessions?"
        subtitle="Pick a weekly target. You can change this anytime."
      />

      <Card style={styles.card}>
        <NumberStepper
          value={data.studySessionsPerWeek}
          onChange={setStudySessionsPerWeek}
          min={1}
          max={14}
          label="Sessions per week"
        />
      </Card>

      <OnboardingFooter onPress={handleContinue} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.xxxl,
  },
});
