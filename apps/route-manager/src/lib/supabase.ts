import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  const msg =
    "Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.";
  if (typeof document !== "undefined") {
    document.body.innerHTML = `<div style="font-family:system-ui,sans-serif;padding:2rem;max-width:600px;margin:4rem auto;color:#dc2626;">
      <h1 style="font-size:1.5rem;font-weight:900;">Configuration Error</h1>
      <p style="margin-top:1rem;">${msg}</p>
    </div>`;
  }
  throw new Error(msg);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
