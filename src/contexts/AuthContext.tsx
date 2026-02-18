import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getSupabaseWithSchema } from '../lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  role: string | null
  site: string | null
  displayName: string | null
  loading: boolean
  canAccessWorkshop: () => boolean
  signIn: (email: string, password: string, selectedSite: string) => Promise<void>
  signOut: () => Promise<void>
  // Returns a Supabase client pre‑configured with the user’s site schema
  getDb: () => ReturnType<typeof getSupabaseWithSchema>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [site, setSite] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const canAccessWorkshop = () => {
  return role?.toLowerCase() === 'admin' // Add other roles here later (e.g., 'workshopmanager')
}

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session && session.user) {
          setUser(session.user)
          await fetchUserDetails(session.user.id)
          setLoading(false)
          return
        }

        // Fallback: if Supabase didn't return a session, try restoring a
        // previously saved session from localStorage. This helps when the
        // Supabase client didn't rehydrate its internal storage (rare but
        // can happen in some dev/proxy setups or storage-restricted browsers).
        const raw = localStorage.getItem('lomeza:session')
        if (raw) {
          try {
            const saved = JSON.parse(raw)
            // saved should contain an object with access_token and refresh_token
            if (saved?.access_token && saved?.refresh_token) {
              const { data: restored, error: restoreErr } = await supabase.auth.setSession({
                access_token: saved.access_token,
                refresh_token: saved.refresh_token,
              })
              if (!restoreErr && restored?.session?.user) {
                setUser(restored.session.user)
                await fetchUserDetails(restored.session.user.id)
              }
            }
          } catch (e) {
            // ignore malformed JSON or restore errors
          }
        }
      } catch (e) {
        console.warn('Failed to read auth session on startup', e)
      } finally {
        setLoading(false)
      }
    })()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchUserDetails(session.user.id)
      else {
        setRole(null)
        setSite(null)
        try {
          localStorage.removeItem('lomeza:session')
        } catch (e) {
          // ignore
        }
      }
    })

    return () => listener?.subscription.unsubscribe()
  }, [])

  async function fetchUserDetails(userId: string) {
    // Always query public.users
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) {
      // Normalize role/site to lowercase to avoid case-matching issues
      setRole(typeof data.role === 'string' ? data.role.toLowerCase() : data.role)
      setSite(typeof data.site === 'string' ? data.site.toLowerCase() : data.site)
      // Try common name fields from the profile row
      const name = data.full_name || data.name || (data.first_name ? `${data.first_name}${data.last_name ? ' ' + data.last_name : ''}` : null) || null
      setDisplayName(name)
    }
  }

  async function signIn(email: string, password: string, selectedSite: string) {
    let signInResult
    try {
      signInResult = await supabase.auth.signInWithPassword({ email, password })
    } catch (err: any) {
      console.error('Network error during signInWithPassword:', err)
      throw new Error('Network error contacting authentication service. Check your Supabase URL or start the local Supabase emulator.')
    }

    const { error } = signInResult
    if (error) throw error

    // After login, fetch the user's profile to verify site
    const { data: userData, error: profileError } = await supabase
      .from('users')
      .select('site, role')
      .eq('email', email)
      .single()

    if (profileError || !userData) {
      await supabase.auth.signOut()
      throw new Error('User profile not found.')
    }

    // Compare site case-insensitively
    const profileSite = typeof userData.site === 'string' ? userData.site.toLowerCase() : userData.site
    const requestedSite = typeof selectedSite === 'string' ? selectedSite.toLowerCase() : selectedSite
    if (profileSite !== requestedSite) {
      await supabase.auth.signOut()
      throw new Error(`You are not registered under ${selectedSite}.`)
    }

    // setSite and setRole will be updated by onAuthStateChange
    // Persist session to localStorage as a defensive fallback in case the
    // Supabase client does not rehydrate its internal storage on a reload.
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const toSave = {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          user: session.user,
        }
        try {
          localStorage.setItem('lomeza:session', JSON.stringify(toSave))
        } catch (e) {
          // ignore storage errors
        }
      }
    } catch (e) {
      // ignore
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut()
    } finally {
      try {
        localStorage.removeItem('lomeza:session')
      } catch (e) {
        // ignore
      }
    }
  }

  // Returns a Supabase client for the user's site schema
  const getDb = () => {
    if (!site) throw new Error('No site selected – user may not be authenticated.')
    return getSupabaseWithSchema(site.toLowerCase())
  }

  return (
    <AuthContext.Provider value={{ user, role, site, displayName, loading, canAccessWorkshop, signIn, signOut, getDb }}>
      {children}
    </AuthContext.Provider>
  )
}



export const useAuth = () => useContext(AuthContext)