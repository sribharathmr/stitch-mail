import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import ComposeWindow from './ComposeWindow'
import GeminiSidebar from './GeminiSidebar'
import { useEmail } from '../context/EmailContext'
import { useUI } from '../context/UIContext'
import './AppShell.css'

export default function AppShell() {
  const { composeWindows, dispatch } = useEmail()
  const { geminiSidebarOpen } = useUI()

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't fire if typing in an input, textarea, or contenteditable
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return
      // Don't fire if modifier keys are pressed
      if (e.ctrlKey || e.metaKey || e.altKey) return

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        dispatch({ type: 'OPEN_COMPOSE' })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [composeWindows, dispatch])
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <div className="app-content-wrapper">
          <div className="app-content">
            <Outlet />
          </div>
          <GeminiSidebar />
        </div>
      </div>
      {composeWindows.map((win, idx) => (
        <ComposeWindow key={win.id} windowState={win} index={idx} />
      ))}
    </div>
  )
}
