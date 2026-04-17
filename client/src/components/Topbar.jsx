import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmail } from '../context/EmailContext'
import { useUI } from '../context/UIContext'
import { useAuth } from '../context/AuthContext'
import AccountDropdown from './AccountDropdown'
import './Topbar.css'
export default function Topbar() {
  const { dispatch } = useEmail()
  const { searchQuery, setSearchQuery, setMobileMenuOpen, geminiSidebarOpen, setGeminiSidebarOpen } = useUI()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [localQ, setLocalQ] = useState(searchQuery)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showHelpDropdown, setShowHelpDropdown] = useState(false)
  const debounceRef = useRef(null)

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
      {/* Mobile hamburger menu */}
      <button
        className="topbar-mobile-menu btn-icon"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M3 12h18M3 6h18M3 18h18"/>
        </svg>
      </button>

      <form className="topbar-search" onSubmit={handleSearch}>
        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          id="topbar-search-input"
          type="text"
          placeholder="Search mail"
          value={localQ}
          onChange={e => setLocalQ(e.target.value)}
          className="topbar-search-input"
        />
        {localQ && (
          <button type="button" className="search-clear" onClick={() => { setLocalQ(''); setSearchQuery('') }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
        <button type="button" className="search-options-btn" title="Show search options">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14"></line>
            <line x1="4" y1="10" x2="4" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12" y2="3"></line>
            <line x1="20" y1="21" x2="20" y2="16"></line>
            <line x1="20" y1="12" x2="20" y2="3"></line>
            <line x1="1" y1="14" x2="7" y2="14"></line>
            <line x1="9" y1="8" x2="15" y2="8"></line>
            <line x1="17" y1="16" x2="23" y2="16"></line>
          </svg>
        </button>
      </form>

      <div className="topbar-actions">
        <button 
          className={`btn-icon topbar-icon-btn ${showHelpDropdown ? 'active' : ''}`} 
          title="Support" 
          onClick={() => setShowHelpDropdown(!showHelpDropdown)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </button>

        <button className="btn-icon topbar-icon-btn" title="Settings" onClick={() => navigate('/settings')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>

        <button 
          className={`btn-icon topbar-icon-btn ${geminiSidebarOpen ? 'active' : ''}`}
          title="Gemini / AI Features"
          onClick={() => setGeminiSidebarOpen(v => !v)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l2.6 6.4L21 11l-6.4 2.6L12 20l-2.6-6.4L3 11l6.4-2.6z"></path>
          </svg>
        </button>


        <button 
          className="topbar-avatar-btn" 
          onClick={() => setShowDropdown(true)}
          title="Google Account"
        >
          <div className="topbar-avatar-initials">
            {(user?.name || user?.email || 'U')[0].toUpperCase()}
          </div>
        </button>
      </div>

      {showHelpDropdown && (
        <div className="account-dropdown-overlay" onClick={() => setShowHelpDropdown(false)} style={{ zIndex: 9999 }}>
          <div className="help-dropdown-container" onClick={e => e.stopPropagation()}>
            <button className="help-dropdown-item" onClick={() => window.open('mailto:support@stitchmail.com', '_blank')}>Help</button>
            <button className="help-dropdown-item">Training</button>
            <div className="help-dropdown-divider" />
            <button className="help-dropdown-item">Send feedback</button>
          </div>
        </div>
      )}

      {showDropdown && <AccountDropdown onClose={() => setShowDropdown(false)} />}
    </header>
  )
}
