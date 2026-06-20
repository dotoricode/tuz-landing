import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// DEMO DEPLOYMENT — replace these two values with your new Supabase project credentials
export const SUPABASE_URL = 'REPLACE_WITH_DEMO_SUPABASE_URL';
export const SUPABASE_ANON_KEY = 'REPLACE_WITH_DEMO_SUPABASE_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
