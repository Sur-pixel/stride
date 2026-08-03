import { StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import {
  Button,
  OnboardingHeader,
  Screen,
} from '../../components';
import { OnboardingStackParamList } from '../../navigation/onboardingTypes';
import { spacing } from '../../theme';

type Navigation = NativeStackNavigationProp<OnboardingStackParamList, 'Welcome'>;

export function WelcomeScreen() {
  const navigation = useNavigation<Navigation>();

  return (
    <Screen contentStyle={styles.content}>
      <OnboardingHeader
        stepLabel="Welcome"
        title="Let's set up Stride"
        subtitle="A few quick questions so we can build a plan that fits your week."
      />

      <Button
        title="Get Started"
        onPress={() => navigation.navigate('TrackSelection')}
        style={styles.button}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  button: {
    marginTop: spacing.sm,
  },
});
