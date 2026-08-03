import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { HomeTabScreen } from '../screens/main/HomeTabScreen';
import { ProgressTabScreen } from '../screens/main/ProgressTabScreen';
import { FriendTabScreen } from '../screens/main/FriendTabScreen';
import { SettingsTabScreen } from '../screens/main/SettingsTabScreen';
import { colors, typography } from '../theme';

export type MainTabParamList = {
  HomeTab: undefined;
  ProgressTab: undefined;
  FriendTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 88,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarLabelStyle: {
          ...typography.caption,
          fontWeight: '500',
        },
        tabBarIcon: ({ color, focused, size }) => {
          const iconSize = size ?? 22;
          let name: keyof typeof Ionicons.glyphMap = 'home-outline';

          if (route.name === 'HomeTab') {
            name = focused ? 'home' : 'home-outline';
          } else if (route.name === 'ProgressTab') {
            name = focused ? 'trending-up' : 'trending-up-outline';
          } else if (route.name === 'FriendTab') {
            name = focused ? 'people' : 'people-outline';
          } else if (route.name === 'SettingsTab') {
            name = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={name} size={iconSize} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeTabScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="ProgressTab"
        component={ProgressTabScreen}
        options={{ tabBarLabel: 'Progress' }}
      />
      <Tab.Screen
        name="FriendTab"
        component={FriendTabScreen}
        options={{ tabBarLabel: 'Friend' }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsTabScreen}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}
