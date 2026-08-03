import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useOnboarding } from '../context/OnboardingContext';
import { AuthNavigator } from './AuthNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { AuthLoadingScreen, HomeScreen } from '../screens/HomeScreen';
import { colors } from '../theme';

export type RootStackParamList = {
  Home: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { session, isLoading } = useAuth();
  const { isComplete } = useOnboarding();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!session) {
    return <AuthNavigator />;
  }

  if (!isComplete) {
    return <OnboardingNavigator />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
}
