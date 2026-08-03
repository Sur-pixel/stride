import { DayOfWeek, OnboardingData } from '../context/OnboardingContext';
import { supabase } from '../lib/supabase';

type CoursePayload = {
  name: string;
  target_study_sessions_per_week: number;
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

/** Split weekly sessions across courses; each course gets at least 1 (schema CHECK). */
export function distributeStudySessions(
  totalSessions: number,
  courseCount: number,
): number[] {
  if (courseCount <= 0) return [];

  const safeTotal = Math.max(totalSessions, courseCount);
  const base = Math.floor(safeTotal / courseCount);
  const remainder = safeTotal % courseCount;

  return Array.from({ length: courseCount }, (_, index) =>
    Math.max(1, base + (index < remainder ? 1 : 0)),
  );
}

function dayFlags(workoutDays: DayOfWeek[]): Omit<GymSchedulePayload, 'days_per_week'> {
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

function buildCoursesPayload(data: OnboardingData): CoursePayload[] | null {
  if (!data.tracks.includes('study')) {
    return null;
  }

  const targets = distributeStudySessions(
    data.studySessionsPerWeek,
    data.courseNames.length,
  );

  return data.courseNames.map((name, index) => ({
    name: name.trim(),
    target_study_sessions_per_week: targets[index],
  }));
}

function buildGymPayload(data: OnboardingData): GymSchedulePayload | null {
  if (!data.tracks.includes('gym') || !data.gymDaysPerWeek) {
    return null;
  }

  return {
    days_per_week: data.gymDaysPerWeek,
    ...dayFlags(data.workoutDays),
  };
}

/**
 * Persists onboarding via complete_onboarding RPC.
 * The database function runs in a single transaction so semester, courses,
 * gym schedule, and onboarding_complete either all commit or all roll back.
 */
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
  }

  const courses = buildCoursesPayload(data);
  const gymSchedule = buildGymPayload(data);

  const { error } = await supabase.rpc('complete_onboarding', {
    p_semester_name: data.semesterName.trim(),
    p_start_date: data.semesterStartDate,
    p_end_date: data.semesterEndDate,
    p_courses: courses,
    p_gym_schedule: gymSchedule,
  });

  if (error) {
    throw new Error(error.message);
  }
}
