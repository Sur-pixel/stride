import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors, typography } from '../theme';
import { AnimatedNumber } from './AnimatedNumber';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ProgressRingProps = {
  percent: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  labelSize?: number;
};

export function ProgressRing({
  percent,
  color,
  size = 96,
  strokeWidth = 9,
  showLabel = true,
  labelSize,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));

  const driver = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(driver, {
      toValue: clamped,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clamped, driver]);

  const strokeDashoffset = driver.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      {showLabel ? (
        <View style={styles.labelWrap} pointerEvents="none">
          <AnimatedNumber
            value={clamped}
            suffix="%"
            duration={900}
            style={[
              styles.label,
              labelSize
                ? { fontSize: labelSize, lineHeight: labelSize + 4 }
                : null,
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.title,
    color: colors.textPrimary,
  },
});
