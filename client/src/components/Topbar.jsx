import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmail } from '../context/EmailContext'
import { useUI } from '../context/UIContext'
import './Topbar.css'

export default function Topbar() {
  const { dispatch } = useEmail()
  const { searchQuery, setSearchQuery, setMobileMenuOpen, toggleSidebar, sidebarExpanded } = useUI()
  const navigate = useNavigate()
  const [localQ, setLocalQ] = useState(searchQuery)
  const debounceRef = useRef(null)

  // Real-time debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (localQ.trim()) {
        setSearchQuery(localQ)
        navigate(`/search?q=${encodeURIComponent(localQ)}`)
      } else if (localQ === '' && searchQuery) {
        setSearchQuery('')
      }
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [localQ])

  const handleSearch = (e) => {
    e.preventDefault()
    if (localQ.trim()) {
      setSearchQuery(localQ)
      navigate(`/search?q=${encodeURIComponent(localQ)}`)
    }
  }

  return (
    <header className="topbar">
      {/* Hamburger — desktop: toggles sidebar expand/collapse; mobile: opens drawer */}
      <button
        id="main-menu-btn"
        className="topbar-menu-btn btn-icon"
        title="Main menu"
        aria-label="Main menu"
        onClick={() => {
          // On mobile open the drawer; on desktop toggle expand
          if (window.innerWidth <= 768) {
            setMobileMenuOpen(true)
          } else {
            toggleSidebar()
          }
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Logo — clickable, navigates to inbox */}
      <button
        id="topbar-logo-btn"
        className="topbar-logo-btn"
        title="Stitch Mail"
        onClick={() => navigate('/inbox')}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M3 8l9-5 9 5v8l-9 5-9-5V8z" stroke="#3B82F6" strokeWidth="2" fill="none"/>
          <path d="M3 8l9 5 9-5" stroke="#3B82F6" strokeWidth="2"/>
          <path d="M12 13v8" stroke="#3B82F6" strokeWidth="2"/>
        </svg>
        <span className="topbar-logo-text">Stitch Mail</span>
      </button>

      <form className="topbar-search" onSubmit={handleSearch}>
        <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          id="topbar-search-input"
          type="text"
          placeholder="Search emails, people, topics..."
          value={localQ}
          onChange={e => setLocalQ(e.target.value)}
          className="topbar-search-input"
        />
        {localQ && (
          <button type="button" className="search-clear" onClick={() => { setLocalQ(''); setSearchQuery('') }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </form>

      <div className="topbar-actions">
        <button
          id="topbar-compose-btn"
          className="btn btn-primary btn-sm"
          onClick={() => dispatch({ type: 'OPEN_COMPOSE' })}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Compose
        </button>

        <button className="btn-icon" id="topbar-notif-btn" data-tooltip="Notifications">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </button>
      </div>
    </header>
  )
}
