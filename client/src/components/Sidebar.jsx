import { NavLink, useNavigate } from 'react-router-dom'
import { useEmail } from '../context/EmailContext'
import { useAuth } from '../context/AuthContext'
import { useUI } from '../context/UIContext'
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
  Purchases: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  TreeView: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="5"/>
      <rect x="16" y="3" width="5" height="5"/>
      <rect x="16" y="16" width="5" height="5"/>
      <path d="M5.5 8v3c0 1.1.9 2 2 2h9a2 2 0 002-2V8"/>
      <line x1="11.5" y1="11" x2="11.5" y2="16"/>
    </svg>
  ),
  Subscriptions: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
      <line x1="2" y1="2" x2="22" y2="22"/>
    </svg>
  ),
  Settings: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
}

const navItems = [
  { to: '/inbox',     label: 'Inbox',     Icon: Icons.Inbox,     folder: 'inbox' },
  { to: '/starred',   label: 'Starred',   Icon: Icons.Starred,   folder: 'starred' },
  { to: '/sent',      label: 'Sent',      Icon: Icons.Sent,      folder: 'sent' },
  { to: '/drafts',    label: 'Drafts',    Icon: Icons.Drafts,    folder: 'drafts' },
  { to: '/purchases', label: 'Purchases', Icon: Icons.Purchases, folder: 'purchases' },
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

export default function Sidebar() {
  const { unreadCount, dispatch } = useEmail()
  const { user, logout } = useAuth()
  const { mobileMenuOpen, setMobileMenuOpen, sidebarExpanded, setSidebarExpanded } = useUI()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleNavClick = () => {
    if (mobileMenuOpen) setMobileMenuOpen(false)
  }

  const avatarColor = colorFromName(user?.name || '')
  const expanded = sidebarExpanded || mobileMenuOpen

  return (
    <>
      {mobileMenuOpen && (
        <div className="mobile-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}
      <aside className={`sidebar ${expanded ? 'sidebar-expanded' : 'sidebar-icon-only'} ${mobileMenuOpen ? 'mobile-open' : ''}`}>

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
            <span className="nav-icon"><Icons.Accounts /></span>
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

        {/* Bottom Controls */}
        <div className="sidebar-bottom">
          <NavLink to="/settings" id="nav-settings" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick} title={!expanded ? 'Settings' : undefined}>
            <span className="nav-icon"><Icons.Settings /></span>
            {expanded && <span className="nav-label">Settings</span>}
          </NavLink>

          <div className="sidebar-user">
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
              <button
                id="logout-btn"
                className="btn-icon"
                onClick={handleLogout}
                data-tooltip="Sign out"
                style={{ marginLeft: 'auto', flexShrink: 0 }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
