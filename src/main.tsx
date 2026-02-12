// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './assets/css/style.css'   // <-- your custom styles FIRST
import './index.css'             // <-- remove this if you want full override
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)