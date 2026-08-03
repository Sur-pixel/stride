import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { TrackSelectionScreen } from '../screens/onboarding/TrackSelectionScreen';
import { GymSetupScreen } from '../screens/onboarding/GymSetupScreen';
import { StudyLoadScreen } from '../screens/onboarding/StudyLoadScreen';
import { StudySessionsScreen } from '../screens/onboarding/StudySessionsScreen';
import { CourseNamesScreen } from '../screens/onboarding/CourseNamesScreen';
import { FinishScreen } from '../screens/onboarding/FinishScreen';
import { colors } from '../theme';
import { OnboardingStackParamList } from './onboardingTypes';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="TrackSelection" component={TrackSelectionScreen} />
      <Stack.Screen name="GymSetup" component={GymSetupScreen} />
      <Stack.Screen name="StudyLoad" component={StudyLoadScreen} />
      <Stack.Screen name="StudySessions" component={StudySessionsScreen} />
      <Stack.Screen name="CourseNames" component={CourseNamesScreen} />
      <Stack.Screen name="Finish" component={FinishScreen} />
    </Stack.Navigator>
  );
}
