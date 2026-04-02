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
  'NEWSLETTER': '#10B981', 'DEFAULT': '#6366F1',
}

export default function MailReaderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeEmail, dispatch, emails, openEmail, starEmail, moveEmail, deleteEmail } = useEmail()
  const [insights, setInsights] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    setInsights(null)
    if (id && (!activeEmail || activeEmail._id !== id)) {
      emailAPI.get(id)
        .then(res => dispatch({ type: 'SET_ACTIVE', payload: res.data.email }))
        .catch(() => navigate('/inbox'))
    }
  }, [id])

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

  const handleArchive = () => { moveEmail(email._id, 'archive'); navigate('/inbox') }
  const handleDelete  = () => { deleteEmail(email._id); navigate('/inbox') }
  const handleStar    = () => starEmail(email._id, !email.isStarred)
  const handleReply   = () => dispatch({ type: 'OPEN_COMPOSE', payload: {
    to: [email.from], subject: `Re: ${email.subject}`
  }})

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      const res = await aiAPI.memory(email.threadId || email._id)
      setInsights(res.data)
    } catch (err) {
      console.error(err)
      alert('Failed to analyze thread.')
    } finally {
      setIsAnalyzing(false)
    }
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

        {/* Subject */}
        <h1 className="reader-subject">{email.subject}</h1>

        {/* Sender info */}
        <div className="reader-sender-row">
          <div className="avatar avatar-lg" style={{ background: '#3B82F6', color: '#fff' }}>
            {getInitials(email.from.name || email.from.address)}
          </div>
          <div className="reader-sender-info">
            <div className="reader-sender-name">{email.from.name || email.from.address}</div>
            <div className="reader-sender-addr">
              {email.from.address}
              {email.to?.length > 0 && <span style={{ color: 'var(--text-muted)' }}> → {email.to.map(t => t.address).join(', ')}</span>}
            </div>
          </div>
          <div className="reader-date">
            {email.receivedAt ? format(new Date(email.receivedAt), 'MMM d, yyyy · h:mm a') : ''}
          </div>
        </div>

        <div className="divider" style={{ margin: '16px 0' }} />

        {/* Body */}
        <div className="reader-body">
          {email.bodyHtml ? (
            <div dangerouslySetInnerHTML={{ __html: email.bodyHtml }} />
          ) : (
            <pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', fontSize: 14 }}>{email.bodyText}</pre>
          )}
        </div>

        {/* Attachments */}
        {email.attachments?.length > 0 && (
          <div className="reader-attachments">
            <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Attachments ({email.attachments.length})
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {email.attachments.map((a, i) => (
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

        {/* Quick reply */}
        <div className="reader-quick-reply">
          <button className="btn btn-secondary" onClick={handleReply} id="reader-quick-reply">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/>
            </svg>
            Reply
          </button>
          <button className="btn btn-secondary" id="reader-forward"
            onClick={() => dispatch({ type: 'OPEN_COMPOSE', payload: { subject: `Fwd: ${email.subject}`, bodyText: email.bodyText }})}>
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
