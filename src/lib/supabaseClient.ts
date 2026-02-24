import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (typeof window !== 'undefined') {
  if (!supabaseUrl) console.warn('VITE_SUPABASE_URL is not defined')
  else {
    // Supabase URL runtime logging removed
  }
}

// Explicitly configure auth persistence to use localStorage and avoid
// automatic URL-based session detection which can interfere in some dev setups.
const supabaseOptions = {
  auth: {
    persistSession: true,
    detectSessionInUrl: false,
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions)

// Debug: expose client to window for manual inspection in development
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.__supabase = supabase
  try {
    const raw = localStorage.getItem('lomeza:session')
    // intentionally silent; do not log saved session
  } catch (e) {
    // ignore
  }
}

export const getSupabaseWithSchema = (_schema: string) => {
  return supabase.schema(_schema)
}

export const getClientForSchema = (_schema: string) => supabase.schema(_schema)