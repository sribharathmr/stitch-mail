import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmail } from '../context/EmailContext'
import { useAuth } from '../context/AuthContext'
import { accountsAPI } from '../api'
import './AccountsPage.css'

export default function AccountsPage() {
  const navigate = useNavigate()
  const { dispatch, emails, fetchEmails } = useEmail()
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ provider: '', email: '', password: '' })
  const [addingAccount, setAddingAccount] = useState(false)

  const [accounts, setAccounts] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const loadAccounts = () => {
    setIsLoading(true)
    accountsAPI.list().then(res => {
      const AVATAR_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#EF4444']
      const fetchedAccounts = (res.data.accounts || []).map((a, i) => ({
        ...a,
        id: String(a.id),
        color: AVATAR_COLORS[i % AVATAR_COLORS.length]
      }))
      setAccounts(fetchedAccounts)
      setIsLoading(false)
    }).catch(err => {
      console.error(err)
      setIsLoading(false)
    })
  }

  useEffect(() => { 
    fetchEmails('inbox')
    loadAccounts()
    
    // Check for success/error query params from OAuth redirect
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'linked') {
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Account linked successfully' } }))
      window.history.replaceState({}, document.title, window.location.pathname)
    }
    if (params.get('error')) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Failed to link account' } }))
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const totalUnread = (accounts || []).reduce((s, a) => s + (a.unread || 0), 0)

  const handleOpenAccount = (accountId) => {
    dispatch({ type: 'SET_ACCOUNT', payload: accountId })
    navigate('/inbox')
  }

  const handleLinkGoogle = () => {
    // Redirect to backend OAuth route
    window.location.href = '/api/auth/google/link'
  }

  const handleAddAccount = async () => {
    if (addForm.provider === 'Gmail') {
      handleLinkGoogle()
      return
    }

    setAddingAccount(true)
    try {
      const data = {
        email: addForm.email,
        provider: addForm.provider,
        imapConfig: {
          host: addForm.provider === 'Outlook' ? 'outlook.office365.com' : (addForm.provider === 'Yahoo' ? 'imap.mail.yahoo.com' : ''),
          port: 993,
          user: addForm.email,
          pass: addForm.password
        },
        smtpConfig: {
          host: addForm.provider === 'Outlook' ? 'smtp.office365.com' : (addForm.provider === 'Yahoo' ? 'smtp.mail.yahoo.com' : ''),
          port: 587,
          user: addForm.email,
          pass: addForm.password
        }
      }
      
      await accountsAPI.add(data)
      setShowAddModal(false)
      setAddForm({ provider: '', email: '', password: '' })
      loadAccounts()
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Account added' } }))
    } catch (err) {
      alert('Failed to connect: ' + (err.response?.data?.message || err.message))
    } finally {
      setAddingAccount(false)
    }
  }

  const handleRemoveAccount = async (id, email) => {
    if (!window.confirm(`Are you sure you want to remove ${email}? This will also delete synced emails.`)) return
    
    try {
      await accountsAPI.delete(id)
      setAccounts(prev => prev.filter(a => a.id !== id))
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Account removed' } }))
    } catch (err) {
      alert('Failed to remove account')
    }
  }

  // Real-ish stats
  const emailsManaged = (emails || []).length;
  const timeSavedHours = (emailsManaged * 2.5 / 60).toFixed(1);

  return (
    <div className="accounts-layout">
      <div className="accounts-content">
        <div className="accounts-header">
          <div>
            <h1 className="accounts-title">Unified Switcher</h1>
            <p className="accounts-subtitle">Manage all your email accounts in one place</p>
          </div>
          <button
            id="accounts-compose-fab"
            className="btn btn-primary"
            onClick={() => dispatch({ type: 'OPEN_COMPOSE' })}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Compose
          </button>
        </div>

        <div className="accounts-grid">
          <div className="accounts-left">
            <div className="unified-card card">
              <div className="unified-card-header">
                <div className="unified-card-icon">📬</div>
                <div style={{ flex: 1 }}>
                  <div className="unified-card-title">Unified Inbox</div>
                  <div className="unified-card-subtitle">All accounts combined</div>
                </div>
                <div className="unified-badge">
                  <span>{totalUnread}</span>
                </div>
              </div>
              <div className="unified-avatars">
                {accounts.map(a => (
                  <div
                    key={a.id}
                    className="avatar avatar-sm"
                    style={{ background: a.color, color: '#fff', marginLeft: -6, border: '2px solid var(--bg-card)', fontSize: 10 }}
                    title={a.email}
                  >
                    {(a.email || '?')[0].toUpperCase()}
                  </div>
                ))}
              </div>
              <button
                id="unified-open-btn"
                className="unified-open-link"
                onClick={() => handleOpenAccount('all')}
              >
                Open Unified View →
              </button>
            </div>

            <div className="account-cards">
              {isLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading accounts...</div>
              ) : accounts.map(account => (
                <div key={account.id} id={`account-${account.id}`} className="account-card card card-hover">
                  <div className="account-card-header">
                    <div className="avatar avatar-md" style={{ background: account.color, color: '#fff' }}>
                      {(account.email || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="account-type">{account.type}</span>
                        {account.status === 'syncing' && (
                          <span className="badge badge-warning" style={{ fontSize: 10 }}>Syncing...</span>
                        )}
                      </div>
                      <div className="account-email">{account.email}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="account-unread">{account.unread}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>unread</div>
                    </div>
                  </div>
                  {account.urgent > 0 && (
                    <div className="account-urgent">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      <span>{account.urgent} Urgent</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => handleOpenAccount(account.id)}
                    >
                      Open Account
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Remove Account"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveAccount(account.id, account.email)
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <div className="add-account-card card" id="add-account-btn" tabIndex={0} onClick={() => setShowAddModal(true)} style={{ cursor: 'pointer' }}>
                <div className="add-account-icon">+</div>
                <div className="add-account-label">Add New Account</div>
                <div className="add-account-desc">Connect Gmail, Outlook, or any IMAP account</div>
              </div>
            </div>
          </div>

          <div className="accounts-right">
            <div className="card" style={{ padding: '20px', marginBottom: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>
                Real-time Status
              </h3>
              <div className="weekly-stats-row">
                <div className="stat-block">
                  <div className="stat-big-num">{emailsManaged}</div>
                  <div className="stat-big-label">Active Emails</div>
                </div>
                <div className="stat-block">
                  <div className="stat-big-num" style={{ color: '#10B981' }}>{timeSavedHours}h</div>
                  <div className="stat-big-label">AI Efficiency</div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '20px', marginBottom: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                Account Health
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                 {accounts.map(a => (
                   <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                     <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{a.email}</div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.status === 'active' ? '#10B981' : '#EF4444' }} />
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{a.status}</span>
                     </div>
                   </div>
                 ))}
                 {accounts.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No accounts connected</div>}
              </div>
            </div>

            <div className="quote-card card">
              <div className="quote-icon">✨</div>
              <blockquote className="quote-text">
                "Simple is better than complex."
              </blockquote>
              <div className="quote-author">— The Zen of Python</div>
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" style={{ maxWidth: 420, padding: 0 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Connect Account</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Add a secondary email account to your unified inbox.</p>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Provider</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Gmail', 'Outlook', 'IMAP'].map(p => (
                    <button
                      key={p}
                      className={`btn btn-sm ${addForm.provider === p ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setAddForm(f => ({ ...f, provider: p }))}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      {p === 'Gmail' && '📧 '}{p === 'Outlook' && '📬 '}{p === 'IMAP' && '⚙️ '}{p}
                    </button>
                  ))}
                </div>
              </div>

              {addForm.provider === 'Gmail' ? (
                <div style={{ padding: '24px 0', textAlign: 'center' }}>
                  <button className="btn btn-primary" onClick={handleLinkGoogle} style={{ width: '100%', justifyContent: 'center', height: 48, background: '#fff', color: '#1f2937', border: '1px solid #d1d5db', gap: 12, fontWeight: 600 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                       <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                       <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                       <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                       <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                </div>
              ) : addForm.provider ? (
                <>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Email Address</label>
                    <input className="input" placeholder="you@example.com" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Password / App Key</label>
                    <input className="input" type="password" placeholder="••••••••" value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} />
                  </div>
                </>
              ) : (
                <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  Please select a provider above
                </div>
              )}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              {addForm.provider !== 'Gmail' && (
                <button
                  className="btn btn-primary"
                  onClick={handleAddAccount}
                  disabled={!addForm.provider || !addForm.email || addingAccount}
                >
                  {addingAccount ? 'Connecting...' : 'Connect Account'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
