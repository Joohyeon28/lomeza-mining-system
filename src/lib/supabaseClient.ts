import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Single shared Supabase client (no explicit schema). Keeping one client
// avoids creating multiple GoTrueClient instances and allows us to
// query fully-qualified tables like 'sileko.assets' without double-prefixing.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Return a thin wrapper that prefixes table names with the requested
// schema but delegates all operations to the single `supabase` client.
// This preserves auth/session state while avoiding extra clients.
export const getSupabaseWithSchema = (schema: string) => {
  // Use a schema-scoped transient client for calls so callers can use
  // `.from('table')` and the request goes to `/rest/v1/table` with the
  // client's `db.schema` set appropriately.
  const wrapper: any = {
    from: (table: string) => getClientForSchema(schema).from(table),
    rpc: (...args: any[]) => getClientForSchema(schema).rpc(...args),
    auth: getClientForSchema(schema).auth,
    fromRaw: (qualifiedTable: string) => getClientForSchema(schema).from(qualifiedTable),
  }

  return wrapper
}

// Create and return a transient Supabase client scoped to `schema`.
// This is useful for querying tables in other schemas using the normal
// `from('table')` calls (avoids passing a dotted table name which some
// clients may mishandle). The client will be given the current session's
// access token so it uses the same authenticated user context.
export const getClientForSchema = (schema: string) => {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    db: { schema }
  })

  // Propagate existing session token to the new client
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.access_token) {
      // @ts-ignore - setAuth exists on the client
      client.auth.setAuth(session.access_token)
    }
  }).catch(() => {})

  return client
}