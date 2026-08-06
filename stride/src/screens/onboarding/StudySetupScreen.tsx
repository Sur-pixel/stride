import { StyleSheet, Text, View, Pressable } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  Card,
  Chip,
  NumberStepper,
  OnboardingFooter,
  OnboardingHeader,
  Screen,
  TextInput,
} from '../../components';
import {
  CourseLoad,
  useAllocationPreview,
  useOnboarding,
} from '../../context/OnboardingContext';
import { getNextOnboardingRoute } from '../../navigation/onboardingFlow';
import { OnboardingStackParamList } from '../../navigation/onboardingTypes';
import { colors, radii, spacing, typography } from '../../theme';

type Navigation = NativeStackNavigationProp<
  OnboardingStackParamList,
  'StudySetup'
>;

const COURSE_OPTIONS: CourseLoad[] = [3, 4, 5];

export function StudySetupScreen() {
  const navigation = useNavigation<Navigation>();
  const {
    data,
    setCourseLoad,
    setCourseName,
    setStudySessionsPerWeek,
    moveCourseUp,
    moveCourseDown,
  } = useOnboarding();

  const allocation = useAllocationPreview(data);

  const canContinue =
    data.courseLoad !== null &&
    data.courseNames.length === data.courseLoad &&
    data.courseNames.every((name) => name.trim().length > 0) &&
    data.studySessionsPerWeek >= data.courseNames.length;

  const handleContinue = () => {
    const next = getNextOnboardingRoute('StudySetup', data.tracks);
    if (next) {
      navigation.navigate(next);
    }
  };

  const allNamesFilled =
    data.courseLoad !== null &&
    data.courseNames.length === data.courseLoad &&
    data.courseNames.every((n) => n.trim().length > 0);

  return (
    <Screen>
      <OnboardingHeader
        stepLabel="Study"
        title="Build your study plan"
        subtitle="Add your courses, rank them from hardest to easiest, then choose your weekly session load."
      />

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>How many courses?</Text>
        <View style={styles.chipRow}>
          {COURSE_OPTIONS.map((count) => (
            <Chip
              key={count}
              label={String(count)}
              selected={data.courseLoad === count}
              onPress={() => setCourseLoad(count)}
            />
          ))}
        </View>
      </Card>

      {data.courseLoad ? (
        <Card style={styles.card}>
          <View>
            <Text style={styles.sectionLabel}>Courses</Text>
            <Text style={styles.sectionHint}>
              Enter your hardest course first. Reorder with the arrows.
            </Text>
          </View>
          <View style={styles.form}>
            {data.courseNames.map((name, index) => (
              <View key={`course-${index}`} style={styles.courseRow}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={styles.courseInput}>
                  <TextInput
                    label={index === 0 ? 'Hardest' : index === data.courseNames.length - 1 ? 'Easiest' : `Rank ${index + 1}`}
                    value={name}
                    onChangeText={(text) => setCourseName(index, text)}
                    placeholder={`Course ${index + 1}`}
                    autoCapitalize="words"
                    returnKeyType={
                      index === data.courseNames.length - 1 ? 'done' : 'next'
                    }
                  />
                </View>
                <View style={styles.arrowStack}>
                  <ArrowButton
                    icon="chevron-up"
                    onPress={() => moveCourseUp(index)}
                    disabled={index === 0}
                  />
                  <ArrowButton
                    icon="chevron-down"
                    onPress={() => moveCourseDown(index)}
                    disabled={index === data.courseNames.length - 1}
                  />
                </View>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {allNamesFilled ? (
        <Card style={styles.card}>
          <NumberStepper
            value={data.studySessionsPerWeek}
            onChange={setStudySessionsPerWeek}
            min={data.courseNames.length}
            max={35}
            label="Total study sessions per week"
          />
          <View style={styles.allocation}>
            <Text style={styles.sectionLabel}>Allocation preview</Text>
            <Text style={styles.sectionHint}>
              Harder courses get more sessions. The planner rebalances daily if
              you fall behind.
            </Text>
            <View style={styles.allocationList}>
              {data.courseNames.map((name, i) => (
                <View
                  key={`alloc-${i}`}
                  style={[
                    styles.allocationRow,
                    i < data.courseNames.length - 1
                      ? styles.allocationRowBorder
                      : null,
                  ]}
                >
                  <Text style={styles.allocationRank}>#{i + 1}</Text>
                  <Text style={styles.allocationName} numberOfLines={1}>
                    {name.trim() || `Course ${i + 1}`}
                  </Text>
                  <Text style={styles.allocationValue}>
                    {allocation[i] ?? 0} / week
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Card>
      ) : null}

      <OnboardingFooter onPress={handleContinue} disabled={!canContinue} />
    </Screen>
  );
}

function ArrowButton({
  icon,
  onPress,
  disabled,
}: {
  icon: 'chevron-up' | 'chevron-down';
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.arrow,
        disabled ? styles.arrowDisabled : null,
        pressed && !disabled ? styles.arrowPressed : null,
      ]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={disabled ? colors.textTertiary : colors.textPrimary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    gap: spacing.lg,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  sectionHint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  form: {
    gap: spacing.md,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  courseInput: {
    flex: 1,
  },
  arrowStack: {
    gap: 4,
  },
  arrow: {
    width: 28,
    height: 22,
    borderRadius: radii.sm,
    backgroundColor: colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: {
    opacity: 0.4,
  },
  arrowPressed: {
    opacity: 0.7,
  },
  allocation: {
    gap: spacing.sm,
  },
  allocationList: {
    marginTop: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.inputBackground,
    paddingHorizontal: spacing.md,
  },
  allocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  allocationRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  allocationRank: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    width: 24,
  },
  allocationName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  allocationValue: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
