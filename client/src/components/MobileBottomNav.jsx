import { useNavigate, useLocation } from 'react-router-dom'
import { useEmail } from '../context/EmailContext'
import './MobileBottomNav.css'

const NAV_ITEMS = [
  {
    to: '/inbox',
    label: 'Inbox',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
        <polyline points="22,6 12,13 2,6"></polyline>
      </svg>
    ),
  },
  {
    action: 'compose',
    label: 'Compose',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
    ),
    isCompose: true,
  }
]

export default function MobileBottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { dispatch, unreadCount } = useEmail()

  return (
    <nav className="mobile-bottom-nav" aria-label="Bottom navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = item.to && location.pathname.startsWith(item.to)

        return (
          <button
            key={item.label}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => item.isCompose ? dispatch({ type: 'OPEN_COMPOSE' }) : navigate(item.to)}
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
