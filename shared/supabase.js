import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

export const SUPABASE_URL = 'https://zlemlpazljttsiwbzegu.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZW1scGF6bGp0dHNpd2J6ZWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MTg2ODMsImV4cCI6MjA5NzQ5NDY4M30.LhWvcWRLc6ADWW5B6HXbQ_tRQArxrlXyDJK8XeubTEU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
