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
  ActiveSemesterBundle,
  fetchActiveSemesterBundle,
  upsertDailyProgress,
} from '../services/semesterService';
import {
  buildProgressSnapshot,
  ProgressSnapshot,
  toIsoDate,
} from '../utils/progressMath';
import { DailyProgress } from '../types/database';

type SemesterContextValue = {
  bundle: ActiveSemesterBundle | null;
  snapshot: ProgressSnapshot | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setGymCompletedToday: (completed: boolean) => Promise<void>;
  setStudySessionsToday: (count: number) => Promise<void>;
};

const SemesterContext = createContext<SemesterContextValue | undefined>(
  undefined,
);

type SemesterProviderProps = {
  children: ReactNode;
};

export function SemesterProvider({ children }: SemesterProviderProps) {
  const { profile } = useProfile();
  const [bundle, setBundle] = useState<ActiveSemesterBundle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!profile?.id || !profile.onboarding_complete) {
      setBundle(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const next = await fetchActiveSemesterBundle(profile.id);
      setBundle(next);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load semester data.';
      setError(message);
      setBundle(null);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, profile?.onboarding_complete]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const replaceProgressRow = useCallback((row: DailyProgress) => {
    setBundle((prev) => {
      if (!prev) return prev;
      const without = prev.progress.filter((item) => item.date !== row.date);
      return {
        ...prev,
        progress: [...without, row].sort((a, b) => a.date.localeCompare(b.date)),
      };
    });
  }, []);

  const setGymCompletedToday = useCallback(
    async (completed: boolean) => {
      if (!bundle) return;
      const today = toIsoDate(new Date());
      const existing = bundle.progress.find((row) => row.date === today);
      const row = await upsertDailyProgress({
        semesterId: bundle.semester.id,
        date: today,
        studySessionsCompleted: existing?.study_sessions_completed ?? 0,
        gymCompleted: completed,
      });
      replaceProgressRow(row);
    },
    [bundle, replaceProgressRow],
  );

  const setStudySessionsToday = useCallback(
    async (count: number) => {
      if (!bundle) return;
      const today = toIsoDate(new Date());
      const existing = bundle.progress.find((row) => row.date === today);
      const row = await upsertDailyProgress({
        semesterId: bundle.semester.id,
        date: today,
        studySessionsCompleted: Math.max(0, count),
        gymCompleted: existing?.gym_completed ?? false,
      });
      replaceProgressRow(row);
    },
    [bundle, replaceProgressRow],
  );

  const snapshot = useMemo(() => {
    if (!bundle) return null;
    return buildProgressSnapshot(bundle);
  }, [bundle]);

  const value = useMemo<SemesterContextValue>(
    () => ({
      bundle,
      snapshot,
      isLoading,
      error,
      refresh,
      setGymCompletedToday,
      setStudySessionsToday,
    }),
    [
      bundle,
      snapshot,
      isLoading,
      error,
      refresh,
      setGymCompletedToday,
      setStudySessionsToday,
    ],
  );

  return (
    <SemesterContext.Provider value={value}>{children}</SemesterContext.Provider>
  );
}

export function useSemester() {
  const context = useContext(SemesterContext);
  if (!context) {
    throw new Error('useSemester must be used within a SemesterProvider');
  }
  return context;
}
