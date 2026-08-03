import { StyleSheet, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import {
  Card,
  OnboardingFooter,
  OnboardingHeader,
  Screen,
  TextInput,
} from '../../components';
import { useOnboarding } from '../../context/OnboardingContext';
import { getNextOnboardingRoute } from '../../navigation/onboardingFlow';
import { OnboardingStackParamList } from '../../navigation/onboardingTypes';
import { spacing } from '../../theme';

type Navigation = NativeStackNavigationProp<
  OnboardingStackParamList,
  'CourseNames'
>;

export function CourseNamesScreen() {
  const navigation = useNavigation<Navigation>();
  const { data, setCourseName } = useOnboarding();

  const courseCount = data.courseLoad ?? data.courseNames.length;
  const canContinue =
    courseCount > 0 &&
    data.courseNames.length === courseCount &&
    data.courseNames.every((name) => name.trim().length > 0);

  const handleContinue = () => {
    const next = getNextOnboardingRoute('CourseNames', data.tracks);
    if (next) {
      navigation.navigate(next);
    }
  };

  return (
    <Screen>
      <OnboardingHeader
        stepLabel="Study"
        title="Name your courses"
        subtitle="Add the courses you're taking this term."
      />

      <Card>
        <View style={styles.form}>
          {data.courseNames.map((name, index) => (
            <TextInput
              key={`course-${index}`}
              label={`Course ${index + 1}`}
              value={name}
              onChangeText={(text) => setCourseName(index, text)}
              placeholder={`e.g. Course ${index + 1}`}
              autoCapitalize="words"
              returnKeyType={index === data.courseNames.length - 1 ? 'done' : 'next'}
            />
          ))}
        </View>
      </Card>

      <OnboardingFooter onPress={handleContinue} disabled={!canContinue} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.xl,
  },
});
