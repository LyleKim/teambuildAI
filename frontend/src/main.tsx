import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SessionProvider } from '@/context/SessionContext'
import { RouterProvider } from '@/lib/router'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider>
      <SessionProvider>
        <App />
      </SessionProvider>
    </RouterProvider>
  </React.StrictMode>,
)
