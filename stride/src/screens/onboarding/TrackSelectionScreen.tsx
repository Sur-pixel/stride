import { StyleSheet, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import {
  OnboardingFooter,
  OnboardingHeader,
  Screen,
  SelectableCard,
} from '../../components';
import { useOnboarding } from '../../context/OnboardingContext';
import { getNextOnboardingRoute } from '../../navigation/onboardingFlow';
import { OnboardingStackParamList } from '../../navigation/onboardingTypes';
import { spacing } from '../../theme';

type Navigation = NativeStackNavigationProp<
  OnboardingStackParamList,
  'TrackSelection'
>;

export function TrackSelectionScreen() {
  const navigation = useNavigation<Navigation>();
  const { data, toggleTrack } = useOnboarding();

  const canContinue = data.tracks.length > 0;

  const handleContinue = () => {
    const next = getNextOnboardingRoute('TrackSelection', data.tracks);
    if (next) {
      navigation.navigate(next);
    }
  };

  return (
    <Screen>
      <OnboardingHeader
        stepLabel="Step 2"
        title="What do you want to track?"
        subtitle="Choose one or both. You can always adjust this later."
      />

      <View style={styles.options}>
        <SelectableCard
          emoji="💪"
          title="Gym"
          subtitle="Training days, workouts, and consistency."
          selected={data.tracks.includes('gym')}
          onPress={() => toggleTrack('gym')}
        />
        <SelectableCard
          emoji="🧠"
          title="Study"
          subtitle="Courses, sessions, and academic focus."
          selected={data.tracks.includes('study')}
          onPress={() => toggleTrack('study')}
        />
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
