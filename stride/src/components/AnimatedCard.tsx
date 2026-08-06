import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme';

type AnimatedCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  padded?: boolean;
};

export function AnimatedCard({
  children,
  style,
  delay = 0,
  padded = true,
}: AnimatedCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 380,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 380,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.xxl,
          padding: padded ? spacing.xxl : 0,
          opacity,
          transform: [{ translateY }],
        },
        shadows.card,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
