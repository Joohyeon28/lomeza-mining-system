import { supabase, getClientForSchema } from './supabaseClient'

const cache = new Map<string, any>()

export function getCachedUser(id: string) {
  return cache.get(id) || null
}

export function setCachedUser(id: string, user: any) {
  if (!id || !user) return
  cache.set(id, user)
}

export async function fetchAndCacheUser(id: string, getDb: () => any, _site?: string) {
  if (!id) return null
  // prefer public first, then site-local, then global
  try {
    const pub = getClientForSchema('public')
    const r2 = await pub.from('users').select('*').eq('id', id).limit(1)
    if (!r2.error && r2.data && r2.data.length) {
      setCachedUser(id, r2.data[0])
      return r2.data[0]
    }
  } catch (e) {
    // ignore
  }

  try {
    const db = getDb()
    const r1 = await db.from('users').select('*').eq('id', id).limit(1)
    if (!r1.error && r1.data && r1.data.length) {
      setCachedUser(id, r1.data[0])
      return r1.data[0]
    }
  } catch (e) {
    // ignore
  }

  try {
    const r3 = await supabase.from('users').select('*').eq('id', id).limit(1)
    if (!r3.error && r3.data && r3.data.length) {
      setCachedUser(id, r3.data[0])
      return r3.data[0]
    }
  } catch (e) {
    // ignore
  }

  return null
}
