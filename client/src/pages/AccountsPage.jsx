import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmail } from '../context/EmailContext'
import { useAuth } from '../context/AuthContext'
import { accountsAPI } from '../api'
import './AccountsPage.css'

const WORKLOAD_DATA = [
  { label: 'Mon', work: 80, personal: 20 },
  { label: 'Tue', work: 65, personal: 35 },
  { label: 'Wed', work: 90, personal: 10 },
  { label: 'Thu', work: 70, personal: 30 },
  { label: 'Fri', work: 50, personal: 50 },
]

export default function AccountsPage() {
  const navigate = useNavigate()
  const { dispatch, emails, unreadCount, fetchEmails } = useEmail()
  const { user } = useAuth()
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ provider: '', email: '', password: '' })
  const [addingAccount, setAddingAccount] = useState(false)

  useEffect(() => { fetchEmails('inbox') }, [])

  const accounts = [
    { id: 'work', type: 'WORK', name: user?.name || 'David Chen', email: user?.email || 'david.chen@atelier.com', unread: unreadCount, urgent: emails.filter(e => e.labels?.includes('URGENT: SERVER')).length, status: 'active', color: '#3B82F6' },
    { id: 'personal', type: 'PERSONAL', name: user?.name || 'David Chen', email: 'hello@dchen.me', unread: 12, urgent: 0, status: 'active', color: '#8B5CF6' },
    { id: 'projects', type: 'PROJECTS', name: 'Foundry Studio', email: 'foundry@studio.io', unread: 74, urgent: 0, status: 'syncing', color: '#10B981' },
  ]

  const totalUnread = accounts.reduce((s, a) => s + a.unread, 0)

  const handleOpenAccount = (accountId) => {
    dispatch({ type: 'SET_ACCOUNT', payload: accountId })
    navigate('/inbox')
  }

  const handleAddAccount = async () => {
    setAddingAccount(true)
    try {
      // Map form to API expected structure
      const data = {
        email: addForm.email,
        provider: addForm.provider,
        smtpConfig: {
          host: addForm.provider === 'Gmail' ? 'smtp.gmail.com' : '',
          port: 587,
          user: addForm.email,
          pass: addForm.password
        },
        imapConfig: {
          host: addForm.provider === 'Gmail' ? 'imap.gmail.com' : '',
          port: 993,
          user: addForm.email,
          pass: addForm.password
        }
      }
      
      await accountsAPI.add(data)
      setShowAddModal(false)
      setAddForm({ provider: '', email: '', password: '' })
      // Navigate to inbox or refresh
      fetchEmails('inbox')
    } catch (err) {
      alert('Failed to connect: ' + (err.response?.data?.message || err.message))
    } finally {
      setAddingAccount(false)
    }
  }

  return (
    <div className="accounts-layout">
      <div className="accounts-content">
        {/* Header */}
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
          {/* Left: Accounts */}
          <div className="accounts-left">
            {/* Unified Inbox Master Card */}
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
                  >
                    {a.name[0]}
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

            {/* Account Cards */}
            <div className="account-cards">
              {accounts.map(account => (
                <div key={account.id} id={`account-${account.id}`} className="account-card card card-hover">
                  <div className="account-card-header">
                    <div className="avatar avatar-md" style={{ background: account.color, color: '#fff' }}>
                      {account.name[0]}
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
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}
                    onClick={() => handleOpenAccount(account.id)}
                  >
                    Open Account
                  </button>
                </div>
              ))}

              {/* Add Account Card */}
              <div className="add-account-card card" id="add-account-btn" tabIndex={0} onClick={() => setShowAddModal(true)} style={{ cursor: 'pointer' }}>
                <div className="add-account-icon">+</div>
                <div className="add-account-label">Add New Account</div>
                <div className="add-account-desc">Connect Gmail, Outlook, or any IMAP account</div>
              </div>
            </div>
          </div>

          {/* Right: Stats */}
          <div className="accounts-right">
            <div className="card" style={{ padding: '20px', marginBottom: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>
                Weekly Stats
              </h3>
              <div className="weekly-stats-row">
                <div className="stat-block">
                  <div className="stat-big-num">{emails.length > 0 ? (emails.length * 12) : 0}</div>
                  <div className="stat-big-label">Emails Managed</div>
                </div>
                <div className="stat-block">
                  <div className="stat-big-num" style={{ color: '#10B981' }}>4.2h</div>
                  <div className="stat-big-label">Time Saved</div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '20px', marginBottom: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                Workload
              </h3>
              <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#3B82F6' }}/>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Work 78%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#E2E8F0' }}/>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Personal 22%</span>
                </div>
              </div>
              <div className="workload-chart">
                {WORKLOAD_DATA.map(d => (
                  <div key={d.label} className="workload-bar-group">
                    <div className="workload-bar-track">
                      <div className="workload-bar-fill" style={{ height: `${d.work}%` }} />
                    </div>
                    <span className="workload-day">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="quote-card card">
              <div className="quote-icon">✨</div>
              <blockquote className="quote-text">
                "The key is not to prioritize what's on your schedule, but to schedule your priorities."
              </blockquote>
              <div className="quote-author">— Stephen Covey</div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" style={{ maxWidth: 420, padding: 0 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Connect Email Account</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Add a new email account to your unified inbox.</p>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Provider</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Gmail', 'Outlook', 'Yahoo', 'IMAP'].map(p => (
                    <button
                      key={p}
                      className={`btn btn-sm ${addForm.provider === p ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setAddForm(f => ({ ...f, provider: p }))}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      {p === 'Gmail' && '📧 '}{p === 'Outlook' && '📬 '}{p === 'Yahoo' && '📮 '}{p === 'IMAP' && '⚙️ '}{p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Email Address</label>
                <input className="input" placeholder="you@example.com" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Password / App Key</label>
                <input className="input" type="password" placeholder="••••••••" value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleAddAccount}
                disabled={!addForm.provider || !addForm.email || addingAccount}
              >
                {addingAccount ? 'Connecting...' : 'Connect Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
