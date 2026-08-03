import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

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
  gymDaysPerWeek: number | null;
  workoutDays: DayOfWeek[];
  courseLoad: CourseLoad | null;
  studySessionsPerWeek: number;
  courseNames: string[];
};

type OnboardingContextValue = {
  data: OnboardingData;
  isComplete: boolean;
  toggleTrack: (track: TrackType) => void;
  setGymDaysPerWeek: (days: number) => void;
  toggleWorkoutDay: (day: DayOfWeek) => void;
  setCourseLoad: (load: CourseLoad) => void;
  setStudySessionsPerWeek: (sessions: number) => void;
  setCourseName: (index: number, name: string) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
};

const initialData: OnboardingData = {
  tracks: [],
  gymDaysPerWeek: null,
  workoutDays: [],
  courseLoad: null,
  studySessionsPerWeek: 5,
  courseNames: [],
};

const OnboardingContext = createContext<OnboardingContextValue | undefined>(
  undefined,
);

type OnboardingProviderProps = {
  children: ReactNode;
};

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [data, setData] = useState<OnboardingData>(initialData);
  const [isComplete, setIsComplete] = useState(false);

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

  const setGymDaysPerWeek = useCallback((days: number) => {
    setData((prev) => ({
      ...prev,
      gymDaysPerWeek: days,
      // Trim excess selected days if the target count decreases.
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

      return {
        ...prev,
        courseLoad: load,
        courseNames: nextNames,
      };
    });
  }, []);

  const setStudySessionsPerWeek = useCallback((sessions: number) => {
    setData((prev) => ({
      ...prev,
      studySessionsPerWeek: Math.min(14, Math.max(1, sessions)),
    }));
  }, []);

  const setCourseName = useCallback((index: number, name: string) => {
    setData((prev) => {
      const nextNames = [...prev.courseNames];
      nextNames[index] = name;
      return { ...prev, courseNames: nextNames };
    });
  }, []);

  const completeOnboarding = useCallback(() => {
    // TODO: Persist onboarding data to Supabase
    setIsComplete(true);
  }, []);

  const resetOnboarding = useCallback(() => {
    setData(initialData);
    setIsComplete(false);
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      data,
      isComplete,
      toggleTrack,
      setGymDaysPerWeek,
      toggleWorkoutDay,
      setCourseLoad,
      setStudySessionsPerWeek,
      setCourseName,
      completeOnboarding,
      resetOnboarding,
    }),
    [
      data,
      isComplete,
      toggleTrack,
      setGymDaysPerWeek,
      toggleWorkoutDay,
      setCourseLoad,
      setStudySessionsPerWeek,
      setCourseName,
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
