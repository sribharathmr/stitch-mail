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
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [advSearch, setAdvSearch] = useState({
    from: '', to: '', subject: '', includes: '', excludes: '',
    sizeComparator: 'greater than', sizeVal: '', sizeUnit: 'MB',
    dateRange: '', dateValue: '', searchFolder: 'All Mail',
    hasAttachment: false, dontIncludeChats: false
  })

  // Prevent closing when clicking inside the advanced search box
  const handleAdvSearchContainerClick = (e) => {
    e.stopPropagation()
  }

  const [showHelpDropdown, setShowHelpDropdown] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const q = localQ || ''
      if (q.trim()) {
        setSearchQuery(q)
        navigate(`/search?q=${encodeURIComponent(q)}`)
      } else if (q === '' && searchQuery) {
        setSearchQuery('')
      }
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [localQ])

  const handleSearch = (e) => {
    if (e) e.preventDefault()
    const q = localQ || ''
    if (q.trim()) {
      setSearchQuery(q)
      navigate(`/search?q=${encodeURIComponent(q)}`)
    }
  }

  const submitAdvancedSearch = (e) => {
    if (e) e.preventDefault()
    
    // Build query params
    const params = new URLSearchParams()
    
    // The "includes" acts as the generic 'q' locally, but we can also build a structured q
    // Wait, let's keep them separate if the backend supports it, or combine into 'q'
    // To strictly follow backend plan:
    if (advSearch.includes) params.append('q', advSearch.includes)
    else if (localQ.trim()) params.append('q', localQ)
    else params.append('q', ' ') // backend requires q

    if (advSearch.from) params.append('sender', advSearch.from)
    if (advSearch.to) params.append('to', advSearch.to)
    if (advSearch.subject) params.append('subject', advSearch.subject)
    if (advSearch.excludes) params.append('excludes', advSearch.excludes)
    if (advSearch.sizeVal) {
      params.append('sizeComparator', advSearch.sizeComparator)
      params.append('sizeVal', advSearch.sizeVal)
      params.append('sizeUnit', advSearch.sizeUnit)
    }
    if (advSearch.dateRange) params.append('dateRange', advSearch.dateRange)
    if (advSearch.searchFolder && advSearch.searchFolder !== 'All Mail') params.append('folder', advSearch.searchFolder.toLowerCase())
    if (advSearch.hasAttachment) params.append('hasAttachment', 'true')

    setSearchQuery(advSearch.includes || localQ || ' ')
    setShowAdvancedSearch(false)
    navigate(`/search?${params.toString()}`)
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

      <div className="topbar-search-container">
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
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {localQ && (
            <button type="button" className="search-clear" onClick={() => { setLocalQ(''); setSearchQuery('') }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
          <button type="button" className="search-options-btn" title="Show search options" onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}>
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

        {showAdvancedSearch && (
          <>
            <div className="adv-search-overlay" onClick={() => setShowAdvancedSearch(false)}></div>
            <div className="adv-search-dropdown" onClick={handleAdvSearchContainerClick}>
              <div className="adv-search-row">
                <label>From</label>
                <input type="text" value={advSearch.from} onChange={e => setAdvSearch({...advSearch, from: e.target.value})} />
              </div>
              <div className="adv-search-row">
                <label>To</label>
                <input type="text" value={advSearch.to} onChange={e => setAdvSearch({...advSearch, to: e.target.value})} />
              </div>
              <div className="adv-search-row">
                <label>Subject</label>
                <input type="text" value={advSearch.subject} onChange={e => setAdvSearch({...advSearch, subject: e.target.value})} />
              </div>
              <div className="adv-search-row">
                <label>Includes the words</label>
                <input type="text" value={advSearch.includes} onChange={e => {
                  setAdvSearch({...advSearch, includes: e.target.value})
                  setLocalQ(e.target.value)
                }} />
              </div>
              <div className="adv-search-row">
                <label>Doesn't have</label>
                <input type="text" value={advSearch.excludes} onChange={e => setAdvSearch({...advSearch, excludes: e.target.value})} />
              </div>
              
              <div className="adv-search-row inline-group">
                <label>Size</label>
                <select value={advSearch.sizeComparator} onChange={e => setAdvSearch({...advSearch, sizeComparator: e.target.value})}>
                  <option value="greater than">greater than</option>
                  <option value="less than">less than</option>
                </select>
                <input type="number" className="size-input" value={advSearch.sizeVal} onChange={e => setAdvSearch({...advSearch, sizeVal: e.target.value})} />
                <select value={advSearch.sizeUnit} onChange={e => setAdvSearch({...advSearch, sizeUnit: e.target.value})}>
                  <option value="MB">MB</option>
                  <option value="KB">KB</option>
                  <option value="Bytes">Bytes</option>
                </select>
              </div>
              
              <div className="adv-search-row inline-group">
                <label>Date within</label>
                <select value={advSearch.dateRange} onChange={e => setAdvSearch({...advSearch, dateRange: e.target.value})}>
                  <option value="">Any time</option>
                  <option value="1 day">1 day</option>
                  <option value="3 days">3 days</option>
                  <option value="1 week">1 week</option>
                  <option value="2 weeks">2 weeks</option>
                  <option value="1 month">1 month</option>
                  <option value="2 months">2 months</option>
                  <option value="6 months">6 months</option>
                  <option value="1 year">1 year</option>
                </select>
                {/* Date relative input omitted for simplicity, matching simple Google dropdown behaviour usually combining with relative today */}
              </div>

              <div className="adv-search-row inline-group">
                <label>Search</label>
                <select className="full-width-select" value={advSearch.searchFolder} onChange={e => setAdvSearch({...advSearch, searchFolder: e.target.value})}>
                  <option value="All Mail">All Mail</option>
                  <option value="Inbox">Inbox</option>
                  <option value="Starred">Starred</option>
                  <option value="Sent">Sent Mail</option>
                  <option value="Drafts">Drafts</option>
                  <option value="Spam">Spam</option>
                  <option value="Trash">Trash</option>
                </select>
              </div>

              <div className="adv-search-checkbox-row">
                <label className="checkbox-label">
                  <input type="checkbox" checked={advSearch.hasAttachment} onChange={e => setAdvSearch({...advSearch, hasAttachment: e.target.checked})} />
                  Has attachment
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={advSearch.dontIncludeChats} onChange={e => setAdvSearch({...advSearch, dontIncludeChats: e.target.checked})} />
                  Don't include chats
                </label>
              </div>

              <div className="adv-search-actions">
                <button type="button" className="adv-search-btn" onClick={submitAdvancedSearch}>Search</button>
              </div>
            </div>
          </>
        )}
      </div>

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
