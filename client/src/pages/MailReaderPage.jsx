import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEmail } from '../context/EmailContext'
import { emailAPI, aiAPI } from '../api'
import { format } from 'date-fns'
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

  const handleArchive = () => { moveEmail(email._id, 'archive'); navigate('/inbox') }
  const handleDelete  = () => { deleteEmail(email._id); navigate('/inbox') }
  const handleStar    = () => starEmail(email._id, !email.isStarred)
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
        <button className="btn-icon" id="reader-delete" onClick={handleDelete} data-tooltip="Delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
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
                    <strong>Action Items:</strong>
                    <ul style={{ margin: '4px 0 0 20px' }}>{actionItems.map((a, i) => <li key={i}>{String(a)}</li>)}</ul>
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
                        {tEmail.bodyHtml ? (
                          <div dangerouslySetInnerHTML={{ __html: tEmail.bodyHtml }} />
                        ) : (
                          <pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', fontSize: 14 }}>{tEmail.bodyText}</pre>
                        )}
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
            {email.bodyHtml ? (
              <div dangerouslySetInnerHTML={{ __html: email.bodyHtml }} />
            ) : (
              <pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', fontSize: 14 }}>{email.bodyText}</pre>
            )}
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
              {mediaAttachments.map((a, i) => (
                <a key={i} href={a.path || '#'} target="_blank" rel="noopener noreferrer" download
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: 10, background: 'var(--bg-hover)', borderRadius: 10,
                    border: '1px solid var(--border)', textDecoration: 'none', color: 'inherit',
                    transition: 'border-color 0.2s'
                  }}>
                  <div style={{
                    width: '100%', paddingTop: '75%', borderRadius: 6, overflow: 'hidden',
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                  }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                      {(a.mimetype || '').startsWith('video/') ? '🎬' : '🖼️'}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', wordBreak: 'break-all' }}>{a.filename}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.size ? `${(a.size/1024).toFixed(0)}KB` : ''}</span>
                </a>
              ))}
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
              {docAttachments.map((a, i) => (
                <a key={i} href={a.path} download className="attachment-pill">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span>{a.filename}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{a.size ? `${(a.size/1024).toFixed(0)}KB` : ''}</span>
                </a>
              ))}
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
