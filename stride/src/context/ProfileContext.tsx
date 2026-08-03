import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { ensureProfile } from '../services/profileService';
import { Profile } from '../types/database';

type ProfileContextValue = {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  setProfile: (profile: Profile | null) => void;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

type ProfileProviderProps = {
  children: ReactNode;
};

export function ProfileProvider({ children }: ProfileProviderProps) {
  const { user, session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextProfile = await ensureProfile(user);
      setProfile(nextProfile);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load your profile.';
      setError(message);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!session || !user) {
      setProfile(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    void refreshProfile();
  }, [session, user, refreshProfile]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      isLoading,
      error,
      refreshProfile,
      setProfile,
    }),
    [profile, isLoading, error, refreshProfile],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }

  return context;
}
