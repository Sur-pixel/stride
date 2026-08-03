import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { TrackSelectionScreen } from '../screens/onboarding/TrackSelectionScreen';
import { SemesterScreen } from '../screens/onboarding/SemesterScreen';
import { StudySetupScreen } from '../screens/onboarding/StudySetupScreen';
import { GymSetupScreen } from '../screens/onboarding/GymSetupScreen';
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
      <Stack.Screen name="Semester" component={SemesterScreen} />
      <Stack.Screen name="StudySetup" component={StudySetupScreen} />
      <Stack.Screen name="GymSetup" component={GymSetupScreen} />
      <Stack.Screen name="Finish" component={FinishScreen} />
    </Stack.Navigator>
  );
}
