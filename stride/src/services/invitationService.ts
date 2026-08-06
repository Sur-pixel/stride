import { supabase } from '../lib/supabase';
import { PartnerInvitation } from '../types/database';

export type InvitationView = PartnerInvitation & {
  from_name: string | null;
  from_email: string | null;
  to_name: string | null;
};

/** All invitations where the current user is sender or recipient. */
export async function fetchMyInvitations(): Promise<PartnerInvitation[]> {
  const { data, error } = await supabase
    .from('partner_invitations')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Lookup profile names for a set of invitation counterparts. */
export async function hydrateInvitations(
  invitations: PartnerInvitation[],
  currentUserId: string,
): Promise<InvitationView[]> {
  const counterpartIds = new Set<string>();
  invitations.forEach((invite) => {
    if (invite.from_user_id !== currentUserId) counterpartIds.add(invite.from_user_id);
    if (invite.to_user_id && invite.to_user_id !== currentUserId) {
      counterpartIds.add(invite.to_user_id);
    }
  });

  const nameByProfileId = new Map<string, string>();
  if (counterpartIds.size > 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', Array.from(counterpartIds));
    // Partner cross-read RLS only allows reading the current user's partner;
    // sender/recipient profile lookups may fail silently — that's OK, we
    // fall back to the raw email/id in the UI.
    if (!error && data) {
      data.forEach((row) => nameByProfileId.set(row.id, row.name));
    }
  }

  return invitations.map((invite) => ({
    ...invite,
    from_name: nameByProfileId.get(invite.from_user_id) ?? null,
    to_name: invite.to_user_id
      ? nameByProfileId.get(invite.to_user_id) ?? null
      : null,
    from_email: null,
  }));
}

export async function sendPartnerInvitation(toEmail: string): Promise<string> {
  const { data, error } = await supabase.rpc('send_partner_invitation', {
    p_to_email: toEmail,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function acceptPartnerInvitation(id: string): Promise<void> {
  const { error } = await supabase.rpc('accept_partner_invitation', {
    p_invitation_id: id,
  });
  if (error) throw new Error(error.message);
}

export async function declinePartnerInvitation(id: string): Promise<void> {
  const { error } = await supabase.rpc('decline_partner_invitation', {
    p_invitation_id: id,
  });
  if (error) throw new Error(error.message);
}

export async function cancelPartnerInvitation(id: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_partner_invitation', {
    p_invitation_id: id,
  });
  if (error) throw new Error(error.message);
}

export async function unpairPartner(): Promise<void> {
  const { error } = await supabase.rpc('unpair_partner');
  if (error) throw new Error(error.message);
}

/** Realtime channel for invitations addressed to the current user. */
export function subscribeToIncomingInvitations(
  userId: string,
  onChange: () => void,
) {
  const channel = supabase
    .channel(`invitations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'partner_invitations',
        filter: `to_user_id=eq.${userId}`,
      },
      () => onChange(),
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'partner_invitations',
        filter: `from_user_id=eq.${userId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
