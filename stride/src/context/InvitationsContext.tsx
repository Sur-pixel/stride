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
import { useProfile } from './ProfileContext';
import {
  acceptPartnerInvitation,
  cancelPartnerInvitation,
  declinePartnerInvitation,
  fetchMyInvitations,
  hydrateInvitations,
  InvitationView,
  sendPartnerInvitation,
  subscribeToIncomingInvitations,
} from '../services/invitationService';

type InvitationsContextValue = {
  incomingPending: InvitationView[];
  outgoingPending: InvitationView[];
  isLoading: boolean;
  error: string | null;
  send: (email: string) => Promise<void>;
  accept: (id: string) => Promise<void>;
  decline: (id: string) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const InvitationsContext = createContext<InvitationsContextValue | undefined>(
  undefined,
);

export function InvitationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { refreshProfile } = useProfile();
  const [invitations, setInvitations] = useState<InvitationView[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setInvitations([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const rows = await fetchMyInvitations();
      const hydrated = await hydrateInvitations(rows, user.id);
      setInvitations(hydrated);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load invitations.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Realtime: any change on partner_invitations that involves this user
  // triggers a re-fetch. Instant delivery for recipients + status updates
  // for senders when the recipient accepts/declines.
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToIncomingInvitations(user.id, () => {
      void refresh();
      // After acceptance we also want the profile row (partner_id) refreshed.
      void refreshProfile();
    });
    return unsubscribe;
  }, [user, refresh, refreshProfile]);

  const send = useCallback(
    async (email: string) => {
      await sendPartnerInvitation(email);
      await refresh();
    },
    [refresh],
  );

  const accept = useCallback(
    async (id: string) => {
      await acceptPartnerInvitation(id);
      await refresh();
      await refreshProfile();
    },
    [refresh, refreshProfile],
  );

  const decline = useCallback(
    async (id: string) => {
      await declinePartnerInvitation(id);
      await refresh();
    },
    [refresh],
  );

  const cancel = useCallback(
    async (id: string) => {
      await cancelPartnerInvitation(id);
      await refresh();
    },
    [refresh],
  );

  const { incomingPending, outgoingPending } = useMemo(() => {
    const incoming: InvitationView[] = [];
    const outgoing: InvitationView[] = [];
    invitations.forEach((invite) => {
      if (invite.status !== 'pending') return;
      if (invite.to_user_id === user?.id) incoming.push(invite);
      else if (invite.from_user_id === user?.id) outgoing.push(invite);
    });
    return { incomingPending: incoming, outgoingPending: outgoing };
  }, [invitations, user?.id]);

  const value = useMemo<InvitationsContextValue>(
    () => ({
      incomingPending,
      outgoingPending,
      isLoading,
      error,
      send,
      accept,
      decline,
      cancel,
      refresh,
    }),
    [
      incomingPending,
      outgoingPending,
      isLoading,
      error,
      send,
      accept,
      decline,
      cancel,
      refresh,
    ],
  );

  return (
    <InvitationsContext.Provider value={value}>
      {children}
    </InvitationsContext.Provider>
  );
}

export function useInvitations() {
  const context = useContext(InvitationsContext);
  if (!context) {
    throw new Error('useInvitations must be used within an InvitationsProvider');
  }
  return context;
}
