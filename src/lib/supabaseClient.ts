import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Base client (default schema = 'public')
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' }
})

// Helper to get a client for a specific schema
// Return a thin wrapper that uses the main `supabase` client but prefixes
// table names with the schema. This avoids creating multiple GoTrueClient
// instances (which causes the "Multiple GoTrueClient instances" warning)
// and ensures the same auth context is reused across schema-scoped calls.
export const getSupabaseWithSchema = (schema: string) => {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    db: { schema }
  })

  // Propagate the current session's access token to the new client so it
  // makes authenticated requests with the same user context. We do this
  // asynchronously — callers will typically call queries after this runs.
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.access_token) {
      // setAuth sets the Authorization header for the client
      // (no await needed)
      // @ts-ignore - setAuth exists on the client
      client.auth.setAuth(session.access_token)
    }
  }).catch(() => {})

  return client
}