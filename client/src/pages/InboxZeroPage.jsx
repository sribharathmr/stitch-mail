import { useNavigate } from 'react-router-dom'
import { useEmail } from '../context/EmailContext'
import './InboxZeroPage.css'

const QUICK_ACTIONS = [
  { icon: '📅', label: 'CALENDAR', sublabel: 'Review Schedule', to: '#' },
  { icon: '📦', label: 'ARCHIVES', sublabel: 'View Last Week', to: '/archive' },
  { icon: '📁', label: 'FILES', sublabel: 'Manage Assets', to: '#' },
]

export default function InboxZeroPage() {
  const navigate = useNavigate()
  const { dispatch } = useEmail()

  return (
    <div className="inbox-zero-layout">
      <div className="inbox-zero-content">
        {/* Illustration */}
        <div className="zero-illustration">
          <div className="zero-box">
            <div className="zero-box-inner">
              <div className="zero-check">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>
            <div className="zero-box-shadow" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="zero-heading">Inbox Zero</h1>
        <p className="zero-subtext">You've cleared your path for today.</p>
        <p className="zero-desc">
          Your inbox is empty. Enjoy this moment of clarity — every email handled means more focus for what matters.
        </p>

        {/* CTA buttons */}
        <div className="zero-ctas">
          <button
            id="zero-tasks-btn"
            className="btn btn-primary"
            style={{ padding: '11px 24px', fontSize: 14 }}
            onClick={() => navigate('/inbox')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Check Upcoming Tasks
          </button>
          <button
            id="zero-compose-btn"
            className="btn btn-secondary"
            style={{ padding: '11px 24px', fontSize: 14 }}
            onClick={() => dispatch({ type: 'OPEN_COMPOSE' })}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Compose
          </button>
        </div>

        {/* Quick actions */}
        <div className="zero-quick-actions">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.label}
              id={`zero-action-${action.label.toLowerCase()}`}
              className="zero-action-item"
              onClick={() => navigate(action.to)}
            >
              <span className="zero-action-icon">{action.icon}</span>
              <div>
                <div className="zero-action-label">{action.label}</div>
                <div className="zero-action-sub">{action.sublabel}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
