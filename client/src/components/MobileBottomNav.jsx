import { useNavigate, useLocation } from 'react-router-dom'
import { useEmail } from '../context/EmailContext'
import './MobileBottomNav.css'

const NAV_ITEMS = [
  {
    to: '/inbox',
    label: 'Inbox',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
        <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
      </svg>
    ),
  },
  {
    to: '/search',
    label: 'Search',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
  {
    action: 'compose',
    label: 'Compose',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    ),
    isCompose: true,
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
]

export default function MobileBottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { dispatch, unreadCount } = useEmail()

  return (
    <nav className="mobile-bottom-nav" aria-label="Bottom navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = item.to && location.pathname.startsWith(item.to)

        if (item.isCompose) {
          return (
            <button
              key="compose"
              className="mobile-nav-item mobile-nav-compose"
              onClick={() => dispatch({ type: 'OPEN_COMPOSE' })}
              aria-label="Compose"
            >
              <span className="mobile-nav-compose-icon">{item.icon}</span>
            </button>
          )
        }

        return (
          <button
            key={item.to}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => navigate(item.to)}
            aria-label={item.label}
          >
            <span className="mobile-nav-icon">
              {item.icon}
              {item.to === '/inbox' && unreadCount > 0 && (
                <span className="mobile-nav-badge">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </span>
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
