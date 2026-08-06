import { Course, DailyProgress, GymSchedule, Semester } from '../types/database';
import { supabase } from '../lib/supabase';

export type SemesterBundle = {
  semester: Semester;
  courses: Course[];
  gymSchedule: GymSchedule | null;
  progress: DailyProgress[];
};

export type SemesterContext = {
  current: SemesterBundle | null;
  upcoming: Semester | null;
  past: Semester | null;
};

/** UTC-safe local ISO date (YYYY-MM-DD) — matches semester date columns. */
function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Resolves the user's semester picture: which is current (by date range),
 * which is next up, and which is the most recent completed one. Any of the
 * three may be null.
 */
export async function fetchSemesterContext(
  profileId: string,
): Promise<SemesterContext> {
  const today = todayIso();

  const [currentRes, upcomingRes, pastRes] = await Promise.all([
    supabase
      .from('semesters')
      .select('*')
      .eq('profile_id', profileId)
      .lte('start_date', today)
      .gte('end_date', today)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('semesters')
      .select('*')
      .eq('profile_id', profileId)
      .gt('start_date', today)
      .order('start_date', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('semesters')
      .select('*')
      .eq('profile_id', profileId)
      .lt('end_date', today)
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (currentRes.error) throw currentRes.error;
  if (upcomingRes.error) throw upcomingRes.error;
  if (pastRes.error) throw pastRes.error;

  let current: SemesterBundle | null = null;
  if (currentRes.data) {
    current = await hydrateSemester(currentRes.data);
  }

  return {
    current,
    upcoming: upcomingRes.data ?? null,
    past: pastRes.data ?? null,
  };
}

/** Fetch courses + gym schedule + progress for a single semester. */
export async function hydrateSemester(
  semester: Semester,
): Promise<SemesterBundle> {
  const [coursesRes, gymRes, progressRes] = await Promise.all([
    supabase
      .from('courses')
      .select('*')
      .eq('semester_id', semester.id)
      .order('difficulty_rank', { ascending: true }),
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

  if (coursesRes.error) throw coursesRes.error;
  if (gymRes.error) throw gymRes.error;
  if (progressRes.error) throw progressRes.error;

  return {
    semester,
    courses: coursesRes.data ?? [],
    gymSchedule: gymRes.data ?? null,
    progress: progressRes.data ?? [],
  };
}

/** Increments the counter and appends the course to today's daily row. */
export async function completeStudySession(courseId: string): Promise<void> {
  const { error } = await supabase.rpc('complete_study_session', {
    p_course_id: courseId,
  });
  if (error) throw new Error(error.message);
}

export async function undoStudySession(courseId: string): Promise<void> {
  const { error } = await supabase.rpc('undo_study_session', {
    p_course_id: courseId,
  });
  if (error) throw new Error(error.message);
}

export async function setGymCompleted(
  semesterId: string,
  date: string,
  completed: boolean,
): Promise<DailyProgress> {
  const { data: existing, error: selectError } = await supabase
    .from('daily_progress')
    .select('*')
    .eq('semester_id', semesterId)
    .eq('date', date)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existing) {
    const { data, error } = await supabase
      .from('daily_progress')
      .update({ gym_completed: completed })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('daily_progress')
    .insert({
      semester_id: semesterId,
      date,
      gym_completed: completed,
      completed_course_ids: [],
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Fetches the partner's current semester bundle via partner cross-read RLS.
 * Returns null if the partner has no current semester or partner reads are
 * blocked.
 */
export async function fetchPartnerCurrentBundle(
  partnerId: string,
): Promise<SemesterBundle | null> {
  const today = todayIso();

  const { data: semester, error } = await supabase
    .from('semesters')
    .select('*')
    .eq('profile_id', partnerId)
    .lte('start_date', today)
    .gte('end_date', today)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!semester) return null;

  return hydrateSemester(semester);
}

/** Fetch a partner's profile via cross-read RLS. */
export async function fetchPartnerProfile(partnerId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, partner_id, onboarding_complete, created_at')
    .eq('id', partnerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
