import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEmail } from '../context/EmailContext'
import { useUI } from '../context/UIContext'
import { format, isToday, isYesterday } from 'date-fns'
import { aiAPI, settingsAPI, emailAPI, clearToken } from '../api'
import { segregateInbox, learnCorrection, ruleScore } from '../services/hybridClassifier'
import './InboxPage.css'

const TabIcons = {
  primary: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
    </svg>
  ),
  social: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  promotions: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  ),
  updates: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  ),
}

const SidebarIcon = ({ size = 20, color = 'currentColor', children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

const TABS = [
  { id: 'primary',    label: 'Primary',    Icon: TabIcons.primary },
  { id: 'social',     label: 'Social',     Icon: TabIcons.social },
  { id: 'promotions', label: 'Promotions', Icon: TabIcons.promotions },
  { id: 'updates',    label: 'Updates',    Icon: TabIcons.updates }
]

const UPCOMING_TASKS = [
  { id: 1, title: 'Review Q3 Budget', time: 'Today 3:00 PM', color: '#3B82F6' },
  { id: 2, title: 'Client Kick-off Call', time: 'Tomorrow 2:00 PM', color: '#8B5CF6' },
  { id: 3, title: 'Design Review', time: 'Thu 10:00 AM', color: '#10B981' },
]

function formatTime(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isToday(d)) return format(d, 'h:mm a')
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMM d')
}

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getWeekRange() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return `${format(d, 'MMM d')} – ${format(new Date(), 'MMM d')}`
}

const AVATAR_COLORS = ['#3B82F6','#8B5CF6','#EC4899','#10B981','#F59E0B','#EF4444','#06B6D4','#84CC16']
function avatarColor(name = '') {
  let h = 0; for (let c of name) h = c.charCodeAt(0) + ((h<<5)-h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export default function InboxPage({ folder = 'inbox' }) {
  const { emails, loading, unreadCount, fetchEmails, openEmail, starEmail, activeEmail, activeAccount, accounts, dispatch } = useEmail()
  const { settings } = useUI()
  const [activeTab, setActiveTab] = useState('primary')
  const [categorizing, setCategorizing] = useState(false)
  const [tasks, setTasks] = useState([])
  const [hasLoadedTasks, setHasLoadedTasks] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState(null)
  
  // Hybrid classification refinements
  const [classifications, setClassifications] = useState({})

  useEffect(() => {
    if (settings?.preferences && !hasLoadedTasks) {
      setTasks(settings.preferences.tasks || UPCOMING_TASKS.map(t => ({ ...t, completed: false })))
      setHasLoadedTasks(true)
    }
  }, [settings, hasLoadedTasks])

  const saveTasks = async (newTasks) => {
    setTasks(newTasks)
    try {
      await settingsAPI.update({ preferences: { ...settings?.preferences, tasks: newTasks } })
    } catch (err) {
      console.error('Failed to save tasks:', err)
    }
  }

  const handleTaskChange = (id, newTitle) => {
    saveTasks(tasks.map(t => t.id === id ? { ...t, title: newTitle } : t))
  }

  const handleAddTask = () => {
    const newTask = {
      id: Date.now(),
      title: 'New Task',
      color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      completed: false
    }
    const newTasks = [newTask, ...tasks]
    setTasks(newTasks)
    setEditingTaskId(newTask.id)
    saveTasks(newTasks)
  }

  const handleDeleteTask = (id) => {
    saveTasks(tasks.filter(t => t.id !== id))
  }

  const handleToggleTask = (id) => {
    saveTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  const navigate = useNavigate()
  const location = useLocation()

  const compactView = settings?.preferences?.compactView ?? false

  useEffect(() => {
    fetchEmails(folder)
  }, [folder, location.pathname, fetchEmails])

  // Trigger Hybrid Classifier Pass 2 (Refinement)
  useEffect(() => {
    if (folder !== 'inbox') return;
    
    // Pass 1: Local Rule Check (Sync)
    const initialMap = {};
    emails.forEach(e => {
      initialMap[e._id] = ruleScore(e).tab;
    });
    setClassifications(prev => ({ ...prev, ...initialMap }));

    // Pass 2: Background Refinement (ML/AI)
    segregateInbox(emails, (id, tab) => {
      setClassifications(prev => ({ ...prev, [id]: tab }));
    });
  }, [emails, folder])

  const activeEmails = useMemo(() => {
    if (!activeAccount || activeAccount === 'all') return emails;

    // Simulate different emails per account since we only have one set from the API
    if (activeAccount === 'work') {
      return emails.filter(e => !e.labels?.includes('SOCIAL') && !e.labels?.includes('PROMOTIONS'))
    }
    if (activeAccount === 'personal') {
      return emails.filter((_, i) => i % 2 !== 0) // Just a subset for effect
    }
    if (activeAccount === 'projects') {
      return emails.filter(e => e.labels?.includes('URGENT: SERVER'))
    }
    return emails
  }, [emails, activeAccount])

  // Filter emails based on active tab and group by threadId
  const filteredEmails = useMemo(() => {
    let emailsToDisplay = activeEmails;

    if (folder === 'inbox') {
      emailsToDisplay = activeEmails.filter(e => {
        const tab = classifications[e._id] || ruleScore(e).tab;
        return tab === activeTab;
      });
    }

    // Group by threadId, effectively showing only the newest email per thread
    const seenThreads = new Set()
    return emailsToDisplay.filter(e => {
      // If it has no threadId, it's a standalone email, so include it
      if (!e.threadId) return true;
      
      // If we've already seen this threadId, skip this email (since emails are sorted newest first)
      if (seenThreads.has(e.threadId)) return false;
      
      // Mark this thread as seen, keep the email
      seenThreads.add(e.threadId);
      return true;
    });
  }, [activeEmails, activeTab, folder])

  const handleOpen = async (email) => {
    await openEmail(email)
    navigate(`/mail/${email._id}`)
  }

  const handleSmartCategorize = async () => {
    setCategorizing(true)
    try {
      await aiAPI.categorize()
      await fetchEmails(folder) // Reload emails to get new labels
    } catch (error) {
      console.error('Failed to categorize', error)
    } finally {
      setCategorizing(false)
    }
  }

  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)

  const handleManualSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await emailAPI.manualSync()
      if (res.data.success) {
        setSyncResult({ status: 'success', message: 'Sync started! Your inbox should update in a few seconds.' })
        setTimeout(() => fetchEmails(folder), 3000)
      } else {
        const err = res.data.results?.find(r => r.status === 'error') || res.data;
        setSyncResult({ status: 'error', message: err.message, code: err.code })
      }
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.message || 'Failed to contact sync service.';
      setSyncResult({ status: 'error', message: `Sync failed: ${serverMsg}` })
    } finally {
      setSyncing(false)
    }
  }


  if (loading && !emails.length) {
    return (
      <div className="inbox-loading">
        <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
        <span>Loading {folder}...</span>
      </div>
    )
  }

  return (
    <div className={`inbox-layout${compactView ? ' compact' : ''}`}>
      {/* Email list column */}
      <div className="inbox-list-col">
        {/* Reconnect Banner */}
        {accounts.some(a => a.needsReconnect && (activeAccount === 'all' || activeAccount === a.id)) && (
          <div className="account-banner warning">
            <div className="account-banner-content">
              <span className="account-banner-icon">
                <SidebarIcon size={16} color="currentColor">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </SidebarIcon>
              </span>
              <span className="account-banner-text">
                <b>Connection Repair Needed:</b> Some accounts have lost their Gmail sync permissions.
              </span>
            </div>
            <button 
              className="account-banner-action"
              onClick={() => {
                window.location.href = '/api/auth/google'
              }}
            >
              Fix Connection
            </button>
          </div>
        )}

        {/* Account Banner */}
        {activeAccount && activeAccount !== 'all' && (
          <div className="account-banner">
            <div className="account-banner-content">
              <span className="account-banner-icon">
                <SidebarIcon size={16} color="currentColor">
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                  <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                  <path d="M9 12H4s.55-3.03 2-5c1.62-2.2 5-3 5-3"/>
                  <path d="M12 15v5s3.03-.55 5-2c2.2-1.62 3-5 3-5"/>
                </SidebarIcon>
              </span>
              <span className="account-banner-text">
                Viewing <span className="account-email">{accounts.find(a => a.id === activeAccount)?.email || activeAccount}</span> Account
              </span>
            </div>
            <button 
              className="account-banner-clear"
              onClick={() => dispatch({ type: 'SET_ACCOUNT', payload: 'all' })}
            >
              Clear Filter
            </button>
          </div>
        )}

        {/* Tab switcher — only for inbox */}
        {folder === 'inbox' && (
          <div className="inbox-tabs">
            {TABS.map(tab => {
              const badgeCount = activeEmails.filter(e => {
                const eTab = classifications[e._id] || ruleScore(e).tab;
                return !e.isRead && eTab === tab.id;
              }).length;
              
              return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                className={`inbox-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.Icon && <span className="tab-icon"><tab.Icon /></span>}
                {tab.label}
                {badgeCount > 0 && <span className="tab-badge">{badgeCount}</span>}
              </button>
              )
            })}
          </div>
        )}

        {/* Folder title for non-inbox */}
        {folder !== 'inbox' && (
          <div className="folder-header">
            <h1 className="folder-title">{folder.charAt(0).toUpperCase() + folder.slice(1)}</h1>
            <span className="folder-count">{activeEmails.length} messages</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredEmails.length === 0 && (
          <div className="empty-state" style={{ marginTop: 60 }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
              <SidebarIcon size={48} color="currentColor">
                <path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5a2.5 2.5 0 0 1 5 0c0 .5.12 1.01.46 1.41l2.34 2.37c.34.4.84.62 1.36.62h1.68c.52 0 1.02-.22 1.36-.62l2.34-2.37c.34-.4.46-.91.46-1.41a2.5 2.5 0 0 1 5 0V17z"/>
                <path d="M11 13H5"/>
              </SidebarIcon>
            </div>
            <p style={{ fontWeight: 600, fontSize: 16 }}>No emails here</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 10 }}>Your {folder} is empty.</p>
            
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <button 
                className="btn btn-primary btn-sm" 
                onClick={handleManualSync} 
                disabled={syncing}
                style={{ minWidth: 160 }}
              >
                {syncing ? 'Checking Sync...' : 'Sync My Emails'}
              </button>
              
              {syncResult && (
                <div style={{ 
                  padding: '12px 16px', 
                  borderRadius: '10px', 
                  fontSize: '13px',
                  maxWidth: '320px',
                  textAlign: 'center',
                  background: syncResult.status === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.08)',
                  color: syncResult.status === 'success' ? '#10B981' : '#EF4444',
                  border: `1px solid ${syncResult.status === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.15)'}`,
                  animation: 'fadeIn 0.3s ease-out'
                }}>
                  {syncResult.message}
                  {(syncResult.code === 'EXPIRED_TOKEN' || syncResult.code === 'MISSING_TOKENS' || syncResult.code === 'SCOPE_ERROR') && (
                    <button 
                      className="btn btn-sm" 
                      id="fix-connection-btn"
                      style={{ marginTop: 10, width: '100%', background: '#EF4444', color: '#fff', border: 'none', fontWeight: 700 }}
                      onClick={() => {
                        clearToken();
                        window.location.href = '/api/auth/google';
                      }}
                    >
                      Sign Out & Reconnect Google
                    </button>
                  )}
                </div>
              )}

              {folder === 'inbox' && !syncing && (!syncResult || syncResult.status === 'success') && (
                <button className="btn btn-link btn-sm" style={{ opacity: 0.6, fontSize: 12 }} onClick={() => dispatch({ type: 'OPEN_COMPOSE' })}>
                  Or compose an email
                </button>
              )}
            </div>
          </div>
        )}

        {/* Email list */}
        <div className="email-list">
          {filteredEmails.map(email => (
            <div
              key={email._id}
              id={`email-item-${email._id}`}
              className={`email-item ${!email.isRead ? 'unread' : ''} ${activeEmail?._id === email._id ? 'selected' : ''}`}
              onClick={() => handleOpen(email)}
            >
              <div
                className="avatar avatar-md email-avatar"
                style={{ background: avatarColor(email.from.name || email.from.address), color: '#fff' }}
              >
                {getInitials(email.from.name || email.from.address)}
              </div>

              <div className="email-item-content">
                <div className="email-item-row1">
                  <span className="email-sender">{email.from.name || email.from.address}</span>
                  <span className="email-time">{formatTime(email.receivedAt || email.createdAt)}</span>
                </div>
                <div className="email-item-row2">
                  <span className="email-subject">{email.subject}</span>
                  {email.attachments?.length > 0 && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: 'var(--text-muted)' }}>
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                    </svg>
                  )}
                </div>
                <div className="email-preview">{email.bodyText?.slice(0, 90) || ''}</div>
                <div className="email-labels">
                    {email.labels
                       ?.filter(l => !['PRIMARY', 'SOCIAL', 'PROMOTIONS', 'PROMOTION', 'UPDATES', 'CATEGORIZED'].includes((l || '').toUpperCase()))
                       .slice(0, 2)
                       .map(l => (
                      <span key={l} className="badge badge-muted" style={{ fontSize: 10 }}>{l}</span>
                    ))}
                    {/* Layer indicator for debugging (optional) */}
                    {/* <span style={{fontSize: 8, opacity: 0.5}}>L{classifications[email._id]?.layer}</span> */}
                  </div>
              </div>

              <button
                id={`star-btn-${email._id}`}
                className={`star-btn ${email.isStarred ? 'starred' : ''}`}
                onClick={e => { e.stopPropagation(); starEmail(email._id, !email.isStarred) }}
              >
                {email.isStarred ? '★' : '☆'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — empty state or tasks */}
      <div className="inbox-right-col">
        {folder === 'inbox' && (
          <>
            {/* Upcoming tasks */}
            <div className="card" style={{ padding: '18px 20px', marginBottom: 16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 14 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700 }}>Upcoming Tasks</h3>
                <button 
                  onClick={handleAddTask}
                  className="task-add-btn"
                  style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg-active)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }}
                  title="Add Task"
                >
                  <SidebarIcon size={14} color="var(--accent)">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </SidebarIcon>
                </button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
                {tasks.map(task => (
                  <div key={task.id} className="task-item" style={{ opacity: task.completed ? 0.6 : 1 }}>
                     <div 
                        className="task-dot" 
                        style={{ background: task.completed ? 'var(--text-muted)' : task.color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                        onClick={() => handleToggleTask(task.id)}
                     >
                        {task.completed && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff' }} />}
                     </div>
                     <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                       {editingTaskId === task.id ? (
                         <input 
                           autoFocus
                           className="input"
                           style={{ padding: '4px 8px', fontSize: '13px', width: '100%', background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: '4px', outline: 'none' }}
                           value={task.title}
                           onChange={e => handleTaskChange(task.id, e.target.value)}
                           onBlur={() => setEditingTaskId(null)}
                           onKeyDown={e => e.key === 'Enter' && setEditingTaskId(null)}
                         />
                       ) : (
                         <div 
                           style={{ 
                             fontSize: 13, 
                             fontWeight: 600, 
                             color: 'var(--text-primary)', 
                             cursor: 'text', 
                             flex: 1,
                             textDecoration: task.completed ? 'line-through' : 'none'
                           }} 
                           onClick={() => setEditingTaskId(task.id)}
                           title="Click to edit"
                         >
                           {task.title}
                         </div>
                       )}

                     </div>
                     {!editingTaskId && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                          style={{ color: 'var(--text-muted)', fontSize: 18, opacity: 0, cursor: 'pointer', border: 'none', background: 'none', padding: '0 4px' }}
                          className="hover-danger"
                          title="Delete"
                        >
                          ×
                        </button>
                     )}
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly summary card */}
            <div className="card weekly-summary-card">
              <div className="weekly-summary-header">
                <SidebarIcon size={18} color="var(--accent)">
                  <path d="M18 20V10"/>
                  <path d="M12 20V4"/>
                  <path d="M6 20v-6"/>
                </SidebarIcon>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Weekly Summary</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{getWeekRange()}</div>
                </div>
              </div>
              <div className="weekly-stats">
                <div className="stat-item">
                  <span className="stat-num">{filteredEmails.length}</span>
                  <span className="stat-label">Received</span>
                </div>
                <div className="stat-item">
                  <span className="stat-num">{filteredEmails.filter(e => e.isRead).length}</span>
                  <span className="stat-label">Read</span>
                </div>
                <div className="stat-item">
                  <span className="stat-num">{unreadCount}</span>
                  <span className="stat-label">Unread</span>
                </div>
              </div>
            </div>

            {/* Smart Categorize CTA */}
            <div className="card smart-cta-card" style={{ marginTop: 16, padding: '16px 20px' }}>
              <div style={{ display:'flex', gap: 12, alignItems:'flex-start' }}>
                <SidebarIcon size={24} color="var(--accent)">
                  <path d="M12 8V4H8"/>
                  <rect x="5" y="8" width="14" height="10" rx="2"/>
                  <circle cx="9" cy="12" r="1"/>
                  <circle cx="15" cy="12" r="1"/>
                  <path d="M6 4l3.06 3.06"/>
                  <path d="M18 4l-3.06 3.06"/>
                </SidebarIcon>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Smart Categorize</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                    Let AI automatically sort your emails into categories.
                  </div>
                  <button 
                    className="btn btn-primary btn-sm" 
                    style={{ fontSize: 11 }}
                    onClick={handleSmartCategorize}
                    disabled={categorizing}
                  >
                    {categorizing ? 'Processing...' : 'Enable Smart Inbox'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {folder !== 'inbox' && (
          <>
            {/* Upcoming tasks */}
            <div className="card" style={{ padding: '18px 20px', marginBottom: 16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 14 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700 }}>Upcoming Tasks</h3>
                <button 
                  onClick={handleAddTask}
                  className="task-add-btn"
                  style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg-active)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }}
                  title="Add Task"
                >
                  <SidebarIcon size={14} color="var(--accent)">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </SidebarIcon>
                </button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
                {tasks.map(task => (
                  <div key={task.id} className="task-item" style={{ opacity: task.completed ? 0.6 : 1 }}>
                     <div 
                        className="task-dot" 
                        style={{ background: task.completed ? 'var(--text-muted)' : task.color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                        onClick={() => handleToggleTask(task.id)}
                     >
                        {task.completed && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff' }} />}
                     </div>
                     <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                       {editingTaskId === task.id ? (
                         <input 
                           autoFocus
                           className="input"
                           style={{ padding: '4px 8px', fontSize: '13px', width: '100%', background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: '4px', outline: 'none' }}
                           value={task.title}
                           onChange={e => handleTaskChange(task.id, e.target.value)}
                           onBlur={() => setEditingTaskId(null)}
                           onKeyDown={e => e.key === 'Enter' && setEditingTaskId(null)}
                         />
                       ) : (
                         <div 
                           style={{ 
                             fontSize: 13, 
                             fontWeight: 600, 
                             color: 'var(--text-primary)', 
                             cursor: 'text', 
                             flex: 1,
                             textDecoration: task.completed ? 'line-through' : 'none'
                           }} 
                           onClick={() => setEditingTaskId(task.id)}
                           title="Click to edit"
                         >
                           {task.title}
                         </div>
                       )}
                       {!editingTaskId && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{task.time}</div>
                       )}
                     </div>
                     {!editingTaskId && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                          style={{ color: 'var(--text-muted)', fontSize: 18, opacity: 0, cursor: 'pointer', border: 'none', background: 'none', padding: '0 4px' }}
                          className="hover-danger"
                          title="Delete"
                        >
                          ×
                        </button>
                     )}
                  </div>
                ))}
              </div>
            </div>

            {/* Folder stats */}
            <div className="card" style={{ padding: '18px 20px' }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                {folder.charAt(0).toUpperCase() + folder.slice(1)} Stats
              </h3>
              <div className="weekly-stats">
                <div className="stat-item">
                  <span className="stat-num">{filteredEmails.length}</span>
                  <span className="stat-label">Total</span>
                </div>
                <div className="stat-item">
                  <span className="stat-num">{filteredEmails.filter(e => e.isRead).length}</span>
                  <span className="stat-label">Read</span>
                </div>
                <div className="stat-item">
                  <span className="stat-num">{filteredEmails.filter(e => !e.isRead).length}</span>
                  <span className="stat-label">Unread</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
