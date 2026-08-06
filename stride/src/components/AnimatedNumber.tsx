import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleProp, Text, TextStyle } from 'react-native';

type AnimatedNumberProps = {
  value: number;
  duration?: number;
  suffix?: string;
  style?: StyleProp<TextStyle>;
  formatter?: (n: number) => string;
};

export function AnimatedNumber({
  value,
  duration = 600,
  suffix = '',
  style,
  formatter,
}: AnimatedNumberProps) {
  const driver = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const id = driver.addListener(({ value: v }) => {
      setDisplay(v);
    });
    return () => driver.removeListener(id);
  }, [driver]);

  useEffect(() => {
    Animated.timing(driver, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value, duration, driver]);

  const rendered = formatter ? formatter(display) : `${Math.round(display)}`;

  return <Text style={style}>{`${rendered}${suffix}`}</Text>;
}
