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

/**
 * Cumulative expected sessions for a single course through `dayIndex`
 * (1-indexed from semester start). Uses ceiling proration so integer daily
 * slices sum exactly to `totalSessions` by the last day of the semester.
 */
export function expectedCourseSessionsThrough(
  totalSessions: number,
  totalDays: number,
  dayIndex: number,
): number {
  if (dayIndex <= 0 || totalSessions <= 0 || totalDays <= 0) return 0;
  return Math.min(totalSessions, Math.ceil((totalSessions * dayIndex) / totalDays));
}

export type PaceMetric = {
  current: number;
  goal: number;
  percent: number;
  delta: number;
  statusLabel: string;
  tone: 'ahead' | 'behind' | 'on_pace' | 'neutral';
};

export type CoursePace = {
  course: Course;
  percent: number;
  expected: number;
  delta: number;
  sessionsRemaining: number;
  /** Sessions per day still owed to complete this course by semester end. */
  urgency: number;
  /** Weekly pace this course needs to finish on time (for readable copy). */
  weeklyPace: number;
  statusLabel: string;
  tone: 'ahead' | 'behind' | 'on_pace' | 'neutral';
};

export type TodayMission = {
  courseId: string;
  courseName: string;
  difficultyRank: number;
  completed: boolean;
};

export type ProgressSnapshot = {
  timeline: SemesterTimeline;
  hasGym: boolean;
  hasStudy: boolean;
  gym: PaceMetric | null;
  study: PaceMetric | null;
  perCourse: CoursePace[];
  todayMissions: TodayMission[];
  todayIsGymDay: boolean;
  todayGymDone: boolean;
  todayProgress: DailyProgress | null;
};

function clampPercent(current: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((current / goal) * 100));
}

function statusFor(
  delta: number,
  singular: string,
  plural: string,
): Pick<PaceMetric, 'statusLabel' | 'tone'> {
  if (delta > 0) {
    return {
      tone: 'ahead',
      statusLabel: `Ahead by ${delta} ${delta === 1 ? singular : plural}`,
    };
  }
  if (delta < 0) {
    const behind = Math.abs(delta);
    return {
      tone: 'behind',
      statusLabel: `Behind by ${behind} ${behind === 1 ? singular : plural}`,
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
  const daysRemaining = Math.max(1, diffDays(today, parseIsoDate(input.semester.end_date)) + 1);
  const semesterStart = parseIsoDate(input.semester.start_date);
  const endCap =
    startOfDay(today) < parseIsoDate(input.semester.end_date)
      ? today
      : parseIsoDate(input.semester.end_date);

  const todayIso = toIsoDate(today);
  const todayProgress =
    input.progress.find((row) => row.date === todayIso) ?? null;

  const hasGym = input.gymSchedule !== null;
  const hasStudy = input.courses.length > 0;

  // Gym pace: unchanged model — expected = scheduled gym days through today.
  let gym: PaceMetric | null = null;
  if (hasGym && input.gymSchedule) {
    const goal = countScheduledGymDays(
      input.gymSchedule,
      semesterStart,
      parseIsoDate(input.semester.end_date),
    );
    const expectedToDate = countScheduledGymDays(
      input.gymSchedule,
      semesterStart,
      endCap,
    );
    const current = input.progress.filter((row) => row.gym_completed).length;
    const delta = current - expectedToDate;
    gym = {
      current,
      goal,
      percent: clampPercent(current, goal),
      delta,
      ...statusFor(delta, 'workout', 'workouts'),
    };
  }

  // Per-course pace + urgency.
  const perCourse: CoursePace[] = input.courses.map((course) => {
    const expected = expectedCourseSessionsThrough(
      course.total_sessions,
      timeline.totalDays,
      timeline.daysElapsed,
    );
    const delta = course.sessions_completed - expected;
    const sessionsRemaining = Math.max(
      0,
      course.total_sessions - course.sessions_completed,
    );
    const urgency = sessionsRemaining / daysRemaining;
    const weeksLeft = Math.max(1, Math.ceil(daysRemaining / 7));
    const weeklyPace = sessionsRemaining / weeksLeft;
    return {
      course,
      percent: clampPercent(course.sessions_completed, course.total_sessions),
      expected,
      delta,
      sessionsRemaining,
      urgency,
      weeklyPace,
      ...statusFor(delta, 'session', 'sessions'),
    };
  });

  // Aggregated study metric.
  let study: PaceMetric | null = null;
  if (hasStudy) {
    const goal = input.courses.reduce((sum, c) => sum + c.total_sessions, 0);
    const current = input.courses.reduce(
      (sum, c) => sum + c.sessions_completed,
      0,
    );
    const expectedTotal = perCourse.reduce((sum, c) => sum + c.expected, 0);
    const delta = current - expectedTotal;
    study = {
      current,
      goal,
      percent: clampPercent(current, goal),
      delta,
      ...statusFor(delta, 'session', 'sessions'),
    };
  }

  const todayGymDone = todayProgress?.gym_completed ?? false;
  const todayIsGymDay = isGymDay(input.gymSchedule, today);

  const todayMissions = buildTodayStudyMissions(
    perCourse,
    todayProgress?.completed_course_ids ?? [],
  );

  return {
    timeline,
    hasGym,
    hasStudy,
    gym,
    study,
    perCourse,
    todayMissions,
    todayIsGymDay,
    todayGymDone,
    todayProgress,
  };
}

/**
 * Dynamic urgency planner.
 *
 * Total slots today = round(Σ urgency) where urgency[c] = sessions_remaining[c] /
 * days_remaining_in_semester. That's the average daily rate across active
 * courses; if the user completes it, remaining/remaining stays ≤ prior rate
 * so they stay on pace (backlog is neither hidden nor auto-caught-up).
 *
 * Slot assignment: highest-urgency courses win; ties broken by difficulty
 * rank (harder = wins). At most one session per course per day, matching
 * the checkbox mission UX. Courses already completed today are preserved
 * in the mission list marked as done.
 */
export function buildTodayStudyMissions(
  perCourse: CoursePace[],
  completedTodayIds: string[],
): TodayMission[] {
  const completedSet = new Set(completedTodayIds);

  const active = perCourse.filter((c) => c.sessionsRemaining > 0);
  console.log(
    active.map(c => ({
      course: c.course.name,
      delta: c.delta,
      urgency: c.urgency,
      backlog: Math.max(0, -c.delta),
      priority: Math.max(0, -c.delta) + c.urgency,
    }))
  );
  const totalUrgency = active.reduce((sum, c) => sum + c.urgency, 0);
  const activeCount = active.length;
  const backlogCourses = active.filter(c => c.delta < 0).length;

  const slotsToday = Math.min(
    activeCount,
    Math.max(
      Math.round(totalUrgency),
      backlogCourses
    )
  );
  const notCompleted = active.filter((c) => !completedSet.has(c.course.id));
  const completed = perCourse.filter((c) => completedSet.has(c.course.id));

  const remainingSlots = slotsToday;

  const sorted = [...notCompleted].sort((a, b) => {
    const aBacklog = Math.max(0, -a.delta);
    const bBacklog = Math.max(0, -b.delta);
  
    const aPriority = aBacklog + a.urgency;
    const bPriority = bBacklog + b.urgency;
  
    if (bPriority !== aPriority) return bPriority - aPriority;
  
    return a.course.difficulty_rank - b.course.difficulty_rank;
  });

  console.log("remainingSlots =", remainingSlots);

console.log(
  "sorted =",
  sorted.map(c => ({
    course: c.course.name,
    delta: c.delta,
    priority: Math.max(0, -c.delta) + c.urgency,
  }))
);
  const planned = sorted.slice(0, remainingSlots);
  console.log(
    "planned =",
    planned.map(c => c.course.name)
  );
  const missions: TodayMission[] = [];
  completed.forEach((item) => {
    missions.push({
      courseId: item.course.id,
      courseName: item.course.name,
      difficultyRank: item.course.difficulty_rank,
      completed: true,
    });
  });
  planned.forEach((item) => {
    missions.push({
      courseId: item.course.id,
      courseName: item.course.name,
      difficultyRank: item.course.difficulty_rank,
      completed: false,
    });
  });

  return missions;
}

export function overallPaceLabel(
  metrics: Array<PaceMetric | CoursePace | null | undefined>,
): { title: string; tone: 'ahead' | 'behind' | 'on_pace' } {
  const tones = metrics.map((m) => m?.tone).filter(Boolean);
  if (tones.includes('behind')) {
    return { title: 'Behind', tone: 'behind' };
  }
  if (tones.includes('ahead')) {
    return { title: 'Ahead', tone: 'ahead' };
  }
  return { title: 'On Pace', tone: 'on_pace' };
}
