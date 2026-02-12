import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Base client (default schema = 'public')
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' }
})

// Helper to get a client for a specific schema
export const getSupabaseWithSchema = (schema: string) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    db: { schema }
  })
}