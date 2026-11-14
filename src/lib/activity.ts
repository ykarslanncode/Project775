import { supabase } from '@/lib/supabase';
import type { ActivitySection } from '@/types';

export async function logActivity(
  userId: string,
  action: string,
  section: ActivitySection,
  description: string = ''
) {
  try {
    await supabase.from('activity_logs').insert({
      user_id: userId,
      action,
      section,
      description,
    });
  } catch {
    // Non-critical: don't block user actions on logging failures
  }
}
