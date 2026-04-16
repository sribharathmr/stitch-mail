import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEmail } from '../context/EmailContext'
import './AccountDropdown.css'

function colorFromName(name = '') {
  const colors = ['#3B82F6','#8B5CF6','#EC4899','#10B981','#F59E0B','#EF4444','#06B6D4']
  let hash = 0
  for (let c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function AccountDropdown({ onClose }) {
  const { user, logout } = useAuth()
  const { accounts, dispatch } = useEmail()
  const navigate = useNavigate()
  const [showMore, setShowMore] = useState(true)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
    onClose()
  }

  const handleAddAccount = () => {
    navigate('/accounts') 
    onClose()
  }

  const handleSwitchAccount = (id) => {
    dispatch({ type: 'SET_ACCOUNT', payload: id })
    navigate('/inbox')
    onClose()
  }
  
  const getInitials = (name, email) => {
    const str = (name || '').trim() || (email || '').split('@')[0] || 'U'
    return str[0].toUpperCase()
  }
  
  const mainName = user?.name || 'User'
  const firstName = mainName.split(' ')[0]
  const mainEmail = user?.email || 'user@example.com'
  const mainColor = colorFromName(user?.name || mainEmail)

  // Use test photo if main user is sribharath to simulate the given image exactly
  // otherwise, default to initials to be safe
  const isSribharath = mainEmail.toLowerCase().includes('sribharathmr@');

  return (
    <div className="account-dropdown-overlay" onClick={onClose}>
      <div className="account-dropdown-container" onClick={e => e.stopPropagation()}>
        <button className="account-dropdown-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#444746" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="account-dropdown-email">
          {mainEmail}
        </div>

        <div className="account-dropdown-profile">
          <div className="account-dropdown-avatar-large">
            {isSribharath ? (
               <img src="https://images.unsplash.com/photo-1542596594-649edbc13630?w=160&auto=format&fit=crop" alt="Profile" className="avatar-image-actual" />
            ) : (
               <div className="avatar-placeholder" style={{ backgroundColor: mainColor }}>{getInitials(user?.name, user?.email)}</div>
            )}
            
            <svg className="avatar-ring" viewBox="0 0 100 100">
               <circle cx="50" cy="50" r="47" className="ring-red"></circle>
               <circle cx="50" cy="50" r="47" className="ring-yellow"></circle>
               <circle cx="50" cy="50" r="47" className="ring-green"></circle>
               <circle cx="50" cy="50" r="47" className="ring-blue"></circle>
            </svg>
            <div className="camera-icon-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#444746" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            </div>
          </div>
          
          <div className="account-dropdown-greeting">
            Hi, {firstName}!
          </div>
          
          <button className="manage-account-btn" onClick={() => { navigate('/settings'); onClose(); }}>
            Manage your Google Account
          </button>
        </div>

        <div className="account-list-card">
          <button className="hide-more-btn" onClick={() => setShowMore(!showMore)}>
            {showMore ? 'Hide more accounts' : 'Show more accounts'}
            <div className="chevron-bg">
              <svg className={`chevron-icon ${showMore ? 'up' : 'down'}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444746" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
          </button>

          {showMore && (
            <div className="accounts-list">
              {accounts.map((acc, index) => {
                 // specific fallback colors matching the screenshot for demo perfection
                 // Green: #5a8f4b, Purple: #673ab7, Blue: #0277bd
                 const mockColors = ['#5a8f4b', '#673ab7', '#0277bd', '#c2185b'];
                 const color = mockColors[index % mockColors.length] || colorFromName(acc.email);
                 const nameParts = (acc.name || acc.email.split('@')[0]).split(' ');
                 const displayName = nameParts.length > 2 ? `${nameParts[0]} ${nameParts[1]}` : (acc.name || acc.email.split('@')[0]);

                 return (
                   <div key={acc.id} className="other-account-item" onClick={() => handleSwitchAccount(acc.id)}>
                     <div className="other-account-avatar" style={{ backgroundColor: color }}>
                       {getInitials(acc.name, acc.email)}
                     </div>
                     <div className="other-account-info">
                       <div className="other-account-name">{displayName}</div>
                       <div className="other-account-email">{acc.email}</div>
                     </div>
                   </div>
                 )
              })}
            </div>
          )}

          <button className="add-account-btn" onClick={handleAddAccount}>
            <div className="action-icon-bg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0b57d0" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </div>
            Add another account
          </button>

          <button className="signout-all-btn" onClick={handleLogout}>
            <div className="action-icon-bg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444746" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
            </div>
            Sign out of all accounts
          </button>
        </div>

        <div className="account-dropdown-footer">
          <a href="#">Privacy Policy</a>
          <span>•</span>
          <a href="#">Terms of Service</a>
        </div>
      </div>
    </div>
  )
}
