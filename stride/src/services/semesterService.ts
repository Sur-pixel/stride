import { Course, DailyProgress, GymSchedule, Semester } from '../types/database';
import { supabase } from '../lib/supabase';

export type ActiveSemesterBundle = {
  semester: Semester;
  courses: Course[];
  gymSchedule: GymSchedule | null;
  progress: DailyProgress[];
};

export async function fetchActiveSemesterBundle(
  profileId: string,
): Promise<ActiveSemesterBundle | null> {
  const { data: semester, error: semesterError } = await supabase
    .from('semesters')
    .select('*')
    .eq('profile_id', profileId)
    .eq('is_active', true)
    .maybeSingle();

  if (semesterError) {
    throw semesterError;
  }

  if (!semester) {
    return null;
  }

  const [{ data: courses, error: coursesError }, { data: gymSchedule, error: gymError }, { data: progress, error: progressError }] =
    await Promise.all([
      supabase
        .from('courses')
        .select('*')
        .eq('semester_id', semester.id)
        .order('name', { ascending: true }),
      supabase
        .from('gym_schedule')
        .select('*')
        .eq('semester_id', semester.id)
        .maybeSingle(),
      supabase
        .from('daily_progress')
        .select('*')
        .eq('semester_id', semester.id)
        .order('date', { ascending: true }),
    ]);

  if (coursesError) throw coursesError;
  if (gymError) throw gymError;
  if (progressError) throw progressError;

  return {
    semester,
    courses: courses ?? [],
    gymSchedule: gymSchedule ?? null,
    progress: progress ?? [],
  };
}

export async function upsertDailyProgress(input: {
  semesterId: string;
  date: string;
  studySessionsCompleted: number;
  gymCompleted: boolean;
}): Promise<DailyProgress> {
  const { data: existing, error: selectError } = await supabase
    .from('daily_progress')
    .select('*')
    .eq('semester_id', input.semesterId)
    .eq('date', input.date)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing) {
    const { data, error } = await supabase
      .from('daily_progress')
      .update({
        study_sessions_completed: input.studySessionsCompleted,
        gym_completed: input.gymCompleted,
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('daily_progress')
    .insert({
      semester_id: input.semesterId,
      date: input.date,
      study_sessions_completed: input.studySessionsCompleted,
      gym_completed: input.gymCompleted,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/** Attempt to load a partner profile. Requires future RLS for partner read access. */
export async function fetchPartnerProfile(partnerId: string) {
  // TODO: Partner RLS — currently profiles can only be selected by owner.
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, partner_id, onboarding_complete, created_at')
    .eq('id', partnerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
