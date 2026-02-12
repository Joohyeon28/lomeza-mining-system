import { useAuth } from '../contexts/AuthContext'

export const useDb = () => {
  const { getDb } = useAuth()
  return getDb()
}