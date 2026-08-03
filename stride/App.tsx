import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { OnboardingProvider } from './src/context/OnboardingContext';
import { ProfileProvider } from './src/context/ProfileContext';
import { SemesterProvider } from './src/context/SemesterContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ProfileProvider>
          <OnboardingProvider>
            <SemesterProvider>
              <NavigationContainer>
                <StatusBar style="dark" />
                <RootNavigator />
              </NavigationContainer>
            </SemesterProvider>
          </OnboardingProvider>
        </ProfileProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
