import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { useProfile } from './ProfileContext';
import {
  distributeWeeklySessionsByDifficulty,
  persistOnboarding,
} from '../services/onboardingService';

export type TrackType = 'gym' | 'study';

export type DayOfWeek =
  | 'Mon'
  | 'Tue'
  | 'Wed'
  | 'Thu'
  | 'Fri'
  | 'Sat'
  | 'Sun';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
];

export type CourseLoad = 3 | 4 | 5;

export type OnboardingData = {
  tracks: TrackType[];
  semesterName: string;
  semesterStartDate: string | null;
  semesterEndDate: string | null;
  gymDaysPerWeek: number | null;
  workoutDays: DayOfWeek[];
  courseLoad: CourseLoad | null;
  studySessionsPerWeek: number;
  /**
   * Course names in DIFFICULTY ORDER. Index 0 is hardest, last is easiest.
   * The difficulty rank of a course = its position in this array + 1.
   */
  courseNames: string[];
};

type CompleteOnboardingResult = {
  error: string | null;
};

type OnboardingContextValue = {
  data: OnboardingData;
  toggleTrack: (track: TrackType) => void;
  setSemesterName: (name: string) => void;
  setSemesterStartDate: (date: string) => void;
  setSemesterEndDate: (date: string) => void;
  setGymDaysPerWeek: (days: number) => void;
  toggleWorkoutDay: (day: DayOfWeek) => void;
  setCourseLoad: (load: CourseLoad) => void;
  setStudySessionsPerWeek: (sessions: number) => void;
  setCourseName: (index: number, name: string) => void;
  moveCourseUp: (index: number) => void;
  moveCourseDown: (index: number) => void;
  completeOnboarding: () => Promise<CompleteOnboardingResult>;
  resetOnboarding: () => void;
};

const initialData: OnboardingData = {
  tracks: [],
  semesterName: '',
  semesterStartDate: null,
  semesterEndDate: null,
  gymDaysPerWeek: null,
  workoutDays: [],
  courseLoad: null,
  studySessionsPerWeek: 0,
  courseNames: [],
};

const OnboardingContext = createContext<OnboardingContextValue | undefined>(
  undefined,
);

type OnboardingProviderProps = {
  children: ReactNode;
};

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { user } = useAuth();
  const { refreshProfile } = useProfile();
  const [data, setData] = useState<OnboardingData>(initialData);

  const toggleTrack = useCallback((track: TrackType) => {
    setData((prev) => {
      const hasTrack = prev.tracks.includes(track);
      return {
        ...prev,
        tracks: hasTrack
          ? prev.tracks.filter((item) => item !== track)
          : [...prev.tracks, track],
      };
    });
  }, []);

  const setSemesterName = useCallback((name: string) => {
    setData((prev) => ({ ...prev, semesterName: name }));
  }, []);

  const setSemesterStartDate = useCallback((date: string) => {
    setData((prev) => ({ ...prev, semesterStartDate: date }));
  }, []);

  const setSemesterEndDate = useCallback((date: string) => {
    setData((prev) => ({ ...prev, semesterEndDate: date }));
  }, []);

  const setGymDaysPerWeek = useCallback((days: number) => {
    setData((prev) => ({
      ...prev,
      gymDaysPerWeek: days,
      workoutDays: prev.workoutDays.slice(0, days),
    }));
  }, []);

  const toggleWorkoutDay = useCallback((day: DayOfWeek) => {
    setData((prev) => {
      const isSelected = prev.workoutDays.includes(day);
      if (isSelected) {
        return {
          ...prev,
          workoutDays: prev.workoutDays.filter((item) => item !== day),
        };
      }

      if (
        prev.gymDaysPerWeek !== null &&
        prev.workoutDays.length >= prev.gymDaysPerWeek
      ) {
        return prev;
      }

      return {
        ...prev,
        workoutDays: [...prev.workoutDays, day],
      };
    });
  }, []);

  const setCourseLoad = useCallback((load: CourseLoad) => {
    setData((prev) => {
      const nextNames = Array.from(
        { length: load },
        (_, index) => prev.courseNames[index] ?? '',
      );
      const suggested = Math.max(load, prev.studySessionsPerWeek || load * 3);

      return {
        ...prev,
        courseLoad: load,
        courseNames: nextNames,
        studySessionsPerWeek: suggested,
      };
    });
  }, []);

  const setStudySessionsPerWeek = useCallback((sessions: number) => {
    setData((prev) => {
      const minimum = Math.max(1, prev.courseNames.length);
      return {
        ...prev,
        studySessionsPerWeek: Math.min(35, Math.max(minimum, sessions)),
      };
    });
  }, []);

  const setCourseName = useCallback((index: number, name: string) => {
    setData((prev) => {
      const nextNames = [...prev.courseNames];
      nextNames[index] = name;
      return { ...prev, courseNames: nextNames };
    });
  }, []);

  const moveCourseUp = useCallback((index: number) => {
    setData((prev) => {
      if (index <= 0 || index >= prev.courseNames.length) return prev;
      const next = [...prev.courseNames];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return { ...prev, courseNames: next };
    });
  }, []);

  const moveCourseDown = useCallback((index: number) => {
    setData((prev) => {
      if (index < 0 || index >= prev.courseNames.length - 1) return prev;
      const next = [...prev.courseNames];
      [next[index + 1], next[index]] = [next[index], next[index + 1]];
      return { ...prev, courseNames: next };
    });
  }, []);

  const completeOnboarding = useCallback(async () => {
    if (!user) {
      return { error: 'You must be signed in to finish onboarding.' };
    }

    try {
      await persistOnboarding(data);
      await refreshProfile();
      setData(initialData);
      return { error: null };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save onboarding.';
      return { error: message };
    }
  }, [user, data, refreshProfile]);

  const resetOnboarding = useCallback(() => {
    setData(initialData);
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      data,
      toggleTrack,
      setSemesterName,
      setSemesterStartDate,
      setSemesterEndDate,
      setGymDaysPerWeek,
      toggleWorkoutDay,
      setCourseLoad,
      setStudySessionsPerWeek,
      setCourseName,
      moveCourseUp,
      moveCourseDown,
      completeOnboarding,
      resetOnboarding,
    }),
    [
      data,
      toggleTrack,
      setSemesterName,
      setSemesterStartDate,
      setSemesterEndDate,
      setGymDaysPerWeek,
      toggleWorkoutDay,
      setCourseLoad,
      setStudySessionsPerWeek,
      setCourseName,
      moveCourseUp,
      moveCourseDown,
      completeOnboarding,
      resetOnboarding,
    ],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);

  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }

  return context;
}

/**
 * Live allocation preview: given the current course names + weekly total,
 * returns the difficulty-weighted weekly sessions per course. Length matches
 * `courseNames`.
 */
export function useAllocationPreview(data: OnboardingData): number[] {
  return useMemo(() => {
    if (!data.tracks.includes('study') || data.courseNames.length === 0) {
      return [];
    }
    const ranks = data.courseNames.map((_, i) => i + 1);
    return distributeWeeklySessionsByDifficulty(
      ranks,
      data.studySessionsPerWeek || data.courseNames.length,
    );
  }, [data.tracks, data.courseNames, data.studySessionsPerWeek]);
}

/** Human-readable duration derived from start/end dates. */
export function getSemesterDurationLabel(
  startDate: string | null,
  endDate: string | null,
): string | null {
  if (!startDate || !endDate) return null;

  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null;
  }

  const dayMs = 1000 * 60 * 60 * 24;
  const days = Math.round((end.getTime() - start.getTime()) / dayMs) + 1;
  const weeks = Math.max(1, Math.round(days / 7));

  return `${days} days · about ${weeks} weeks`;
}
