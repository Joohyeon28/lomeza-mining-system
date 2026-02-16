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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchUserDetails(session.user.id)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchUserDetails(session.user.id)
      else {
        setRole(null)
        setSite(null)
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
  }

  async function signOut() {
    await supabase.auth.signOut()
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