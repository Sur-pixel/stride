import { StyleSheet, View } from 'react-native';
import { Button } from './Button';
import { spacing } from '../theme';

type OnboardingFooterProps = {
  label?: string;
  onPress: () => void;
  disabled?: boolean;
};

export function OnboardingFooter({
  label = 'Continue',
  onPress,
  disabled = false,
}: OnboardingFooterProps) {
  return (
    <View style={styles.footer}>
      <Button title={label} onPress={onPress} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: 'auto',
    paddingTop: spacing.xxl,
  },
});
