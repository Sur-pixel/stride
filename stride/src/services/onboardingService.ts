import { DayOfWeek, OnboardingData } from '../context/OnboardingContext';
import { supabase } from '../lib/supabase';

type RankedCoursePayload = {
  name: string;
  difficulty_rank: number;
  total_sessions: number;
};

type GymSchedulePayload = {
  days_per_week: number;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
};

/**
 * Difficulty-weighted allocation. Ranks are 1-indexed with 1 = hardest.
 * Weight(c) = (N - rank + 1) so hardest course gets weight N, easiest gets 1.
 * Returns integer sessions per course that sum exactly to `weeklyTotal`,
 * with every course getting at least 1 session per week.
 */
export function distributeWeeklySessionsByDifficulty(
  ranks: number[],
  weeklyTotal: number,
): number[] {
  const n = ranks.length;
  if (n === 0) return [];

  const minTotal = n;
  const safeTotal = Math.max(weeklyTotal, minTotal);
  const budget = safeTotal - minTotal;

  const weights = ranks.map((rank) => n - rank + 1);
  const weightSum = weights.reduce((a, b) => a + b, 0);

  const raw = weights.map((w) => (budget * w) / weightSum);
  const floors = raw.map((r) => Math.floor(r));
  let allocated = floors.reduce((a, b) => a + b, 0);

  // Distribute remainder to courses with the largest fractional part,
  // breaking ties by heavier weight (harder course wins).
  const remainders = raw
    .map((r, i) => ({ i, frac: r - floors[i], weight: weights[i] }))
    .sort((a, b) => b.frac - a.frac || b.weight - a.weight);

  const extra = [...floors];
  for (const item of remainders) {
    if (allocated >= budget) break;
    extra[item.i] += 1;
    allocated += 1;
  }

  return extra.map((x) => x + 1);
}

function dayFlags(
  workoutDays: DayOfWeek[],
): Omit<GymSchedulePayload, 'days_per_week'> {
  return {
    monday: workoutDays.includes('Mon'),
    tuesday: workoutDays.includes('Tue'),
    wednesday: workoutDays.includes('Wed'),
    thursday: workoutDays.includes('Thu'),
    friday: workoutDays.includes('Fri'),
    saturday: workoutDays.includes('Sat'),
    sunday: workoutDays.includes('Sun'),
  };
}

function totalWeeksBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  const dayMs = 1000 * 60 * 60 * 24;
  const days = Math.round((end.getTime() - start.getTime()) / dayMs) + 1;
  return Math.max(1, Math.ceil(days / 7));
}

function buildRankedCoursesPayload(
  data: OnboardingData,
): RankedCoursePayload[] | null {
  if (!data.tracks.includes('study')) return null;
  if (!data.semesterStartDate || !data.semesterEndDate) return null;

  const totalWeeks = totalWeeksBetween(
    data.semesterStartDate,
    data.semesterEndDate,
  );

  // Rank is the course's position in the ordered list, 1 = hardest.
  const ranks = data.courseNames.map((_, i) => i + 1);
  const weekly = distributeWeeklySessionsByDifficulty(
    ranks,
    data.studySessionsPerWeek,
  );

  return data.courseNames.map((name, index) => ({
    name: name.trim(),
    difficulty_rank: ranks[index],
    total_sessions: Math.max(1, weekly[index] * totalWeeks),
  }));
}

function buildGymPayload(data: OnboardingData): GymSchedulePayload | null {
  if (!data.tracks.includes('gym') || !data.gymDaysPerWeek) return null;

  return {
    days_per_week: data.gymDaysPerWeek,
    ...dayFlags(data.workoutDays),
  };
}

export async function persistOnboarding(data: OnboardingData): Promise<void> {
  const tracksGym = data.tracks.includes('gym');
  const tracksStudy = data.tracks.includes('study');

  if (!tracksGym && !tracksStudy) {
    throw new Error('Select at least one track to continue.');
  }

  if (!data.semesterName.trim()) {
    throw new Error('Enter a semester name.');
  }

  if (!data.semesterStartDate || !data.semesterEndDate) {
    throw new Error('Choose a semester start and end date.');
  }

  if (data.semesterEndDate < data.semesterStartDate) {
    throw new Error('Semester end date must be on or after the start date.');
  }

  if (tracksGym) {
    if (!data.gymDaysPerWeek || data.workoutDays.length !== data.gymDaysPerWeek) {
      throw new Error('Complete your gym schedule before finishing.');
    }
  }

  if (tracksStudy) {
    if (!data.courseLoad || data.courseNames.length !== data.courseLoad) {
      throw new Error('Complete your course setup before finishing.');
    }
    if (data.courseNames.some((name) => !name.trim())) {
      throw new Error('Every course needs a name.');
    }
    if (data.studySessionsPerWeek < data.courseNames.length) {
      throw new Error(
        `Choose at least ${data.courseNames.length} weekly sessions so each course gets one.`,
      );
    }
  }

  const rankedCourses = buildRankedCoursesPayload(data);
  const gymSchedule = buildGymPayload(data);

  const { error } = await supabase.rpc('complete_onboarding', {
    p_semester_name: data.semesterName.trim(),
    p_start_date: data.semesterStartDate,
    p_end_date: data.semesterEndDate,
    p_ranked_courses: rankedCourses,
    p_gym_schedule: gymSchedule,
  });

  if (error) {
    throw new Error(error.message);
  }
}
