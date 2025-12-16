import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useState, useEffect } from 'react'

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Auto-collapse sidebar on small screens
  useEffect(() => {
    const handleResize = () => {
      // Auto-collapse on screens smaller than 1280px (xl breakpoint)
      if (window.innerWidth < 1280) {
        setSidebarCollapsed(true)
      } else if (window.innerWidth >= 1536) {
        // Auto-expand on screens larger than 1536px (2xl breakpoint)
        setSidebarCollapsed(false)
      }
    }

    // Run on mount
    handleResize()

    // Listen to window resize
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}




