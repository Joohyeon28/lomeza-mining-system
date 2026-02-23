import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function DatabaseTest() {
  const [testResult, setTestResult] = useState<string>('Testing connection...')
  const [error, setError] = useState<string>('')
  const [tables, setTables] = useState<string[]>([])

  useEffect(() => {
    async function testConnection() {
      try {
        // Try to query a table that actually exists in your schema
        const { error } = await supabase
          .from('users')
          .select('count', { count: 'exact', head: true })
        
        if (error) throw error
        
        setTestResult('✅ Successfully connected to Supabase! Tables exist.')
        
        // Optional: List available tables
        const tables = [
          'users', 'assets', 'blocks', 'breakdowns', 'exceptions',
          'production_entries', 'shifts', 'shift_plans', 'workshop_jobs'
        ]
        setTables(tables)
        
      } catch (err: any) {
        // If still getting "relation does not exist", schema wasn't imported
        if (err.message?.includes('relation') || err.message?.includes('does not exist')) {
          setError('Tables not found. Please import the schema into Supabase SQL Editor.')
        } else {
          setError(err.message)
        }
        setTestResult('❌ Connection failed - Schema not imported')
        console.error('Connection error:', err)
      }
    }

    testConnection()
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Database Connection Test</h2>
      <div style={{ 
        padding: '15px', 
        background: error ? '#fff3cd' : '#f5f5f5',
        borderRadius: '4px',
        border: `1px solid ${error ? '#ffc107' : '#ddd'}`
      }}>
        <p><strong>Status:</strong> {testResult}</p>
        {error && (
          <div style={{ color: '#856404', background: '#fff3cd', padding: '10px', borderRadius: '4px' }}>
            <strong>⚠️ {error}</strong>
            <p style={{ marginTop: '10px', fontSize: '14px' }}>
              <strong>To fix:</strong> Go to Supabase Dashboard → SQL Editor → New Query → Paste your schema SQL → Run
            </p>
          </div>
        )}
        {tables.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <p><strong>Available tables:</strong> {tables.join(', ')}</p>
          </div>
        )}
        <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
          URL: {import.meta.env.VITE_SUPABASE_URL?.substring(0, 30)}...
        </p>
      </div>
    </div>
  )
}