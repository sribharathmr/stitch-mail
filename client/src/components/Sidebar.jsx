import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useEmail } from '../context/EmailContext'
import { useAuth } from '../context/AuthContext'
import { useUI } from '../context/UIContext'
import { accountsAPI } from '../api'
import './Sidebar.css'

// ── SVG icon components (Gmail-style outlined) ──────────────────────────────
const Icons = {
  Inbox: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
    </svg>
  ),
  Starred: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  Snoozed: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Sent: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Drafts: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  Spam: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  Trash: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
  ),
  Archive: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8"/>
      <rect x="1" y="3" width="22" height="5"/>
      <line x1="10" y1="12" x2="14" y2="12"/>
    </svg>
  ),
  Accounts: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  TreeView: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  Unified: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Subscriptions: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
}

const navItemsTop = [
  { to: '/inbox?tab=all',        label: 'All inboxes', Icon: Icons.Inbox,          folder: 'inbox', tabParam: 'all' },
  { to: '/inbox?tab=primary',    label: 'Primary',     Icon: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><path d="M22 6l-10 7L2 6"/></svg>, folder: 'inbox', tabParam: 'primary' },
  { to: '/inbox?tab=promotions', label: 'Promotions',  Icon: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>, folder: 'inbox', tabParam: 'promotions' },
  { to: '/inbox?tab=social',     label: 'Social',      Icon: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>, folder: 'inbox', tabParam: 'social' },
  { to: '/inbox?tab=updates',    label: 'Updates',     Icon: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>, folder: 'inbox', tabParam: 'updates' }
]

const navItemsBottom = [
  { to: '/starred',   label: 'Starred',   Icon: Icons.Starred,   folder: 'starred' },
  { to: '/snoozed',   label: 'Snoozed',   Icon: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, folder: 'snoozed' },
  { to: '/important', label: 'Important', Icon: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>, folder: 'important' },
  { to: '/sent',      label: 'Sent',      Icon: Icons.Sent,      folder: 'sent' },
  { to: '/drafts',    label: 'Drafts',    Icon: Icons.Drafts,    folder: 'drafts' },
  { to: '/archive',   label: 'Archive',   Icon: Icons.Archive,   folder: 'archive' },
  { to: '/spam',      label: 'Spam',      Icon: Icons.Spam,      folder: 'spam' },
  { to: '/trash',     label: 'Trash',     Icon: Icons.Trash,     folder: 'trash' },
]

function getInitials(name = '', email = '') {
  const str = (name || '').trim() || (email || '').split('@')[0] || 'U'
  return str.split(/[\s._]+/).map(n => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2)
}

function colorFromName(name = '') {
  const colors = ['#3B82F6','#8B5CF6','#EC4899','#10B981','#F59E0B','#EF4444','#06B6D4']
  let hash = 0
  for (let c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}


export default function Sidebar() {
  const { unreadCount, dispatch } = useEmail()
  const { user, logout } = useAuth()
  const { mobileMenuOpen, setMobileMenuOpen, sidebarExpanded, setSidebarExpanded } = useUI()
  const [hoverExpanded, setHoverExpanded] = useState(false)
  const hoverTimeoutRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      setHoverExpanded(true)
    }, 400) // 400ms intent delay
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setHoverExpanded(false)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleNavClick = () => {
    if (mobileMenuOpen) setMobileMenuOpen(false)
  }

  const avatarColor = colorFromName(user?.name || '')
  
  // Expand if pinned, mobile menu open, or currently hovered
  const expanded = sidebarExpanded || mobileMenuOpen || hoverExpanded

  return (
    <>
      {mobileMenuOpen && (
        <div className="mobile-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}
      {!mobileMenuOpen && (
        <div className={`sidebar-spacer ${sidebarExpanded ? 'expanded' : 'collapsed'}`} />
      )}
      <aside 
        className={`sidebar ${expanded ? 'sidebar-expanded' : 'sidebar-icon-only'} ${mobileMenuOpen ? 'mobile-open' : ''} ${hoverExpanded && !sidebarExpanded ? 'sidebar-hovered' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >

        {/* Gmail-style header: hamburger + logo */}
        <div className="sidebar-header">
          <button
            id="sidebar-menu-btn"
            className="sidebar-menu-btn btn-icon"
            title="Main menu"
            aria-label="Main menu"
            onClick={() => {
              if (window.innerWidth <= 768) {
                setMobileMenuOpen(false)
              } else {
                setSidebarExpanded(v => !v)
              }
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          </button>
          {expanded && (
            <button
              id="sidebar-logo-btn"
              className="sidebar-logo-btn"
              onClick={() => navigate('/inbox')}
              title="Stitch Mail"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 8l9-5 9 5v8l-9 5-9-5V8z" stroke="#3B82F6" strokeWidth="2" fill="none"/>
                <path d="M3 8l9 5 9-5" stroke="#3B82F6" strokeWidth="2"/>
                <path d="M12 13v8" stroke="#3B82F6" strokeWidth="2"/>
              </svg>
              <span className="sidebar-logo-text">Stitch Mail</span>
            </button>
          )}
        </div>

        {/* Compose */}
        <div className="sidebar-compose">
          <button
            id="compose-btn"
            className="btn btn-primary compose-btn-icon"
            title="Compose"
            onClick={() => {
              dispatch({ type: 'OPEN_COMPOSE' })
              handleNavClick()
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            {expanded && <span>Compose</span>}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {!expanded && <span className="sidebar-section-label-dot" />}
          {expanded && <span className="sidebar-section-label">MAILBOXES</span>}

          {/* App-controlled items (inboxes/tabs) */}
          {navItemsTop.map(({ to, label, Icon, folder, tabParam }) => {
            const searchParams = new URLSearchParams(location.search);
            const currentTab = searchParams.get('tab') || 'primary';
            const isActive = location.pathname.startsWith('/inbox') && folder === 'inbox' && currentTab === tabParam;

            return (
              <NavLink
                key={to}
                to={to}
                id={`nav-${tabParam}`}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
                title={!expanded ? label : undefined}
              >
                <span className="nav-icon"><Icon /></span>
                {expanded && <span className="nav-label">{label}</span>}
                {/* Simulated counts for specific categories, falling back to unreadCount */}
                {(tabParam === 'primary' || tabParam === 'updates' || tabParam === 'promotions' || tabParam === 'social') && unreadCount > 0 && (
                  <span className={`badge nav-badge sidebar-cat-badge badge-${tabParam} ${!expanded ? 'nav-badge-dot' : ''}`}>
                    {expanded ? (
                        tabParam === 'primary' ? (unreadCount > 99 ? '99+' : unreadCount) 
                      : tabParam === 'promotions' ? '10 new'
                      : tabParam === 'social' ? '10 new'
                      : tabParam === 'updates' ? '17 new' 
                      : ''
                    ) : ''}
                  </span>
                )}
              </NavLink>
            )
          })}

          <div style={{ padding: '8px 12px 2px 16px', fontSize: '11px', color: 'var(--text-muted)' }}>
            {expanded ? 'All labels' : <span className="sidebar-section-label-dot" />}
          </div>

          {/* Standard labels (folders) */}
          {navItemsBottom.map(({ to, label, Icon, folder }) => (
            <NavLink
              key={to}
              to={to}
              id={`nav-${folder}`}
              className={({ isActive }) => `sidebar-nav-item ${isActive && !location.pathname.startsWith('/inbox') ? 'active' : ''}`}
              onClick={handleNavClick}
              title={!expanded ? label : undefined}
            >
              <span className="nav-icon"><Icon /></span>
              {expanded && <span className="nav-label">{label}</span>}
            </NavLink>
          ))}

          {expanded && <span className="sidebar-section-label" style={{ marginTop: 16 }}>VIEWS</span>}
          {!expanded && <div style={{ height: 8 }} />}

          <NavLink to="/accounts" id="nav-accounts" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick} title={!expanded ? 'Unified Switcher' : undefined}>
            <span className="nav-icon"><Icons.Unified /></span>
            {expanded && <span className="nav-label">Unified Switcher</span>}
          </NavLink>
          <NavLink to="/tree-view" id="nav-tree-view" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick} title={!expanded ? 'Structured Inbox' : undefined}>
            <span className="nav-icon"><Icons.TreeView /></span>
            {expanded && <span className="nav-label">Structured Inbox</span>}
          </NavLink>
          <NavLink to="/subscriptions" id="nav-subscriptions" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick} title={!expanded ? 'Smart Unsubscribe' : undefined}>
            <span className="nav-icon"><Icons.Subscriptions /></span>
            {expanded && <span className="nav-label">Smart Unsubscribe</span>}
          </NavLink>

        </nav>

      </aside>
    </>
  )
}
