import { NavLink, useNavigate } from 'react-router-dom'
import { useEmail } from '../context/EmailContext'
import { useAuth } from '../context/AuthContext'
import { useUI } from '../context/UIContext'
import './Sidebar.css'

const navItems = [
  { to: '/inbox',     label: 'Inbox',     icon: '📥', folder: 'inbox' },
  { to: '/starred',   label: 'Starred',   icon: '⭐', folder: 'starred' },
  { to: '/sent',      label: 'Sent',      icon: '📤', folder: 'sent' },
  { to: '/drafts',    label: 'Drafts',    icon: '📝', folder: 'drafts' },
  { to: '/purchases', label: 'Purchases', icon: '🛍️', folder: 'purchases' },
  { to: '/spam',      label: 'Spam',      icon: '🛡️', folder: 'spam' },
  { to: '/trash',     label: 'Trash',     icon: '🗑️', folder: 'trash' },
  { to: '/archive',   label: 'Archive',   icon: '📦', folder: 'archive' },
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
  const { mobileMenuOpen, setMobileMenuOpen, sidebarExpanded } = useUI()
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
        {/* Logo */}
        <div
          className="sidebar-header"
          onClick={() => navigate('/inbox')}
          title="Go to Inbox"
          style={{ cursor: 'pointer' }}
        >
          <div className="workspace-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M3 8l9-5 9 5v8l-9 5-9-5V8z" stroke="#3B82F6" strokeWidth="2" fill="none"/>
              <path d="M3 8l9 5 9-5" stroke="#3B82F6" strokeWidth="2"/>
              <path d="M12 13v8" stroke="#3B82F6" strokeWidth="2"/>
            </svg>
            {expanded && <span className="workspace-name">Stitch Mail</span>}
          </div>
          {expanded && <span className="badge badge-accent" style={{ fontSize: '10px', padding: '2px 8px' }}>PRO</span>}
        </div>

        {/* Compose Button */}
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            {expanded && <span>Compose</span>}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {!expanded && <span className="sidebar-section-label-dot" />}
          {expanded && <span className="sidebar-section-label">MAILBOXES</span>}
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              id={`nav-${item.folder}`}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
              title={!expanded ? item.label : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              {expanded && <span className="nav-label">{item.label}</span>}
              {item.folder === 'inbox' && unreadCount > 0 && (
                <span className={`badge badge-accent nav-badge ${!expanded ? 'nav-badge-dot' : ''}`}>
                  {expanded ? (unreadCount > 99 ? '99+' : unreadCount) : ''}
                </span>
              )}
            </NavLink>
          ))}

          {expanded && <span className="sidebar-section-label" style={{ marginTop: 16 }}>VIEWS</span>}
          {!expanded && <div style={{ height: 8 }} />}
          <NavLink to="/accounts" id="nav-accounts" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick} title={!expanded ? 'Unified Switcher' : undefined}>
            <span className="nav-icon">🔄</span>
            {expanded && <span className="nav-label">Unified Switcher</span>}
          </NavLink>
          <NavLink to="/tree-view" id="nav-tree-view" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick} title={!expanded ? 'Structured Inbox' : undefined}>
            <span className="nav-icon">🌳</span>
            {expanded && <span className="nav-label">Structured Inbox</span>}
          </NavLink>
          <NavLink to="/subscriptions" id="nav-subscriptions" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick} title={!expanded ? 'Smart Unsubscribe' : undefined}>
            <span className="nav-icon" style={{ color: 'var(--accent)' }}>✨</span>
            {expanded && <span className="nav-label">Smart Unsubscribe</span>}
          </NavLink>
        </nav>

        {/* Bottom Controls */}
        <div className="sidebar-bottom">
          <NavLink to="/settings" id="nav-settings" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick} title={!expanded ? 'Settings' : undefined}>
            <span className="nav-icon">⚙️</span>
            {expanded && <span className="nav-label">Settings</span>}
          </NavLink>

          {/* User Profile */}
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
