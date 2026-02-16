import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (typeof window !== 'undefined') {
  if (!supabaseUrl) console.warn('VITE_SUPABASE_URL is not defined')
  else console.info('Supabase URL (runtime):', supabaseUrl)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const getSupabaseWithSchema = (_schema: string) => {
  return supabase.schema(_schema)
}

export const getClientForSchema = (_schema: string) => supabase.schema(_schema)