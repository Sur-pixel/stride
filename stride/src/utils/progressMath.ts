import { Course, DailyProgress, GymSchedule, Semester } from '../types/database';

const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function diffDays(start: Date, end: Date): number {
  const ms = startOfDay(end).getTime() - startOfDay(start).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function getGreeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatLongDate(date: Date): string {
  return date
    .toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    .toUpperCase();
}

export type SemesterTimeline = {
  weekNumber: number;
  totalWeeks: number;
  daysRemaining: number;
  daysElapsed: number;
  totalDays: number;
};

export function getSemesterTimeline(
  semester: Semester,
  today = new Date(),
): SemesterTimeline {
  const start = parseIsoDate(semester.start_date);
  const end = parseIsoDate(semester.end_date);
  const totalDays = Math.max(1, diffDays(start, end) + 1);
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
  const elapsed = Math.min(totalDays, Math.max(0, diffDays(start, today) + 1));
  const weekNumber = Math.min(totalWeeks, Math.max(1, Math.ceil(elapsed / 7)));
  const daysRemaining = Math.max(0, diffDays(today, end));

  return {
    weekNumber,
    totalWeeks,
    daysRemaining,
    daysElapsed: elapsed,
    totalDays,
  };
}

export function isGymDay(schedule: GymSchedule | null, date: Date): boolean {
  if (!schedule) return false;
  const key = DAY_KEYS[date.getDay()];
  return Boolean(schedule[key]);
}

export function countScheduledGymDays(
  schedule: GymSchedule | null,
  start: Date,
  end: Date,
): number {
  if (!schedule) return 0;

  let count = 0;
  const cursor = startOfDay(start);
  const last = startOfDay(end);

  while (cursor <= last) {
    if (isGymDay(schedule, cursor)) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}

export function weeklyStudyTarget(courses: Course[]): number {
  return courses.reduce(
    (sum, course) => sum + course.target_study_sessions_per_week,
    0,
  );
}

export type PaceMetric = {
  current: number;
  goal: number;
  percent: number;
  delta: number;
  statusLabel: string;
  tone: 'ahead' | 'behind' | 'on_pace' | 'neutral';
};

export type ProgressSnapshot = {
  timeline: SemesterTimeline;
  hasGym: boolean;
  hasStudy: boolean;
  gym: PaceMetric | null;
  study: PaceMetric | null;
  todayProgress: DailyProgress | null;
  todayIsGymDay: boolean;
};

function clampPercent(current: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((current / goal) * 100));
}

function gymStatus(delta: number): Pick<PaceMetric, 'statusLabel' | 'tone'> {
  if (delta > 0) {
    return {
      tone: 'ahead',
      statusLabel: `Ahead by ${delta} workout${delta === 1 ? '' : 's'}`,
    };
  }
  if (delta < 0) {
    const behind = Math.abs(delta);
    return {
      tone: 'behind',
      statusLabel: `Behind by ${behind} workout${behind === 1 ? '' : 's'}`,
    };
  }
  return { tone: 'on_pace', statusLabel: 'Right on pace' };
}

function studyStatus(delta: number): Pick<PaceMetric, 'statusLabel' | 'tone'> {
  if (delta > 0) {
    return {
      tone: 'ahead',
      statusLabel: `Ahead by ${delta} session${delta === 1 ? '' : 's'}`,
    };
  }
  if (delta < 0) {
    const behind = Math.abs(delta);
    return {
      tone: 'behind',
      statusLabel: `Behind by ${behind} session${behind === 1 ? '' : 's'}`,
    };
  }
  return { tone: 'on_pace', statusLabel: 'Right on pace' };
}

export function buildProgressSnapshot(input: {
  semester: Semester;
  courses: Course[];
  gymSchedule: GymSchedule | null;
  progress: DailyProgress[];
  today?: Date;
}): ProgressSnapshot {
  const today = input.today ?? new Date();
  const timeline = getSemesterTimeline(input.semester, today);
  const start = parseIsoDate(input.semester.start_date);
  const endCap =
    startOfDay(today) < parseIsoDate(input.semester.end_date)
      ? today
      : parseIsoDate(input.semester.end_date);

  const todayIso = toIsoDate(today);
  const todayProgress =
    input.progress.find((row) => row.date === todayIso) ?? null;

  const hasGym = input.gymSchedule !== null;
  const hasStudy = input.courses.length > 0;

  let gym: PaceMetric | null = null;
  if (hasGym && input.gymSchedule) {
    const goal = countScheduledGymDays(input.gymSchedule, start, parseIsoDate(input.semester.end_date));
    const expectedToDate = countScheduledGymDays(input.gymSchedule, start, endCap);
    const current = input.progress.filter((row) => row.gym_completed).length;
    const delta = current - expectedToDate;
    gym = {
      current,
      goal,
      percent: clampPercent(current, goal),
      delta,
      ...gymStatus(delta),
    };
  }

  let study: PaceMetric | null = null;
  if (hasStudy) {
    const weekly = weeklyStudyTarget(input.courses);
    const goal = weekly * timeline.totalWeeks;
    const expectedToDate = weekly * timeline.weekNumber;
    const current = input.progress.reduce(
      (sum, row) => sum + row.study_sessions_completed,
      0,
    );
    const delta = current - expectedToDate;
    study = {
      current,
      goal,
      percent: clampPercent(current, goal),
      delta,
      ...studyStatus(delta),
    };
  }

  return {
    timeline,
    hasGym,
    hasStudy,
    gym,
    study,
    todayProgress,
    todayIsGymDay: isGymDay(input.gymSchedule, today),
  };
}

export function overallPaceLabel(
  gym: PaceMetric | null,
  study: PaceMetric | null,
): { title: string; tone: 'ahead' | 'behind' | 'on_pace' } {
  const tones = [gym?.tone, study?.tone].filter(Boolean);
  if (tones.includes('behind')) {
    return { title: 'Behind', tone: 'behind' };
  }
  if (tones.includes('ahead') && !tones.includes('behind')) {
    return { title: 'On Pace', tone: 'on_pace' };
  }
  return { title: 'On Pace', tone: 'on_pace' };
}
