import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import ComposeModal from './ComposeModal'
import { useEmail } from '../context/EmailContext'
import './AppShell.css'

export default function AppShell() {
  const { composeOpen, dispatch } = useEmail()

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't fire if typing in an input, textarea, or contenteditable
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return
      // Don't fire if compose is already open or modifier keys are pressed
      if (composeOpen || e.ctrlKey || e.metaKey || e.altKey) return

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        dispatch({ type: 'OPEN_COMPOSE' })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [composeOpen, dispatch])
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <div className="app-content">
          <Outlet />
        </div>
      </div>
      {composeOpen && <ComposeModal />}
    </div>
  )
}
