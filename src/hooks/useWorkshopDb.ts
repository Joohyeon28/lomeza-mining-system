import { useAuth } from '../contexts/AuthContext'
import { getSupabaseWithSchema } from '../lib/supabaseClient'
import { useMemo } from 'react'

export const useWorkshopDb = () => {
  const { canAccessWorkshop } = useAuth()

  if (!canAccessWorkshop()) {
    throw new Error('Unauthorized: Workshop access requires Admin role')
  }

  // Memoize the client so callers (components) can safely include it in
  // hook dependency arrays without causing repeated re-creation.
  return useMemo(() => getSupabaseWithSchema('workshop'), [])
}