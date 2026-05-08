import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

export const SUPABASE_URL = 'https://lwgissxdvemamuybxmxz.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3Z2lzc3hkdmVtYW11eWJ4bXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MjMxNjgsImV4cCI6MjA5MjA5OTE2OH0.bslx3DGC2KPKleWo9KejERD10e92OeBEUoQHg2_jPOo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
