import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';

function displayNameFromUser(user: User): string {
  const fullName = user.user_metadata?.full_name;
  if (typeof fullName === 'string' && fullName.trim()) {
    return fullName.trim();
  }

  return user.email ?? 'User';
}

/**
 * Every authenticated user has exactly one profile (id = auth.users.id).
 * Creates a row if the signup trigger has not run yet (e.g. pre-migration users).
 */
export async function ensureProfile(user: User): Promise<Profile> {
  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      name: displayNameFromUser(user),
      onboarding_complete: false,
    })
    .select('*')
    .single();

  if (insertError) {
    throw insertError;
  }

  return created;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
