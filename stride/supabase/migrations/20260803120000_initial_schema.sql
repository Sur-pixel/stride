-- =============================================================================
-- Stride initial schema
-- Architecture: auth.users → profiles → semesters → (courses | gym_schedule | daily_progress)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. profiles
-- One row per authenticated user. id MUST equal auth.users.id.
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  partner_id UUID NULL REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT profiles_no_self_partner CHECK (partner_id IS DISTINCT FROM id)
);

CREATE INDEX profiles_partner_id_idx ON public.profiles (partner_id);

COMMENT ON TABLE public.profiles IS
  'One profile per authenticated user. Primary key matches auth.users.id.';

-- -----------------------------------------------------------------------------
-- 2. semesters
-- All gym/study/progress data belongs to a semester, not globally to a user.
-- Only one semester may be active per profile at a time.
-- -----------------------------------------------------------------------------
CREATE TABLE public.semesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT semesters_valid_date_range CHECK (end_date >= start_date)
);

CREATE INDEX semesters_profile_id_idx ON public.semesters (profile_id);

-- Enforce at most one active semester per profile.
CREATE UNIQUE INDEX semesters_one_active_per_profile_idx
  ON public.semesters (profile_id)
  WHERE is_active = true;

COMMENT ON TABLE public.semesters IS
  'Semester-scoped container for courses, gym schedule, and daily progress.';

-- -----------------------------------------------------------------------------
-- 3. courses
-- Study plan items for a single semester.
-- -----------------------------------------------------------------------------
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_id UUID NOT NULL REFERENCES public.semesters (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_study_sessions_per_week INTEGER NOT NULL,

  CONSTRAINT courses_target_sessions_positive
    CHECK (target_study_sessions_per_week > 0),
  CONSTRAINT courses_target_sessions_max
    CHECK (target_study_sessions_per_week <= 14)
);

CREATE INDEX courses_semester_id_idx ON public.courses (semester_id);

COMMENT ON TABLE public.courses IS
  'Courses belonging to a semester, including weekly study session targets.';

-- -----------------------------------------------------------------------------
-- 4. gym_schedule
-- Training plan for a semester. One schedule row per semester.
-- Day columns indicate which weekdays are workout days.
-- -----------------------------------------------------------------------------
CREATE TABLE public.gym_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_id UUID NOT NULL UNIQUE REFERENCES public.semesters (id) ON DELETE CASCADE,
  days_per_week INTEGER NOT NULL,
  monday BOOLEAN NOT NULL DEFAULT false,
  tuesday BOOLEAN NOT NULL DEFAULT false,
  wednesday BOOLEAN NOT NULL DEFAULT false,
  thursday BOOLEAN NOT NULL DEFAULT false,
  friday BOOLEAN NOT NULL DEFAULT false,
  saturday BOOLEAN NOT NULL DEFAULT false,
  sunday BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT gym_schedule_days_per_week_range
    CHECK (days_per_week BETWEEN 2 AND 7),
  CONSTRAINT gym_schedule_days_match_count CHECK (
    days_per_week = (
      (monday::INTEGER) +
      (tuesday::INTEGER) +
      (wednesday::INTEGER) +
      (thursday::INTEGER) +
      (friday::INTEGER) +
      (saturday::INTEGER) +
      (sunday::INTEGER)
    )
  )
);

COMMENT ON TABLE public.gym_schedule IS
  'Per-semester gym plan: days_per_week plus which weekdays are training days.';

-- -----------------------------------------------------------------------------
-- 5. daily_progress
-- Actual progress for a semester day (not the plan).
-- One row per date per semester.
-- -----------------------------------------------------------------------------
CREATE TABLE public.daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_id UUID NOT NULL REFERENCES public.semesters (id) ON DELETE CASCADE,
  date DATE NOT NULL,
  study_sessions_completed INTEGER NOT NULL DEFAULT 0,
  gym_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT daily_progress_sessions_non_negative
    CHECK (study_sessions_completed >= 0),
  CONSTRAINT daily_progress_unique_day UNIQUE (semester_id, date)
);

CREATE INDEX daily_progress_semester_id_idx ON public.daily_progress (semester_id);
CREATE INDEX daily_progress_semester_date_idx ON public.daily_progress (semester_id, date);

COMMENT ON TABLE public.daily_progress IS
  'Daily actuals for a semester: study sessions completed and gym completion.';

-- =============================================================================
-- Auto-create profile when a user signs up
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, onboarding_complete)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
      NEW.email,
      'User'
    ),
    false
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for users who signed up before this migration.
INSERT INTO public.profiles (id, name, onboarding_complete)
SELECT
  u.id,
  COALESCE(
    NULLIF(u.raw_user_meta_data ->> 'full_name', ''),
    u.email,
    'User'
  ),
  false
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Ownership helper for semester-scoped tables
-- SECURITY DEFINER so nested policies can resolve ownership without recursion
-- quirks; auth.uid() wrapped for InitPlan performance.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_semester_owner(p_semester_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.semesters s
    WHERE s.id = p_semester_id
      AND s.profile_id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.is_semester_owner(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_semester_owner(UUID) TO authenticated;

-- =============================================================================
-- Row Level Security
-- Users may only read/modify their own data.
-- Partner access is intentionally NOT implemented yet.
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_progress ENABLE ROW LEVEL SECURITY;

-- ---------- profiles ----------
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "profiles_delete_own"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (id = (SELECT auth.uid()));

-- ---------- semesters ----------
CREATE POLICY "semesters_select_own"
  ON public.semesters
  FOR SELECT
  TO authenticated
  USING (profile_id = (SELECT auth.uid()));

CREATE POLICY "semesters_insert_own"
  ON public.semesters
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY "semesters_update_own"
  ON public.semesters
  FOR UPDATE
  TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY "semesters_delete_own"
  ON public.semesters
  FOR DELETE
  TO authenticated
  USING (profile_id = (SELECT auth.uid()));

-- ---------- courses ----------
CREATE POLICY "courses_select_own"
  ON public.courses
  FOR SELECT
  TO authenticated
  USING (public.is_semester_owner(semester_id));

CREATE POLICY "courses_insert_own"
  ON public.courses
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_semester_owner(semester_id));

CREATE POLICY "courses_update_own"
  ON public.courses
  FOR UPDATE
  TO authenticated
  USING (public.is_semester_owner(semester_id))
  WITH CHECK (public.is_semester_owner(semester_id));

CREATE POLICY "courses_delete_own"
  ON public.courses
  FOR DELETE
  TO authenticated
  USING (public.is_semester_owner(semester_id));

-- ---------- gym_schedule ----------
CREATE POLICY "gym_schedule_select_own"
  ON public.gym_schedule
  FOR SELECT
  TO authenticated
  USING (public.is_semester_owner(semester_id));

CREATE POLICY "gym_schedule_insert_own"
  ON public.gym_schedule
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_semester_owner(semester_id));

CREATE POLICY "gym_schedule_update_own"
  ON public.gym_schedule
  FOR UPDATE
  TO authenticated
  USING (public.is_semester_owner(semester_id))
  WITH CHECK (public.is_semester_owner(semester_id));

CREATE POLICY "gym_schedule_delete_own"
  ON public.gym_schedule
  FOR DELETE
  TO authenticated
  USING (public.is_semester_owner(semester_id));

-- ---------- daily_progress ----------
CREATE POLICY "daily_progress_select_own"
  ON public.daily_progress
  FOR SELECT
  TO authenticated
  USING (public.is_semester_owner(semester_id));

CREATE POLICY "daily_progress_insert_own"
  ON public.daily_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_semester_owner(semester_id));

CREATE POLICY "daily_progress_update_own"
  ON public.daily_progress
  FOR UPDATE
  TO authenticated
  USING (public.is_semester_owner(semester_id))
  WITH CHECK (public.is_semester_owner(semester_id));

CREATE POLICY "daily_progress_delete_own"
  ON public.daily_progress
  FOR DELETE
  TO authenticated
  USING (public.is_semester_owner(semester_id));

-- =============================================================================
-- Grants (RLS still restricts row access)
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.semesters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gym_schedule TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_progress TO authenticated;
