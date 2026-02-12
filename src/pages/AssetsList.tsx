import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export default function AssetsList() {
  const { site } = useAuth()
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!site) return
    let mounted = true
    setLoading(true)
    ;(async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('site', site)
      if (!mounted) return
      if (error) setError(error.message)
      else setAssets(data ?? [])
      setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [site])

  if (!site) return <div>Please sign in</div>
  if (loading) return <div>Loading...</div>
  if (error) return <div style={{ color: 'red' }}>{error}</div>

  return (
    <div>
      <h2>Assets</h2>
      <ul>
        {assets.map((a) => (
          <li key={a.id}>{a.name}</li>
        ))}
      </ul>
    </div>
  )
}
