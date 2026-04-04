import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEmail } from '../context/EmailContext'
import { useUI } from '../context/UIContext'
import { format, isToday, isYesterday } from 'date-fns'
import { aiAPI } from '../api'
import './InboxPage.css'

const TABS = [
  { id: 'primary', label: 'Primary' },
  { id: 'social', label: 'Social', labelMatch: ['DRIBBBLE', 'GITHUB', 'SOCIAL'] },
  { id: 'promotions', label: 'Promotions', labelMatch: ['NEWSLETTER', 'DESIGN WEEKLY', 'PROMOTIONS'] }
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

const AVATAR_COLORS = ['#3B82F6','#8B5CF6','#EC4899','#10B981','#F59E0B','#EF4444','#06B6D4','#84CC16']
function avatarColor(name = '') {
  let h = 0; for (let c of name) h = c.charCodeAt(0) + ((h<<5)-h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export default function InboxPage({ folder = 'inbox' }) {
  const { emails, loading, unreadCount, fetchEmails, openEmail, starEmail, activeEmail, activeAccount, dispatch } = useEmail()
  const { settings } = useUI()
  const [activeTab, setActiveTab] = useState('primary')
  const [categorizing, setCategorizing] = useState(false)
  
  const [tasks, setTasks] = useState(UPCOMING_TASKS.map(t => ({ ...t, completed: false })))
  const [editingTaskId, setEditingTaskId] = useState(null)
  
  const handleTaskChange = (id, newTitle) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, title: newTitle } : t))
  }

  const handleAddTask = () => {
    const newTask = {
      id: Date.now(),
      title: 'New Task',
      time: 'Today',
      color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      completed: false
    }
    setTasks([newTask, ...tasks])
    setEditingTaskId(newTask.id)
  }

  const handleDeleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id))
  }

  const handleToggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  const navigate = useNavigate()
  const location = useLocation()

  const compactView = settings?.preferences?.compactView ?? false

  useEffect(() => {
    fetchEmails(folder)
  }, [folder, location.pathname])

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

  // Filter emails based on active tab
  const filteredEmails = useMemo(() => {
    if (folder !== 'inbox' || activeTab === 'primary') {
      // Primary: show emails that don't match social/promotions labels
      const allSpecialLabels = TABS.flatMap(t => t.labelMatch || [])
      if (activeTab === 'primary') {
        return activeEmails.filter(e => !e.labels?.some(l => allSpecialLabels.includes(l)))
      }
      return activeEmails
    }
    const tab = TABS.find(t => t.id === activeTab)
    if (!tab?.labelMatch) return activeEmails
    return activeEmails.filter(e => e.labels?.some(l => tab.labelMatch.includes(l)))
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
        {/* Account Banner */}
        {activeAccount && activeAccount !== 'all' && (
          <div style={{ padding: '8px 16px', background: 'var(--bg-active)', borderBottom: '1px solid var(--border)', fontSize: '12px', fontWeight: '600', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '14px' }}>{activeAccount === 'work' ? '💼' : activeAccount === 'personal' ? '🏠' : '🚀'}</span>
              Viewing {activeAccount.charAt(0).toUpperCase() + activeAccount.slice(1)} Account
            </div>
            <button 
              onClick={() => dispatch({ type: 'SET_ACCOUNT', payload: 'all' })}
              style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'underline', cursor: 'pointer' }}
            >
              Clear Filter
            </button>
          </div>
        )}

        {/* Tab switcher — only for inbox */}
        {folder === 'inbox' && (
          <div className="inbox-tabs">
            {TABS.map(tab => {
              const badgeCount = tab.labelMatch
                ? activeEmails.filter(e => !e.isRead && e.labels?.some(l => tab.labelMatch.includes(l))).length
                : 0
              return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                className={`inbox-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
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
            <div style={{ fontSize: 48 }}>📭</div>
            <p style={{ fontWeight: 600, fontSize: 16 }}>No emails here</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Your {folder} is empty.</p>
            {folder === 'inbox' && (
              <button className="btn btn-primary btn-sm" onClick={() => dispatch({ type: 'OPEN_COMPOSE' })}>
                Compose an email
              </button>
            )}
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
                {email.labels?.length > 0 && (
                  <div className="email-labels">
                    {email.labels.slice(0, 2).map(l => (
                      <span key={l} className="badge badge-muted" style={{ fontSize: 10 }}>{l}</span>
                    ))}
                  </div>
                )}
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
                  style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg-active)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 'bold', cursor: 'pointer', border: 'none' }}
                  title="Add Task"
                >
                  +
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

            {/* Weekly summary card */}
            <div className="card weekly-summary-card">
              <div className="weekly-summary-header">
                <span>📊</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Weekly Summary</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>March 24 – 31</div>
                </div>
              </div>
              <div className="weekly-stats">
                <div className="stat-item">
                  <span className="stat-num">{emails.length}</span>
                  <span className="stat-label">Received</span>
                </div>
                <div className="stat-item">
                  <span className="stat-num">{emails.filter(e => e.isRead).length}</span>
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
                <div style={{ fontSize: 24 }}>🤖</div>
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
                  style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg-active)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 'bold', cursor: 'pointer', border: 'none' }}
                  title="Add Task"
                >
                  +
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
