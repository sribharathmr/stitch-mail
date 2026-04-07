import { useState, useRef, useEffect } from 'react'
import { useEmail } from '../context/EmailContext'
import { useCompose } from '../hooks/useCompose'
import './ComposeWindow.css'

function RecipientChip({ value, onRemove }) {
  return (
    <span className="compose-chip">
      {value.name || value.address || value}
      <button type="button" onClick={onRemove}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </span>
  )
}

function getFileIcon(type, name) {
  const mime = (type || '').toLowerCase()
  const fname = (name || '').toLowerCase()
  if (mime.includes('pdf') || fname.endsWith('.pdf')) return '📄'
  if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif)$/.test(fname)) return '🖼️'
  if (mime.includes('document') || fname.endsWith('.doc') || fname.endsWith('.docx')) return '📝'
  return '📎'
}

export default function ComposeWindow({ windowState, index }) {
  const { dispatch } = useEmail()
  const fileRef = useRef(null)
  const editorRef = useRef(null)
  
  const hook = useCompose(windowState, windowState.id)
  
  const [toInput, setToInput] = useState('')
  const [ccInput, setCcInput] = useState('')
  const [bccInput, setBccInput] = useState('')
  const [showScheduleMenu, setShowScheduleMenu] = useState(false)
  const [emptyToError, setEmptyToError] = useState(false)
  const [selectionRect, setSelectionRect] = useState(null)
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  
  const [intent, setIntent] = useState('')
  const [tone, setTone] = useState('Professional')
  const [isGenerating, setIsGenerating] = useState(false)

  const rightOffset = hook.isExpanded ? 0 : 24 + (index * 664)
  
  const handleCloseClick = () => {
    if (hook.hasChanges()) {
      setShowCloseDialog(true)
    } else {
      dispatch({ type: 'CLOSE_COMPOSE', payload: windowState.id })
    }
  }

  const handleCloseAction = async (action) => {
    if (action === 'save') await hook.saveDraftNow()
    if (action !== 'cancel') dispatch({ type: 'CLOSE_COMPOSE', payload: windowState.id })
    setShowCloseDialog(false)
  }

  const addRecipient = (input, setInner, arr, setArr) => {
    const val = input.trim()
    if (!val) return
    const newItems = val.split(',').map(s => {
      const t = s.trim()
      return { name: t, address: t }
    }).filter(i => i.address)
    setArr([...arr, ...newItems])
    setInner('')
    setEmptyToError(false)
  }

  const handleKeyDown = (e, val, setInner, arr, setArr) => {
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',') {
      e.preventDefault()
      addRecipient(val, setInner, arr, setArr)
    }
  }

  const handleSend = async (scheduleDate = null) => {
    let currentTo = [...hook.to]
    if (toInput.trim()) {
      currentTo.push({ name: toInput.trim(), address: toInput.trim() })
      hook.setTo(currentTo)
      setToInput('')
    }
    if (!currentTo.length) {
      setEmptyToError(true)
      setTimeout(() => setEmptyToError(false), 500)
      return
    }
    if (!hook.subject && !window.confirm('Send this message without a subject?')) return

    try {
      await hook.sendEmail(scheduleDate)
      dispatch({ type: 'CLOSE_COMPOSE', payload: windowState.id })
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Message sent' } }))
    } catch (e) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Failed to send' } }))
    }
  }

  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value)
    if (editorRef.current) editorRef.current.focus()
  }

  const handleSelection = () => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !editorRef.current) {
      setSelectionRect(null)
      return
    }
    if (!editorRef.current.contains(sel.anchorNode)) {
      setSelectionRect(null)
      return
    }
    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const editorRect = editorRef.current.getBoundingClientRect()
    setSelectionRect({
      top: rect.top - editorRect.top - 48,
      left: rect.left - editorRect.left + (rect.width / 2) - 60
    })
  }

  const handleGenerate = async () => {
    if (!intent.trim()) return
    setIsGenerating(true)
    // Mocking AI Generation for immediate feedback, in reality calls aiapi.generate
    setTimeout(() => {
      const generated = `Dear team,\n\nI would like to ${intent.toLowerCase()} in a ${tone.toLowerCase()} manner.\n\nBest regards,\nUser`
      hook.setBodyHtml(generated.replace(/\n/g, '<br>'))
      hook.setBodyText(generated)
      if (editorRef.current) editorRef.current.innerHTML = generated.replace(/\n/g, '<br>')
      setIsGenerating(false)
    }, 1200)
  }

  const handleEditorInput = (e) => {
    hook.setBodyHtml(e.currentTarget.innerHTML)
    hook.setBodyText(e.currentTarget.innerText)
  }

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelection)
    return () => document.removeEventListener('selectionchange', handleSelection)
  }, [])

  return (
    <div className={`compose-window-wrapper ${hook.isExpanded ? 'expanded' : ''} ${hook.isMinimized ? 'minimized' : ''}`} style={{ right: rightOffset }}>
      <div className="compose-header" onClick={() => hook.setIsMinimized(!hook.isMinimized)}>
        <div className="compose-header-title">{hook.subject || 'New Message'}</div>
        <div className="compose-header-actions" onClick={e => e.stopPropagation()}>
          <button className="compose-header-icon" onClick={() => hook.setIsMinimized(!hook.isMinimized)}>—</button>
          <button className="compose-header-icon" onClick={() => hook.setIsExpanded(!hook.isExpanded)}>⤢</button>
          <button className="compose-header-icon" onClick={handleCloseClick}>✕</button>
        </div>
      </div>

      <div className="compose-body-container">
        <div className={`compose-field-row ${emptyToError ? 'shake' : ''}`}>
          <div className="compose-field-label">To</div>
          <div className="compose-input-area" onClick={() => document.getElementById(`compose-to-${windowState.id}`).focus()}>
            {hook.to.map((r, i) => <RecipientChip key={i} value={r} onRemove={() => hook.setTo(hook.to.filter((_, idx) => idx !== i))} />)}
            <input id={`compose-to-${windowState.id}`} className="compose-input" value={toInput} onChange={e => setToInput(e.target.value)} onKeyDown={e => handleKeyDown(e, toInput, setToInput, hook.to, hook.setTo)} onBlur={() => addRecipient(toInput, setToInput, hook.to, hook.setTo)} />
          </div>
          <div className="compose-field-actions">
            {!hook.showCc && <button className="compose-field-action-btn" onClick={() => hook.setShowCc(true)}>Cc</button>}
            {!hook.showBcc && <button className="compose-field-action-btn" onClick={() => hook.setShowBcc(true)}>Bcc</button>}
          </div>
        </div>

        {hook.showCc && (
          <div className="compose-field-row">
            <div className="compose-field-label">Cc</div>
            <div className="compose-input-area" onClick={() => document.getElementById(`compose-cc-${windowState.id}`).focus()}>
              {hook.cc.map((r, i) => <RecipientChip key={i} value={r} onRemove={() => hook.setCc(hook.cc.filter((_, idx) => idx !== i))} />)}
              <input id={`compose-cc-${windowState.id}`} className="compose-input" value={ccInput} onChange={e => setCcInput(e.target.value)} onKeyDown={e => handleKeyDown(e, ccInput, setCcInput, hook.cc, hook.setCc)} onBlur={() => addRecipient(ccInput, setCcInput, hook.cc, hook.setCc)} />
            </div>
          </div>
        )}

        <div className="compose-field-row">
          <input className="compose-input" placeholder="Subject" value={hook.subject} onChange={e => hook.setSubject(e.target.value)} />
        </div>

        {/* Intent-Based Writing Section */}
        <div className="compose-ai-section">
          <div className="compose-ai-header">
            <span style={{ color: 'var(--purple)', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>✨ Intent-Based Writing</span>
          </div>
          <div className="compose-ai-input-wrapper">
             <input className="compose-ai-input" placeholder="What do you want to write?" value={intent} onChange={e => setIntent(e.target.value)} />
             <select className="compose-ai-select" value={tone} onChange={e => setTone(e.target.value)}>
                <option>Professional</option><option>Friendly</option><option>Urgent</option>
             </select>
             <button className="compose-ai-btn" onClick={handleGenerate} disabled={isGenerating}>Generate</button>
          </div>
        </div>

        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div ref={editorRef} className="compose-editor-area" contentEditable data-placeholder="Write your message here..." onInput={handleEditorInput} suppressContentEditableWarning />
          {selectionRect && (
            <div className="compose-floating-toolbar" style={{ top: selectionRect.top, left: selectionRect.left }}>
              <button className="compose-tool-btn" onClick={() => applyFormat('bold')}><b>B</b></button>
              <button className="compose-tool-btn" onClick={() => applyFormat('italic')}><i>I</i></button>
              <button className="compose-tool-btn" onClick={() => applyFormat('underline')}><u>U</u></button>
              <button className="compose-tool-btn" onClick={() => applyFormat('removeFormat')}>Tx</button>
            </div>
          )}
        </div>

        {hook.attachments.length > 0 && (
          <div className="compose-attachments-list">
            {hook.attachments.map((f, i) => (
              <div key={i} className="compose-attachment-row">
                <div className="compose-attachment-info">
                  <span className="compose-attachment-icon">{getFileIcon(f.type, f.name)}</span> 
                  <span className="compose-attachment-name">{f.name}</span>
                </div>
                <button className="compose-attachment-btn" onClick={() => hook.setAttachments(hook.attachments.filter((_, idx) => idx !== i))}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="compose-bottom-toolbar">
          <button className="compose-btn-primary" onClick={() => handleSend()}>Send</button>
          <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
             <button className="compose-tool-btn" onClick={() => fileRef.current?.click()}>📎</button>
             <button className="compose-tool-btn">🔗</button>
             <button className="compose-tool-btn">😊</button>
          </div>
          <button className="compose-tool-btn" style={{ marginLeft: 'auto' }} onClick={() => handleCloseAction('discard')}>🗑️</button>
        </div>
      </div>

      <input type="file" ref={fileRef} multiple style={{ display: 'none' }} onChange={(e) => hook.setAttachments([...hook.attachments, ...Array.from(e.target.files)])} />

      {showCloseDialog && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <p style={{ marginBottom: '16px' }}>Save draft?</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" onClick={() => handleCloseAction('save')}>Save</button>
              <button className="btn btn-secondary" onClick={() => handleCloseAction('discard')}>Discard</button>
              <button className="btn btn-secondary" onClick={() => handleCloseAction('cancel')}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
