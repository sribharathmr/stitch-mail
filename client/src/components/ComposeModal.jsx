import { useState, useRef } from 'react'
import { useEmail } from '../context/EmailContext'
import { emailAPI, aiAPI } from '../api'
import './ComposeModal.css'

function RecipientChip({ value, onRemove }) {
  return (
    <span className="recipient-chip">
      {value.name || value.address || value}
      <button type="button" onClick={onRemove}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </span>
  )
}

export default function ComposeModal() {
  const { composeDraft, dispatch, fetchEmails, folder } = useEmail()
  const [to, setTo] = useState([])
  const [toInput, setToInput] = useState('')
  const [cc, setCc] = useState([])
  const [bcc, setBcc] = useState([])
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [subject, setSubject] = useState(composeDraft.subject || '')
  const [body, setBody] = useState(composeDraft.bodyText || '')
  const [attachments, setAttachments] = useState([])
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scheduled, setScheduled] = useState(null)
  
  // AI Smart Compose State
  const [intent, setIntent] = useState('')
  const [tone, setTone] = useState('professional')
  const [isDrafting, setIsDrafting] = useState(false)

  const fileRef = useRef()

  const close = () => dispatch({ type: 'CLOSE_COMPOSE' })

  const addRecipient = (input, setter, inputSetter) => {
    const val = input.trim()
    if (!val) return
    setter(prev => [...prev, { name: val, address: val }])
    inputSetter('')
  }

  const handleSend = async () => {
    const finalTo = [...to]
    if (toInput.trim()) finalTo.push({ name: toInput.trim(), address: toInput.trim() })

    const ccExt = document.getElementById('compose-cc')?.value.trim()
    const finalCc = [...cc]
    if (ccExt) finalCc.push({ name: ccExt, address: ccExt })

    const bccExt = document.getElementById('compose-bcc')?.value.trim()
    const finalBcc = [...bcc]
    if (bccExt) finalBcc.push({ name: bccExt, address: bccExt })

    if (!finalTo.length) return alert('Please add at least one recipient')
    setSending(true)
    try {
      const fd = new FormData()
      fd.append('to', JSON.stringify(finalTo))
      fd.append('cc', JSON.stringify(finalCc))
      fd.append('bcc', JSON.stringify(finalBcc))
      fd.append('subject', subject || '(No Subject)')
      fd.append('bodyHtml', `<p>${body.replace(/\n/g,'</p><p>')}</p>`)
      fd.append('bodyText', body)
      attachments.forEach(f => fd.append('attachments', f))
      await emailAPI.send(fd)
      close()
      fetchEmails(folder || 'inbox')
    } catch (err) {
      alert('Failed to send: ' + (err?.response?.data?.message || err.message))
    } finally {
      setSending(false)
    }
  }

  const handleDraft = async () => {
    setSaving(true)
    try {
      const finalTo = [...to]
      if (toInput.trim()) finalTo.push({ name: toInput.trim(), address: toInput.trim() })

      const fd = new FormData()
      fd.append('to', JSON.stringify(finalTo))
      fd.append('subject', subject)
      fd.append('bodyText', body)
      fd.append('bodyHtml', `<p>${body.replace(/\n/g,'</p><p>')}</p>`)
      await emailAPI.draft(fd)
      close()
    } catch (_) {} finally { setSaving(false) }
  }

  const handleFileChange = (e) => {
    setAttachments(prev => [...prev, ...Array.from(e.target.files)])
    e.target.value = ''
  }

  const handleSmartDraft = async () => {
    if (!intent) return alert('Please enter an intent first')
    setIsDrafting(true)
    try {
      const res = await aiAPI.draftIntent({ intent, tone, threadId: composeDraft.threadId })
      setBody(res.data.draft)
    } catch (err) {
      console.error(err)
      alert('Failed to generate draft: ' + (err.response?.data?.message || err.message))
    } finally {
      setIsDrafting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
      <div className="modal compose-modal fade-in" role="dialog" aria-label="Compose email">
        {/* Header */}
        <div className="compose-header">
          <h2 className="compose-title">New Message</h2>
          <div style={{ display:'flex', gap: 4 }}>
            <button className="btn-icon" onClick={close} id="compose-minimize">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14"/>
              </svg>
            </button>
            <button className="btn-icon" onClick={close} id="compose-close">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="compose-body">
          {/* To */}
          <div className="compose-field">
            <span className="field-label">To</span>
            <div className="recipient-field">
              {to.map((r, i) => <RecipientChip key={i} value={r} onRemove={() => setTo(to.filter((_,j) => j !== i))} />)}
              <input
                id="compose-to"
                className="recipient-input"
                value={toInput}
                onChange={e => setToInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addRecipient(toInput, setTo, setToInput) } }}
                placeholder={to.length ? '' : "Recipients"}
              />
            </div>
            <div style={{ display:'flex', gap: 8, marginLeft: 'auto' }}>
              {!showCc && <button className="cc-toggle" onClick={() => setShowCc(true)}>Cc</button>}
              {!showBcc && <button className="cc-toggle" onClick={() => setShowBcc(true)}>Bcc</button>}
            </div>
          </div>

          {/* Cc */}
          {showCc && (
            <div className="compose-field">
              <span className="field-label">Cc</span>
              <div className="recipient-field">
                {cc.map((r,i) => <RecipientChip key={i} value={r} onRemove={() => setCc(cc.filter((_,j) => j!==i))} />)}
                <input id="compose-cc" className="recipient-input" placeholder="Cc recipients"
                  onKeyDown={e => { if (e.key==='Enter'||e.key===',') { e.preventDefault(); addRecipient(e.target.value,setCc,()=>e.target.value='') }}} />
              </div>
            </div>
          )}

          {/* Bcc */}
          {showBcc && (
            <div className="compose-field">
              <span className="field-label">Bcc</span>
              <div className="recipient-field">
                {bcc.map((r,i) => <RecipientChip key={i} value={r} onRemove={() => setBcc(bcc.filter((_,j) => j!==i))} />)}
                <input id="compose-bcc" className="recipient-input" placeholder="Bcc recipients"
                  onKeyDown={e => { if (e.key==='Enter'||e.key===',') { e.preventDefault(); addRecipient(e.target.value,setBcc,()=>e.target.value='') }}} />
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="compose-field">
            <span className="field-label">Subject</span>
            <input
              id="compose-subject"
              className="subject-input"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Subject"
            />
          </div>

          {/* Smart Compose UI */}
          <div className="smart-compose">
            <div className="smart-compose-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span>Intent-Based Writing</span>
            </div>
            <div className="smart-compose-row">
              <input
                className="smart-compose-input"
                value={intent}
                onChange={e => setIntent(e.target.value)}
                placeholder="e.g. Ask for next week off, Reject candidate politely..."
                disabled={isDrafting}
              />
              <select
                className="smart-compose-select"
                value={tone}
                onChange={e => setTone(e.target.value)}
                disabled={isDrafting}
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="direct">Direct</option>
                <option value="enthusiastic">Enthusiastic</option>
              </select>
              <button
                type="button"
                className="smart-compose-btn"
                onClick={handleSmartDraft}
                disabled={!intent || isDrafting}
              >
                {isDrafting ? 'Drafting...' : '✨ Generate'}
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="compose-toolbar">
            {['B','I','U','🔗','•≡','1≡'].map((t,i) => (
              <button key={i} type="button" className="toolbar-btn" title={t}>{t}</button>
            ))}
            <div className="toolbar-divider"/>
            <button type="button" className="toolbar-btn" onClick={() => fileRef.current?.click()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
          </div>

          {/* Body */}
          <textarea
            id="compose-body"
            className="compose-body-input"
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write your message here..."
          />

          {/* Scheduled badge */}
          {scheduled && (
            <div className="scheduled-badge">
              <span>🕐</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#D97706' }}>SCHEDULED FOR {scheduled}</span>
              <button type="button" onClick={() => setScheduled(null)} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          )}

          {/* Attachment chips */}
          {attachments.length > 0 && (
            <div className="attachment-chips">
              {attachments.map((f, i) => (
                <div key={i} className="attachment-chip">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span>{f.name}</span>
                  <span className="chip-size">{(f.size/1024).toFixed(0)}KB</span>
                  <button type="button" onClick={() => setAttachments(attachments.filter((_,j)=>j!==i))}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="compose-footer">
          <input type="file" ref={fileRef} multiple hidden onChange={handleFileChange} />
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
            </svg>
            Attach
          </button>
          <button
            type="button"
            id="compose-draft-btn"
            className="btn btn-secondary btn-sm"
            onClick={handleDraft}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            id="compose-send-btn"
            className="btn btn-primary btn-sm"
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? 'Sending...' : 'Send'}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
