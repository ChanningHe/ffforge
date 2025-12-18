import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppProvider } from './contexts/AppContext'
import { ToastProvider } from './components/ui/toast'
import App from './App.tsx'
import './index.css'
import { initializeServerURL } from './lib/config'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Initialize server URL for desktop mode before rendering
initializeServerURL()
  .then(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <AppProvider>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <App />
            </ToastProvider>
          </QueryClientProvider>
        </AppProvider>
      </React.StrictMode>,
    )
  })
  .catch((error) => {
    console.error('Failed to initialize application:', error)
    // Render error message to user
    document.getElementById('root')!.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui;">
        <div style="text-align: center; max-width: 500px; padding: 20px;">
          <h1 style="color: #dc2626; margin-bottom: 16px;">Initialization Error</h1>
          <p style="color: #6b7280; margin-bottom: 8px;">Failed to initialize the application.</p>
          <p style="color: #9ca3af; font-size: 14px;">${error.message || error}</p>
        </div>
      </div>
    `
  })

