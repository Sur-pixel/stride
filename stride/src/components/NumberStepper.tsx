import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

type NumberStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
};

export function NumberStepper({
  value,
  onChange,
  min = 1,
  max = 14,
  label,
}: NumberStepperProps) {
  const decrement = () => {
    if (value > min) onChange(value - 1);
  };

  const increment = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.controls}>
        <Pressable
          onPress={decrement}
          disabled={value <= min}
          style={({ pressed }) => [
            styles.button,
            value <= min ? styles.buttonDisabled : null,
            pressed && value > min ? styles.pressed : null,
          ]}
        >
          <Text style={styles.buttonLabel}>−</Text>
        </Pressable>

        <View style={styles.valueBox}>
          <Text style={styles.value}>{value}</Text>
        </View>

        <Pressable
          onPress={increment}
          disabled={value >= max}
          style={({ pressed }) => [
            styles.button,
            value >= max ? styles.buttonDisabled : null,
            pressed && value < max ? styles.pressed : null,
          ]}
        >
          <Text style={styles.buttonLabel}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.75,
  },
  buttonLabel: {
    fontSize: 28,
    fontWeight: '500',
    color: colors.textPrimary,
    lineHeight: 32,
  },
  valueBox: {
    minWidth: 88,
    height: 72,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    ...typography.hero,
    color: colors.textPrimary,
  },
});
