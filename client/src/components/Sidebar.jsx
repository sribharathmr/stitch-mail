import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
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

const navItems = [
  { to: '/inbox',     label: 'Inbox',     Icon: Icons.Inbox,     folder: 'inbox' },
  { to: '/starred',   label: 'Starred',   Icon: Icons.Starred,   folder: 'starred' },
  { to: '/sent',      label: 'Sent',      Icon: Icons.Sent,      folder: 'sent' },
  { to: '/drafts',    label: 'Drafts',    Icon: Icons.Drafts,    folder: 'drafts' },
  { to: '/spam',      label: 'Spam',      Icon: Icons.Spam,      folder: 'spam' },
  { to: '/trash',     label: 'Trash',     Icon: Icons.Trash,     folder: 'trash' },
  { to: '/archive',   label: 'Archive',   Icon: Icons.Archive,   folder: 'archive' },
]

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function colorFromName(name = '') {
  const colors = ['#3B82F6','#8B5CF6','#EC4899','#10B981','#F59E0B','#EF4444','#06B6D4']
  let hash = 0
  for (let c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function AccountList({ expanded, handleNavClick }) {
  const { dispatch, activeAccount, accounts } = useEmail()


  const handleSwitch = (id) => {
    dispatch({ type: 'SET_ACCOUNT', payload: id })
    handleNavClick()
  }

  return (
    <div className="sidebar-accounts">
      {expanded && <span className="sidebar-section-label">ACCOUNTS</span>}
      {!expanded && <div className="sidebar-section-label-dot" />}
      
      <button 
        className={`sidebar-nav-item ${activeAccount === 'all' ? 'active' : ''}`}
        onClick={() => handleSwitch('all')}
        title={!expanded ? 'All Accounts' : undefined}
      >
        <span className="nav-icon"><Icons.Accounts /></span>
        {expanded && <span className="nav-label">All Accounts</span>}
      </button>

      {accounts.map(acc => (
        <button 
          key={acc.id}
          className={`sidebar-nav-item ${activeAccount === acc.id ? 'active' : ''}`}
          onClick={() => handleSwitch(acc.id)}
          title={!expanded ? acc.email : undefined}
        >
          <div className="nav-icon">
            <div className="avatar avatar-xs" style={{ background: '#8b5cf6', color: '#fff', fontSize: 10, borderRadius: '4px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
          </div>
          {expanded && <span className="nav-label" style={{ fontSize: 13, opacity: 0.9 }}>{acc.email}</span>}
        </button>
      ))}
    </div>
  )
}

export default function Sidebar() {
  const { unreadCount, dispatch } = useEmail()
  const { user, logout } = useAuth()
  const { mobileMenuOpen, setMobileMenuOpen, sidebarExpanded, setSidebarExpanded } = useUI()
  const [hoverExpanded, setHoverExpanded] = useState(false)
  const navigate = useNavigate()

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
        onMouseEnter={() => setHoverExpanded(true)}
        onMouseLeave={() => setHoverExpanded(false)}
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

          {navItems.map(({ to, label, Icon, folder }) => (
            <NavLink
              key={to}
              to={to}
              id={`nav-${folder}`}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
              title={!expanded ? label : undefined}
            >
              <span className="nav-icon"><Icon /></span>
              {expanded && <span className="nav-label">{label}</span>}
              {folder === 'inbox' && unreadCount > 0 && (
                <span className={`badge badge-accent nav-badge ${!expanded ? 'nav-badge-dot' : ''}`}>
                  {expanded ? (unreadCount > 99 ? '99+' : unreadCount) : ''}
                </span>
              )}
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

          <AccountList expanded={expanded} handleNavClick={handleNavClick} />
        </nav>

        {/* Bottom Controls */}
        <div className="sidebar-bottom">
          <NavLink to="/settings" id="nav-settings" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick} title={!expanded ? 'Settings' : undefined}>
            <span className="nav-icon"><Icons.Settings /></span>
            {expanded && <span className="nav-label">Settings</span>}
          </NavLink>

          <div 
            className="sidebar-user" 
            onClick={() => navigate('/accounts')}
            style={{ cursor: 'pointer' }}
            title="Switch Accounts"
          >
            <div className="avatar avatar-sm" style={{ background: avatarColor, color: '#fff', fontSize: 11 }}>
              {getInitials(user?.name)}
            </div>
            {expanded && (
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user?.name}</span>
                <span className="sidebar-user-email">{user?.email}</span>
              </div>
            )}
            {expanded && (
              <div
                id="logout-btn"
                className="btn-icon"
                onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                style={{ marginLeft: 'auto', flexShrink: 0 }}
                title="Sign out"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
