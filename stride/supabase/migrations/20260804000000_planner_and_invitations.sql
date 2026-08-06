-- =============================================================================
-- Stride v2: weekly session planner + realtime partner invitations
--
-- Breaking changes:
--   - courses: replace `target_study_sessions_per_week` with
--     `difficulty_rank`, `total_sessions`, `sessions_completed`
--   - semesters: drop `is_active` (current semester derived from today's date)
--   - daily_progress: drop `study_sessions_completed`, add
--     `completed_course_ids UUID[]`
--   - new `partner_invitations` table + realtime replication
--   - profiles/semesters/courses/gym_schedule/daily_progress: add partner
--     cross-read RLS so friend comparison works with live data
--   - complete_onboarding RPC signature changes
--
-- All previously onboarded users are reset (onboarding_complete = false)
-- and their in-flight semester data is deleted so they re-onboard cleanly
-- with the new schema.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Reset existing user data so re-onboarding is clean
-- -----------------------------------------------------------------------------
DELETE FROM public.daily_progress;
DELETE FROM public.gym_schedule;
DELETE FROM public.courses;
DELETE FROM public.semesters;
UPDATE public.profiles
  SET onboarding_complete = false,
      partner_id = NULL;

-- -----------------------------------------------------------------------------
-- 1. semesters: drop is_active (current semester = today ∈ [start_date, end_date])
-- -----------------------------------------------------------------------------
DROP INDEX IF EXISTS public.semesters_one_active_per_profile_idx;
ALTER TABLE public.semesters DROP COLUMN is_active;

-- Fast lookup of "current semester" for a profile.
CREATE INDEX semesters_profile_date_range_idx
  ON public.semesters (profile_id, start_date, end_date);

-- -----------------------------------------------------------------------------
-- 2. courses: replace weekly target with rank + total + counter
-- -----------------------------------------------------------------------------
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_target_sessions_positive;
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_target_sessions_max;
ALTER TABLE public.courses DROP COLUMN target_study_sessions_per_week;

ALTER TABLE public.courses ADD COLUMN difficulty_rank INTEGER NOT NULL;
ALTER TABLE public.courses ADD COLUMN total_sessions INTEGER NOT NULL;
ALTER TABLE public.courses
  ADD COLUMN sessions_completed INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.courses
  ADD CONSTRAINT courses_difficulty_rank_positive CHECK (difficulty_rank >= 1);
ALTER TABLE public.courses
  ADD CONSTRAINT courses_total_sessions_positive CHECK (total_sessions > 0);
ALTER TABLE public.courses
  ADD CONSTRAINT courses_sessions_completed_bounds
    CHECK (sessions_completed >= 0 AND sessions_completed <= total_sessions);
ALTER TABLE public.courses
  ADD CONSTRAINT courses_unique_rank_per_semester
    UNIQUE (semester_id, difficulty_rank);

CREATE INDEX courses_semester_rank_idx
  ON public.courses (semester_id, difficulty_rank);

COMMENT ON COLUMN public.courses.difficulty_rank IS
  'User-provided ranking, 1 = hardest. Unique within a semester.';
COMMENT ON COLUMN public.courses.total_sessions IS
  'Total study sessions targeted for this course across the semester.';
COMMENT ON COLUMN public.courses.sessions_completed IS
  'Running total of completed sessions. Managed by complete_study_session RPC.';

-- -----------------------------------------------------------------------------
-- 3. daily_progress: replace scalar count with per-course completion set
-- -----------------------------------------------------------------------------
ALTER TABLE public.daily_progress DROP COLUMN study_sessions_completed;
ALTER TABLE public.daily_progress
  ADD COLUMN completed_course_ids UUID[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.daily_progress.completed_course_ids IS
  'Course IDs completed on this date. Enables per-day undo and heat-map UI.';

-- -----------------------------------------------------------------------------
-- 4. partner_invitations
-- -----------------------------------------------------------------------------
CREATE TABLE public.partner_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  to_user_id UUID NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ NULL
);

CREATE INDEX partner_invitations_to_user_idx
  ON public.partner_invitations (to_user_id) WHERE to_user_id IS NOT NULL;
CREATE INDEX partner_invitations_from_user_idx
  ON public.partner_invitations (from_user_id);
CREATE INDEX partner_invitations_to_email_lower_idx
  ON public.partner_invitations (lower(to_email)) WHERE to_user_id IS NULL;

-- Only one pending invitation between a given (sender, recipient email) pair.
CREATE UNIQUE INDEX partner_invitations_one_pending_per_pair
  ON public.partner_invitations (from_user_id, lower(to_email))
  WHERE status = 'pending';

COMMENT ON TABLE public.partner_invitations IS
  'Realtime-replicated partner invites. Recipient may not yet have signed up; to_user_id is backfilled by the new-user trigger when they do.';

-- Enable Postgres logical replication for this table so the client's
-- realtime subscription delivers invites instantly.
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_invitations;

-- -----------------------------------------------------------------------------
-- 5. Extend new-user trigger to auto-link pending invitations by email
-- -----------------------------------------------------------------------------
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

  -- Link any pending invitations addressed to this email.
  UPDATE public.partner_invitations
    SET to_user_id = NEW.id
    WHERE lower(to_email) = lower(NEW.email)
      AND to_user_id IS NULL
      AND status = 'pending';

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. Partner cross-read helpers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_partner_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT partner_id
    FROM public.profiles
    WHERE id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION public.current_partner_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_partner_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.can_read_semester(p_semester_id UUID)
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
        AND (
          s.profile_id = (SELECT auth.uid())
          OR s.profile_id = public.current_partner_id()
        )
  );
$$;

REVOKE ALL ON FUNCTION public.can_read_semester(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_semester(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- 7. RLS: expand SELECT policies to include partner reads
-- -----------------------------------------------------------------------------

-- profiles: self OR partner
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_self_or_partner"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR id = public.current_partner_id()
  );

-- semesters: self OR partner
DROP POLICY IF EXISTS "semesters_select_own" ON public.semesters;
CREATE POLICY "semesters_select_self_or_partner"
  ON public.semesters
  FOR SELECT
  TO authenticated
  USING (
    profile_id = (SELECT auth.uid())
    OR profile_id = public.current_partner_id()
  );

-- courses: read via can_read_semester (self OR partner)
DROP POLICY IF EXISTS "courses_select_own" ON public.courses;
CREATE POLICY "courses_select_self_or_partner"
  ON public.courses
  FOR SELECT
  TO authenticated
  USING (public.can_read_semester(semester_id));

-- gym_schedule: read via can_read_semester
DROP POLICY IF EXISTS "gym_schedule_select_own" ON public.gym_schedule;
CREATE POLICY "gym_schedule_select_self_or_partner"
  ON public.gym_schedule
  FOR SELECT
  TO authenticated
  USING (public.can_read_semester(semester_id));

-- daily_progress: read via can_read_semester
DROP POLICY IF EXISTS "daily_progress_select_own" ON public.daily_progress;
CREATE POLICY "daily_progress_select_self_or_partner"
  ON public.daily_progress
  FOR SELECT
  TO authenticated
  USING (public.can_read_semester(semester_id));

-- Write policies still gated on ownership via is_semester_owner / auth.uid()
-- (unchanged from initial schema).

-- -----------------------------------------------------------------------------
-- 8. RLS on partner_invitations (reads only; writes go through RPCs)
-- -----------------------------------------------------------------------------
ALTER TABLE public.partner_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_invitations_select_participants"
  ON public.partner_invitations
  FOR SELECT
  TO authenticated
  USING (
    from_user_id = (SELECT auth.uid())
    OR to_user_id = (SELECT auth.uid())
  );

GRANT SELECT ON public.partner_invitations TO authenticated;
-- No INSERT/UPDATE/DELETE grants: all mutations happen via SECURITY DEFINER RPCs.

-- -----------------------------------------------------------------------------
-- 9. Updated complete_onboarding RPC (ranked courses + total_sessions)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.complete_onboarding(TEXT, DATE, DATE, JSONB, JSONB);

CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_semester_name TEXT,
  p_start_date DATE,
  p_end_date DATE,
  p_ranked_courses JSONB DEFAULT NULL,
  p_gym_schedule JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID := (SELECT auth.uid());
  v_semester_id UUID;
  v_course JSONB;
  v_already_complete BOOLEAN;
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT onboarding_complete
    INTO v_already_complete
    FROM public.profiles
    WHERE id = v_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_already_complete THEN
    RAISE EXCEPTION 'Onboarding already completed';
  END IF;

  IF p_ranked_courses IS NULL AND p_gym_schedule IS NULL THEN
    RAISE EXCEPTION 'At least one of courses or gym schedule is required';
  END IF;

  IF p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Semester end date must be on or after start date';
  END IF;

  IF p_ranked_courses IS NOT NULL THEN
    IF jsonb_typeof(p_ranked_courses) <> 'array'
       OR jsonb_array_length(p_ranked_courses) = 0 THEN
      RAISE EXCEPTION 'Courses must be a non-empty array';
    END IF;
  END IF;

  INSERT INTO public.semesters (profile_id, name, start_date, end_date)
    VALUES (v_profile_id, p_semester_name, p_start_date, p_end_date)
    RETURNING id INTO v_semester_id;

  IF p_ranked_courses IS NOT NULL THEN
    FOR v_course IN SELECT value FROM jsonb_array_elements(p_ranked_courses) LOOP
      INSERT INTO public.courses (
        semester_id,
        name,
        difficulty_rank,
        total_sessions
      )
      VALUES (
        v_semester_id,
        NULLIF(TRIM(v_course ->> 'name'), ''),
        (v_course ->> 'difficulty_rank')::INTEGER,
        (v_course ->> 'total_sessions')::INTEGER
      );
    END LOOP;
  END IF;

  IF p_gym_schedule IS NOT NULL THEN
    INSERT INTO public.gym_schedule (
      semester_id, days_per_week,
      monday, tuesday, wednesday, thursday, friday, saturday, sunday
    ) VALUES (
      v_semester_id,
      (p_gym_schedule ->> 'days_per_week')::INTEGER,
      COALESCE((p_gym_schedule ->> 'monday')::BOOLEAN, false),
      COALESCE((p_gym_schedule ->> 'tuesday')::BOOLEAN, false),
      COALESCE((p_gym_schedule ->> 'wednesday')::BOOLEAN, false),
      COALESCE((p_gym_schedule ->> 'thursday')::BOOLEAN, false),
      COALESCE((p_gym_schedule ->> 'friday')::BOOLEAN, false),
      COALESCE((p_gym_schedule ->> 'saturday')::BOOLEAN, false),
      COALESCE((p_gym_schedule ->> 'sunday')::BOOLEAN, false)
    );
  END IF;

  UPDATE public.profiles
    SET onboarding_complete = true
    WHERE id = v_profile_id;

  RETURN v_semester_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_onboarding(TEXT, DATE, DATE, JSONB, JSONB)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(TEXT, DATE, DATE, JSONB, JSONB)
  TO authenticated;

-- -----------------------------------------------------------------------------
-- 10. Session completion RPCs
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_study_session(p_course_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_semester_id UUID;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT semester_id
    INTO v_semester_id
    FROM public.courses
    WHERE id = p_course_id;

  IF v_semester_id IS NULL THEN
    RAISE EXCEPTION 'Course not found';
  END IF;

  UPDATE public.courses
    SET sessions_completed = LEAST(total_sessions, sessions_completed + 1)
    WHERE id = p_course_id;

  INSERT INTO public.daily_progress (
    semester_id, date, gym_completed, completed_course_ids
  )
  VALUES (v_semester_id, v_today, false, ARRAY[p_course_id])
  ON CONFLICT (semester_id, date) DO UPDATE
    SET completed_course_ids = daily_progress.completed_course_ids || p_course_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_study_session(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_study_session(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.undo_study_session(p_course_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_semester_id UUID;
  v_today DATE := CURRENT_DATE;
  v_ids UUID[];
  v_idx INTEGER;
BEGIN
  SELECT semester_id
    INTO v_semester_id
    FROM public.courses
    WHERE id = p_course_id;

  IF v_semester_id IS NULL THEN
    RAISE EXCEPTION 'Course not found';
  END IF;

  UPDATE public.courses
    SET sessions_completed = GREATEST(0, sessions_completed - 1)
    WHERE id = p_course_id;

  SELECT completed_course_ids
    INTO v_ids
    FROM public.daily_progress
    WHERE semester_id = v_semester_id AND date = v_today;

  IF v_ids IS NOT NULL THEN
    v_idx := array_position(v_ids, p_course_id);
    IF v_idx IS NOT NULL THEN
      UPDATE public.daily_progress
        SET completed_course_ids =
          v_ids[1:v_idx - 1] || v_ids[v_idx + 1:array_length(v_ids, 1)]
        WHERE semester_id = v_semester_id AND date = v_today;
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.undo_study_session(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.undo_study_session(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- 11. Partner invitation RPCs
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_partner_invitation(p_to_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_user_id UUID := (SELECT auth.uid());
  v_from_email TEXT;
  v_recipient_id UUID;
  v_invitation_id UUID;
  v_normalized TEXT := lower(TRIM(p_to_email));
BEGIN
  IF v_from_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_normalized = '' OR v_normalized NOT LIKE '%@%' THEN
    RAISE EXCEPTION 'Enter a valid email address';
  END IF;

  SELECT email INTO v_from_email FROM auth.users WHERE id = v_from_user_id;
  IF lower(v_from_email) = v_normalized THEN
    RAISE EXCEPTION 'You cannot invite yourself';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
      WHERE id = v_from_user_id AND partner_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'You already have a partner';
  END IF;

  SELECT id INTO v_recipient_id
    FROM auth.users
    WHERE lower(email) = v_normalized;

  IF v_recipient_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles
      WHERE id = v_recipient_id AND partner_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'That user already has a partner';
  END IF;

  INSERT INTO public.partner_invitations (
    from_user_id, to_email, to_user_id, status
  )
  VALUES (v_from_user_id, v_normalized, v_recipient_id, 'pending')
  RETURNING id INTO v_invitation_id;

  RETURN v_invitation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_partner_invitation(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_partner_invitation(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_partner_invitation(p_invitation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_from_user_id UUID;
  v_status TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT from_user_id, status
    INTO v_from_user_id, v_status
    FROM public.partner_invitations
    WHERE id = p_invitation_id AND to_user_id = v_user_id
    FOR UPDATE;

  IF v_from_user_id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'Invitation is no longer pending';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
      WHERE id = v_user_id AND partner_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'You already have a partner';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.profiles
      WHERE id = v_from_user_id AND partner_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'The sender already has a partner';
  END IF;

  UPDATE public.profiles SET partner_id = v_from_user_id WHERE id = v_user_id;
  UPDATE public.profiles SET partner_id = v_user_id WHERE id = v_from_user_id;

  UPDATE public.partner_invitations
    SET status = 'accepted', responded_at = now()
    WHERE id = p_invitation_id;

  -- Close any other pending invitations involving either user.
  UPDATE public.partner_invitations
    SET status = 'cancelled', responded_at = now()
    WHERE status = 'pending'
      AND id <> p_invitation_id
      AND (
        from_user_id IN (v_user_id, v_from_user_id)
        OR to_user_id IN (v_user_id, v_from_user_id)
      );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_partner_invitation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_partner_invitation(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.decline_partner_invitation(p_invitation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.partner_invitations
    SET status = 'declined', responded_at = now()
    WHERE id = p_invitation_id
      AND to_user_id = v_user_id
      AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already responded';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.decline_partner_invitation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decline_partner_invitation(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_partner_invitation(p_invitation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.partner_invitations
    SET status = 'cancelled', responded_at = now()
    WHERE id = p_invitation_id
      AND from_user_id = v_user_id
      AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already responded';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_partner_invitation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_partner_invitation(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.unpair_partner()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_partner_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT partner_id INTO v_partner_id
    FROM public.profiles WHERE id = v_user_id;
  IF v_partner_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.profiles SET partner_id = NULL WHERE id = v_user_id;
  UPDATE public.profiles SET partner_id = NULL WHERE id = v_partner_id;
END;
$$;

REVOKE ALL ON FUNCTION public.unpair_partner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unpair_partner() TO authenticated;
