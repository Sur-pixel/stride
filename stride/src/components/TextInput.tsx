import { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  View,
} from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

type TextInputProps = RNTextInputProps & {
  label: string;
  error?: string;
};

export const TextInput = forwardRef<RNTextInput, TextInputProps>(
  function TextInput({ label, error, style, ...props }, ref) {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <RNTextInput
          ref={ref}
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, error ? styles.inputError : null, style]}
          {...props}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.inputBackground,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
