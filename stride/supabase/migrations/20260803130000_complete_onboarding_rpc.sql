-- =============================================================================
-- complete_onboarding: atomic onboarding write
-- Creates semester + optional courses + optional gym_schedule, then marks
-- profiles.onboarding_complete. Entire body runs in one transaction.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_semester_name TEXT,
  p_start_date DATE,
  p_end_date DATE,
  p_courses JSONB DEFAULT NULL,
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

  IF p_courses IS NULL AND p_gym_schedule IS NULL THEN
    RAISE EXCEPTION 'At least one of courses or gym schedule is required';
  END IF;

  IF p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Semester end date must be on or after start date';
  END IF;

  IF p_courses IS NOT NULL THEN
    IF jsonb_typeof(p_courses) <> 'array' OR jsonb_array_length(p_courses) = 0 THEN
      RAISE EXCEPTION 'Courses must be a non-empty array';
    END IF;
  END IF;

  IF p_gym_schedule IS NOT NULL THEN
    IF jsonb_typeof(p_gym_schedule) <> 'object' THEN
      RAISE EXCEPTION 'Gym schedule must be an object';
    END IF;
  END IF;

  INSERT INTO public.semesters (
    profile_id,
    name,
    start_date,
    end_date,
    is_active
  )
  VALUES (
    v_profile_id,
    p_semester_name,
    p_start_date,
    p_end_date,
    true
  )
  RETURNING id INTO v_semester_id;

  IF p_courses IS NOT NULL THEN
    FOR v_course IN
      SELECT value FROM jsonb_array_elements(p_courses)
    LOOP
      INSERT INTO public.courses (
        semester_id,
        name,
        target_study_sessions_per_week
      )
      VALUES (
        v_semester_id,
        NULLIF(TRIM(v_course ->> 'name'), ''),
        (v_course ->> 'target_study_sessions_per_week')::INTEGER
      );
    END LOOP;
  END IF;

  IF p_gym_schedule IS NOT NULL THEN
    INSERT INTO public.gym_schedule (
      semester_id,
      days_per_week,
      monday,
      tuesday,
      wednesday,
      thursday,
      friday,
      saturday,
      sunday
    )
    VALUES (
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

COMMENT ON FUNCTION public.complete_onboarding(TEXT, DATE, DATE, JSONB, JSONB) IS
  'Atomically creates the first active semester, optional courses and gym schedule, then marks onboarding complete.';
