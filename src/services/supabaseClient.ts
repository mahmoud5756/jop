import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser-side Supabase client, used ONLY for uploading files directly to
 * Supabase Storage using a short-lived signed upload URL/token obtained from
 * our own backend (`/api/uploads/signed-url`). It is deliberately built with
 * the public anon key — safe to expose in the browser bundle — never the
 * service role key, which stays server-side only (see server/supabase.ts).
 *
 * Requires these Vite environment variables to be set (in .env / Vercel
 * project settings):
 *   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
 *   VITE_SUPABASE_ANON_KEY=<the anon/public API key from Supabase settings>
 *
 * If they're not set, uploads simply aren't attempted client-side and the
 * calling code shows a clear error instead of failing silently.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseBrowserClient: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

export function isDirectUploadConfigured(): boolean {
  return Boolean(supabaseBrowserClient);
}
