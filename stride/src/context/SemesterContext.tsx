import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useProfile } from './ProfileContext';
import {
  completeStudySession,
  fetchSemesterContext,
  SemesterBundle,
  SemesterContext as SemesterContextData,
  setGymCompleted,
  undoStudySession,
} from '../services/semesterService';
import {
  buildProgressSnapshot,
  ProgressSnapshot,
  toIsoDate,
} from '../utils/progressMath';
import { DailyProgress, Semester } from '../types/database';

type SemesterContextValue = {
  bundle: SemesterBundle | null;
  snapshot: ProgressSnapshot | null;
  upcoming: Semester | null;
  past: Semester | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setGymCompletedToday: (completed: boolean) => Promise<void>;
  completeSession: (courseId: string) => Promise<void>;
  undoSession: (courseId: string) => Promise<void>;
};

const SemesterCtx = createContext<SemesterContextValue | undefined>(undefined);

type SemesterProviderProps = {
  children: ReactNode;
};

export function SemesterProvider({ children }: SemesterProviderProps) {
  const { profile } = useProfile();
  const [ctx, setCtx] = useState<SemesterContextData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!profile?.id || !profile.onboarding_complete) {
      setCtx(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const next = await fetchSemesterContext(profile.id);
      setCtx(next);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load semester data.';
      setError(message);
      setCtx(null);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, profile?.onboarding_complete]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const replaceProgressRow = useCallback((row: DailyProgress) => {
    setCtx((prev) => {
      if (!prev?.current) return prev;
      const without = prev.current.progress.filter(
        (item) => item.date !== row.date,
      );
      return {
        ...prev,
        current: {
          ...prev.current,
          progress: [...without, row].sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
        },
      };
    });
  }, []);

  const setGymCompletedToday = useCallback(
    async (completed: boolean) => {
      if (!ctx?.current) return;
      const today = toIsoDate(new Date());
      const row = await setGymCompleted(
        ctx.current.semester.id,
        today,
        completed,
      );
      replaceProgressRow(row);
    },
    [ctx?.current, replaceProgressRow],
  );

  const completeSession = useCallback(
    async (courseId: string) => {
      await completeStudySession(courseId);
      await refresh();
    },
    [refresh],
  );

  const undoSession = useCallback(
    async (courseId: string) => {
      await undoStudySession(courseId);
      await refresh();
    },
    [refresh],
  );

  const snapshot = useMemo(() => {
    if (!ctx?.current) return null;
    return buildProgressSnapshot(ctx.current);
  }, [ctx?.current]);

  const value = useMemo<SemesterContextValue>(
    () => ({
      bundle: ctx?.current ?? null,
      snapshot,
      upcoming: ctx?.upcoming ?? null,
      past: ctx?.past ?? null,
      isLoading,
      error,
      refresh,
      setGymCompletedToday,
      completeSession,
      undoSession,
    }),
    [
      ctx?.current,
      ctx?.upcoming,
      ctx?.past,
      snapshot,
      isLoading,
      error,
      refresh,
      setGymCompletedToday,
      completeSession,
      undoSession,
    ],
  );

  return (
    <SemesterCtx.Provider value={value}>{children}</SemesterCtx.Provider>
  );
}

export function useSemester() {
  const context = useContext(SemesterCtx);
  if (!context) {
    throw new Error('useSemester must be used within a SemesterProvider');
  }
  return context;
}
