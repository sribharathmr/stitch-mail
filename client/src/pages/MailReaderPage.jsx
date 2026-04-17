import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEmail } from '../context/EmailContext'
import { emailAPI, aiAPI } from '../api'
import { format } from 'date-fns'
import EmailBodyRenderer from '../components/EmailBodyRenderer'
import './MailReaderPage.css'
function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const LABEL_COLORS = {
  'DESIGN TEAM': '#3B82F6', 'DESIGN DISCUSSION': '#3B82F6',
  'ALEX RIVERA': '#8B5CF6', 'URGENT: SERVER': '#EF4444',
  'DRIBBBLE': '#EC4899', 'GITHUB': '#0F172A',
  'NEWSLETTER': '#10B981', 'SOCIAL': '#8B5CF6',
  'PROMOTIONS': '#F59E0B', 'PRIMARY': '#3B82F6',
  'DEFAULT': '#6366F1',
}

const AVATAR_COLORS = ['#3B82F6','#8B5CF6','#EC4899','#10B981','#F59E0B','#EF4444','#06B6D4','#84CC16']
function avatarColor(name = '') {
  let h = 0; for (let c of name) h = c.charCodeAt(0) + ((h<<5)-h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

// Check if an attachment is a media file (image/video)
function isMediaAttachment(a) {
  const mime = (a.mimetype || '').toLowerCase()
  const fname = (a.filename || '').toLowerCase()
  return mime.startsWith('image/') || mime.startsWith('video/') ||
    /\.(jpg|jpeg|png|gif|webp|svg|bmp|mp4|webm|mov)$/.test(fname)
}

export default function MailReaderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeEmail, dispatch, emails, openEmail, starEmail, moveEmail, deleteEmail } = useEmail()
  const [insights, setInsights] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [threadEmails, setThreadEmails] = useState([])
  const [showThread, setShowThread] = useState(true)
  const [expandedThreadIds, setExpandedThreadIds] = useState(new Set())
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  useEffect(() => {
    setInsights(null)
    setThreadEmails([])
    if (id && (!activeEmail || activeEmail._id !== id)) {
      emailAPI.get(id)
        .then(res => {
          dispatch({ type: 'SET_ACTIVE', payload: res.data.email })
          // Fetch thread if threadId exists
          if (res.data.email?.threadId) {
            fetchThread(res.data.email.threadId)
          }
        })
        .catch(() => navigate('/inbox'))
    } else if (activeEmail?.threadId) {
      fetchThread(activeEmail.threadId)
    }
  }, [id])

  const fetchThread = async (threadId) => {
    try {
      // Search for all emails with same threadId from the emails list
      const res = await emailAPI.list({ folder: 'inbox', limit: 50 })
      const allEmails = res.data.emails || []
      const thread = allEmails.filter(e => e.threadId === threadId || e._id === id)
      // Sort chronologically
      thread.sort((a, b) => new Date(a.receivedAt || a.createdAt) - new Date(b.receivedAt || b.createdAt))
      if (thread.length > 1) {
        setThreadEmails(thread)
        // Expand the current email by default
        setExpandedThreadIds(new Set([id]))
      }
    } catch (err) {
      console.error('Failed to fetch thread:', err)
    }
  }

  if (!activeEmail) {
    return (
      <div className="reader-layout">
        <div className="reader-empty">
          <div style={{ fontSize: 56 }}>✉️</div>
          <h3>Select an email to read</h3>
          <p>Choose from your inbox on the left</p>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/inbox')}>
            Go to Inbox
          </button>
        </div>
      </div>
    )
  }

  const email = activeEmail
  const labelColor = email.labels?.[0] ? LABEL_COLORS[email.labels[0]] || LABEL_COLORS.DEFAULT : null

  // Collect media attachments from current email and thread
  const allAttachments = email.attachments || []
  const mediaAttachments = allAttachments.filter(isMediaAttachment)
  const docAttachments = allAttachments.filter(a => !isMediaAttachment(a))

  const handleArchive = () => { moveEmail(email._id, 'archive'); navigate('/inbox'); window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Conversation archived' } })) }
  const handleDelete  = () => { moveEmail(email._id, 'trash'); navigate('/inbox'); window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Conversation moved to Trash' } })) }
  const handleStar    = () => starEmail(email._id, !email.isStarred)
  const handleSpam    = () => { moveEmail(email._id, 'spam'); navigate('/inbox'); window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Conversation reported as spam' } })) }
  const handleMoveTo  = (folder) => { moveEmail(email._id, folder); setShowMoveMenu(false); navigate('/inbox'); window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: `Moved to ${folder}` } })) }
  const handleMarkUnread = async () => { try { const { emailAPI } = await import('../api'); await emailAPI.update(email._id, { isRead: false }); navigate('/inbox'); window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'info', message: 'Marked as unread' } })) } catch(_){} }
  const handlePrint = () => { const w = window.open('','_blank'); w.document.write(`<html><head><title>${email.subject}</title></head><body><h2>${email.subject}</h2><p>From: ${email.from?.name} &lt;${email.from?.address}&gt;</p><hr>${email.bodyHtml || email.bodyText || ''}</body></html>`); w.document.close(); w.print() }
  const handleReply   = () => dispatch({ type: 'OPEN_COMPOSE', payload: {
    to: email.from?.address ? [email.from.address] : [], subject: `Re: ${email.subject}`, bodyText: `\n\n--- Original Message ---\nFrom: ${email.from?.name || email.from?.address}\nDate: ${email.receivedAt ? format(new Date(email.receivedAt), 'MMM d, yyyy h:mm a') : ''}\n\n${email.bodyText || ''}`
  }})
  const handleReplyAll = () => {
    const allRecipients = [email.from, ...(email.to || []), ...(email.cc || [])]
      .filter(r => r?.address)
      .map(r => r.address);
    dispatch({ type: 'OPEN_COMPOSE', payload: {
      to: email.from?.address ? [email.from.address] : [], 
      cc: allRecipients.filter(addr => addr !== email.from?.address),
      subject: `Re: ${email.subject}`, bodyText: `\n\n--- Original Message ---\nFrom: ${email.from?.name || email.from?.address}\n\n${email.bodyText || ''}`
    }})
  }
  const handleForward = () => dispatch({ type: 'OPEN_COMPOSE', payload: {
    subject: `Fwd: ${email.subject}`, bodyText: `\n\n--- Forwarded Message ---\nFrom: ${email.from?.name || email.from?.address}\nTo: ${email.to?.map(t => t.address).join(', ')}\nDate: ${email.receivedAt ? format(new Date(email.receivedAt), 'MMM d, yyyy h:mm a') : ''}\n\n${email.bodyText || ''}`
  }})

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      const res = await aiAPI.memory(email.threadId || email._id)
      setInsights(res.data)
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.message || err.message || 'Unknown error'
      alert('Failed to analyze thread: ' + msg)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const toggleThreadExpand = (emailId) => {
    setExpandedThreadIds(prev => {
      const next = new Set(prev)
      if (next.has(emailId)) next.delete(emailId)
      else next.add(emailId)
      return next
    })
  }

  return (
    <div className="reader-layout">
      {/* Reader action toolbar */}
      <div className="reader-toolbar">
        <button className="btn-icon" onClick={() => navigate(-1)} id="reader-back" data-tooltip="Back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>

        <div style={{ flex: 1 }} />

        <button className="btn-icon" onClick={handleAnalyze} data-tooltip="AI Insights" disabled={isAnalyzing}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        </button>

        <button className="btn-icon" id="reader-archive" onClick={handleArchive} data-tooltip="Archive">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
          </svg>
        </button>
        <button className="btn-icon" id="reader-spam" onClick={handleSpam} data-tooltip="Report Spam">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          </svg>
        </button>
        <button className="btn-icon" id="reader-delete" onClick={handleDelete} data-tooltip="Move to Trash">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
        <button className="btn-icon" id="reader-unread" onClick={handleMarkUnread} data-tooltip="Mark as unread">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/>
          </svg>
        </button>
        <button className={`btn-icon ${email.isStarred ? 'starred' : ''}`} id="reader-star" onClick={handleStar} data-tooltip="Star">
          <svg width="16" height="16" viewBox="0 0 24 24" fill={email.isStarred ? '#F59E0B' : 'none'} stroke={email.isStarred ? '#F59E0B' : 'currentColor'} strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>
        <button className="btn-icon" id="reader-reply" onClick={handleReply} data-tooltip="Reply">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/>
          </svg>
        </button>

        {/* More options dropdown */}
        <div style={{ position: 'relative' }}>
          <button className="btn-icon" onClick={() => setShowMoreMenu(!showMoreMenu)} data-tooltip="More">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
            </svg>
          </button>
          {showMoreMenu && (
            <div className="reader-dropdown" style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', minWidth: 200, padding: '4px 0', zIndex: 100 }} onClick={() => setShowMoreMenu(false)}>
              <button onClick={handleReplyAll} style={{ width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/></svg>
                Reply all
              </button>
              <button onClick={handleForward} style={{ width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 014-4h12"/></svg>
                Forward
              </button>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <button onClick={handleMarkUnread} style={{ width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>
                Mark as unread
              </button>
              <button onClick={handlePrint} style={{ width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Print
              </button>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <button onClick={() => handleMoveTo('inbox')} style={{ width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                📥 Move to Inbox
              </button>
              <button onClick={() => handleMoveTo('spam')} style={{ width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                🛡️ Move to Spam
              </button>
              <button onClick={() => handleMoveTo('trash')} style={{ width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                🗑️ Move to Trash
              </button>
              <button onClick={() => handleMoveTo('archive')} style={{ width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                📦 Move to Archive
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Email content */}
      <div className="reader-content">
        {/* Labels */}
        {email.labels?.length > 0 && (
          <div className="reader-labels">
            {email.labels.map(l => (
              <span
                key={l}
                className="reader-label"
                style={{ background: (LABEL_COLORS[l] || LABEL_COLORS.DEFAULT) + '18', color: LABEL_COLORS[l] || LABEL_COLORS.DEFAULT }}
              >
                {l}
              </span>
            ))}
          </div>
        )}

        {/* Memory AI Insights */}
        {(insights || isAnalyzing) && (
          <div className="reader-insights" style={{ background: 'var(--bg-hover)', borderRadius: '8px', padding: '16px', marginBottom: '24px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              Conversation Memory AI
            </h3>
            {isAnalyzing ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Generating insights... (this may take a few seconds)</div>
            ) : (() => {
              const decisions = Array.isArray(insights.decisions) ? insights.decisions : []
              const actionItems = Array.isArray(insights.actionItems) ? insights.actionItems : []
              const handleExportTasks = async (items) => {
                try {
                  const { settingsAPI } = await import('../api')
                  const res = await settingsAPI.get()
                  const currentPrefs = res.data?.settings?.preferences || {}
                  const currentTasks = currentPrefs.tasks || []
                  
                  const newTasks = [...currentTasks]
                  let added = 0
                  for (const item of items) {
                    const title = String(item)
                    if (!newTasks.some(t => t.title === title)) {
                      newTasks.unshift({
                        id: Date.now() + Math.random(),
                        title: title,
                        color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
                        completed: false
                      })
                      added++
                    }
                  }
                  
                  if (added > 0) {
                    await settingsAPI.update({ preferences: { ...currentPrefs, tasks: newTasks } })
                    window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: `Added ${added} new task(s)` } }))
                  } else {
                    window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'info', message: 'Tasks already in list' } }))
                  }
                } catch (e) {
                  window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Failed to save tasks' } }))
                }
              }

              return (
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                <div style={{ marginBottom: '12px' }}><strong>Summary:</strong> {String(insights.summary || '')}</div>
                {decisions.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Key Decisions:</strong>
                    <ul style={{ margin: '4px 0 0 20px' }}>{decisions.map((d, i) => <li key={i}>{String(d)}</li>)}</ul>
                  </div>
                )}
                {actionItems.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong>Action Items:</strong>
                      <button 
                         onClick={() => handleExportTasks(actionItems)} 
                         style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                      >
                         + Add to Tasks
                      </button>
                    </div>
                    <ul style={{ margin: '6px 0 0 20px' }}>{actionItems.map((a, i) => <li key={i}>{String(a)}</li>)}</ul>
                  </div>
                )}
              </div>
              )
            })()}
          </div>
        )}

        {/* Thread indicator */}
        {threadEmails.length > 1 && (
          <div className="reader-thread-bar" style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
            background: 'var(--bg-hover)', borderRadius: 8, marginBottom: 16,
            border: '1px solid var(--border)', cursor: 'pointer'
          }} onClick={() => setShowThread(!showThread)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {threadEmails.length} messages in this conversation
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ marginLeft: 'auto', transform: showThread ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
        )}

        {/* Thread conversation view */}
        {showThread && threadEmails.length > 1 && (
          <div style={{ marginBottom: 20 }}>
            {threadEmails.map((tEmail, idx) => {
              const isExpanded = expandedThreadIds.has(tEmail._id)
              const isCurrent = tEmail._id === email._id
              return (
                <div key={tEmail._id} style={{
                  border: '1px solid var(--border)',
                  borderRadius: 10, marginBottom: 8,
                  background: isCurrent ? 'rgba(59,130,246,0.04)' : 'var(--bg-card)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    cursor: 'pointer', userSelect: 'none'
                  }} onClick={() => toggleThreadExpand(tEmail._id)}>
                    <div className="avatar avatar-sm" style={{
                      background: avatarColor(tEmail.from?.name || tEmail.from?.address || ''),
                      color: '#fff', fontSize: 10, flexShrink: 0
                    }}>
                      {getInitials(tEmail.from?.name || tEmail.from?.address || '')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: tEmail.isRead === false ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tEmail.from?.name || tEmail.from?.address}
                        {isCurrent && <span style={{ fontSize: 10, color: '#3B82F6', fontWeight: 700, marginLeft: 6 }}>CURRENT</span>}
                      </div>
                      {!isExpanded && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tEmail.bodyText?.slice(0, 80) || ''}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {tEmail.receivedAt ? format(new Date(tEmail.receivedAt), 'MMM d, h:mm a') : ''}
                    </div>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </div>
                  {isExpanded && (
                    <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ padding: '12px 0', fontSize: 14, lineHeight: 1.7 }}>
                        <EmailBodyRenderer bodyHtml={tEmail.bodyHtml} bodyText={tEmail.bodyText} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Subject */}
        <h1 className="reader-subject">{email.subject}</h1>

        {/* Sender info */}
        <div className="reader-sender-row">
          <div className="avatar avatar-lg" style={{ background: avatarColor(email.from?.name || email.from?.address || ''), color: '#fff' }}>
            {getInitials(email.from?.name || email.from?.address || '')}
          </div>
          <div className="reader-sender-info">
            <div className="reader-sender-name">{email.from?.name || email.from?.address}</div>
            <div className="reader-sender-addr">
              {email.from?.address}
              {email.to?.length > 0 && <span style={{ color: 'var(--text-muted)' }}> → {email.to.map(t => t.address).join(', ')}</span>}
            </div>
          </div>
          <div className="reader-date">
            {email.receivedAt ? format(new Date(email.receivedAt), 'MMM d, yyyy · h:mm a') : ''}
          </div>
        </div>

        <div className="divider" style={{ margin: '16px 0' }} />

        {/* Body — only show if not in thread mode or thread has <= 1 email */}
        {(threadEmails.length <= 1) && (
          <div className="reader-body">
            <EmailBodyRenderer bodyHtml={email.bodyHtml} bodyText={email.bodyText} />
          </div>
        )}

        {/* Media Gallery */}
        {mediaAttachments.length > 0 && (
          <div style={{ marginTop: 20, marginBottom: 20 }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
              Media Received ({mediaAttachments.length})
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {mediaAttachments.map((a, i) => {
                const attachmentId = a.attachmentId || a.partId;
                const encodedEmailId = encodeURIComponent(email._id);
                const encodedAttachmentId = encodeURIComponent(attachmentId);
                const proxyUrl = attachmentId ? `${process.env.REACT_APP_API_URL || ''}/api/emails/${encodedEmailId}/attachments/${encodedAttachmentId}` : (a.path || '#');
                return (
                  <a key={i} href={proxyUrl} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      padding: 12, background: 'var(--bg-hover)', borderRadius: 12,
                      border: '1px solid var(--border)', textDecoration: 'none', color: 'inherit',
                      transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden'
                    }} className="attachment-card">
                    <a 
                      href={proxyUrl} 
                      download={a.filename} 
                      className="attachment-download-btn"
                      onClick={(e) => e.stopPropagation()}
                      title="Download"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                    </a>
                    <div style={{
                      width: '100%', paddingTop: '75%', borderRadius: 8, overflow: 'hidden',
                      background: 'rgba(0,0,0,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                    }}>
                      {(a.mimetype || '').startsWith('image/') ? (
                        <img 
                          src={proxyUrl} 
                          alt={a.filename} 
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                          {(a.mimetype || '').startsWith('video/') ? '🎬' : '🖼️'}
                        </div>
                      )}
                    </div>
                    <div style={{ width: '100%', marginTop: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', wordBreak: 'break-all', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.filename}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 2 }}>{a.size ? `${(a.size/1024).toFixed(0)}KB` : ''}</div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Document Attachments */}
        {docAttachments.length > 0 && (
          <div className="reader-attachments">
            <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Attachments ({docAttachments.length})
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {docAttachments.map((a, i) => {
                const attachmentId = a.attachmentId || a.partId;
                const encodedEmailId = encodeURIComponent(email._id);
                const encodedAttachmentId = encodeURIComponent(attachmentId);
                const proxyUrl = attachmentId ? `${process.env.REACT_APP_API_URL || ''}/api/emails/${encodedEmailId}/attachments/${encodedAttachmentId}` : a.path;
                return (
                  <a key={i} href={proxyUrl} download={a.filename} className="attachment-pill">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.filename}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11, marginRight: 8 }}>{a.size ? `${(a.size/1024).toFixed(0)}KB` : ''}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8, flexShrink: 0 }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick reply actions */}
        <div className="reader-quick-reply" style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          <button className="btn btn-primary" onClick={handleReply} id="reader-quick-reply" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/>
            </svg>
            Reply to {email.from?.name || email.from?.address}
          </button>
          <button className="btn btn-secondary" onClick={handleReplyAll} id="reader-reply-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/>
            </svg>
            Reply All
          </button>
          <button className="btn btn-secondary" id="reader-forward" onClick={handleForward}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 014-4h12"/>
            </svg>
            Forward
          </button>
        </div>
      </div>
    </div>
  )
}
