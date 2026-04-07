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
  if (mime.includes('pdf') || fname.endsWith('.pdf')) return '📄' // Could be custom SVG
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

  // Floating toolbar
  const [selectionRect, setSelectionRect] = useState(null)

  // Calculate right offset: 24, 548, 1072
  const rightOffset = hook.isExpanded ? 0 : 24 + (index * 524)
  
  const handleClose = async () => {
    if (hook.hasChanges()) {
      const resp = window.confirm('Save draft before closing?\n\nOK = Save as Draft\nCancel = Discard (delete)')
      if (resp) {
        await hook.saveDraftNow()
      }
    }
    dispatch({ type: 'CLOSE_COMPOSE', payload: windowState.id })
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
    // Commit any pending inputs
    let currentTo = [...hook.to]
    if (toInput.trim()) {
      currentTo.push({ name: toInput.trim(), address: toInput.trim() })
      hook.setTo(currentTo)
      setToInput('')
    }
    if (ccInput.trim()) {
      hook.setCc([...hook.cc, { name: ccInput.trim(), address: ccInput.trim() }])
      setCcInput('')
    }
    if (bccInput.trim()) {
      hook.setBcc([...hook.bcc, { name: bccInput.trim(), address: bccInput.trim() }])
      setBccInput('')
    }

    if (!currentTo.length) {
      setEmptyToError(true)
      setTimeout(() => setEmptyToError(false), 500)
      return
    }

    if (!hook.subject) {
      if (!window.confirm('Send this message without a subject or text in the body?')) {
        return
      }
    }

    try {
      await hook.sendEmail(scheduleDate)
      dispatch({ type: 'CLOSE_COMPOSE', payload: windowState.id })
      // Fire a generic custom event for a Toast
      const ev = new CustomEvent('toast', { detail: { type: 'success', message: 'Message sent' } })
      window.dispatchEvent(ev)
    } catch (e) {
      const ev = new CustomEvent('toast', { detail: { type: 'error', message: 'Failed to send. Try again.' } })
      window.dispatchEvent(ev)
    }
  }

  // Handle rich text formatting
  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value)
    editorRef.current.focus()
  }

  const handleSelection = () => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setSelectionRect(null)
      return
    }
    // Only show if selection is within our editor
    if (!editorRef.current.contains(sel.anchorNode)) {
      setSelectionRect(null)
      return
    }
    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    // Convert to relative coordinates inside the body container
    const editorRect = editorRef.current.getBoundingClientRect()
    setSelectionRect({
      top: rect.top - editorRect.top - 40, // 40px above selection
      left: rect.left - editorRect.left + (rect.width / 2) - 60 // Centered
    })
  }

  // Sync editor content manually
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
        <div className="compose-header-title">
          {hook.subject || 'New Message'}
        </div>
        <div className="compose-header-actions" onClick={e => e.stopPropagation()}>
          <button className="compose-header-icon" onClick={() => hook.setIsMinimized(!hook.isMinimized)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button className="compose-header-icon" onClick={() => hook.setIsExpanded(!hook.isExpanded)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          </button>
          <button className="compose-header-icon" onClick={handleClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <div className="compose-body-container">
        {/* Recipient Fields */}
        <div className={`compose-field-row ${emptyToError ? 'shake' : ''}`}>
          <div className="compose-field-label">To</div>
          <div className="compose-input-area" onClick={() => document.getElementById(`compose-to-${windowState.id}`).focus()}>
            {hook.to.map((r, i) => (
              <RecipientChip key={i} value={r} onRemove={() => hook.setTo(hook.to.filter((_, idx) => idx !== i))} />
            ))}
            <input 
              id={`compose-to-${windowState.id}`}
              className="compose-input" 
              value={toInput} 
              onChange={e => setToInput(e.target.value)}
              onKeyDown={e => handleKeyDown(e, toInput, setToInput, hook.to, hook.setTo)}
              onBlur={() => addRecipient(toInput, setToInput, hook.to, hook.setTo)}
            />
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
              {hook.cc.map((r, i) => (
                <RecipientChip key={i} value={r} onRemove={() => hook.setCc(hook.cc.filter((_, idx) => idx !== i))} />
              ))}
              <input 
                id={`compose-cc-${windowState.id}`}
                className="compose-input" 
                value={ccInput} 
                onChange={e => setCcInput(e.target.value)}
                onKeyDown={e => handleKeyDown(e, ccInput, setCcInput, hook.cc, hook.setCc)}
                onBlur={() => addRecipient(ccInput, setCcInput, hook.cc, hook.setCc)}
              />
            </div>
          </div>
        )}

        {hook.showBcc && (
          <div className="compose-field-row">
            <div className="compose-field-label">Bcc</div>
            <div className="compose-input-area" onClick={() => document.getElementById(`compose-bcc-${windowState.id}`).focus()}>
              {hook.bcc.map((r, i) => (
                <RecipientChip key={i} value={r} onRemove={() => hook.setBcc(hook.bcc.filter((_, idx) => idx !== i))} />
              ))}
              <input 
                id={`compose-bcc-${windowState.id}`}
                className="compose-input" 
                value={bccInput} 
                onChange={e => setBccInput(e.target.value)}
                onKeyDown={e => handleKeyDown(e, bccInput, setBccInput, hook.bcc, hook.setBcc)}
                onBlur={() => addRecipient(bccInput, setBccInput, hook.bcc, hook.setBcc)}
              />
            </div>
          </div>
        )}

        <div className="compose-field-row" style={{ minHeight: 32, paddingBottom: 0 }}>
          <input 
            className="compose-input" 
            placeholder="Subject" 
            value={hook.subject}
            style={{ padding: '4px 0', fontWeight: 500 }}
            onChange={e => hook.setSubject(e.target.value)}
          />
        </div>

        {/* Rich Text Editor */}
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div 
            ref={editorRef}
            className="compose-editor-area"
            contentEditable
            data-placeholder="Write your message here..."
            onInput={handleEditorInput}
            suppressContentEditableWarning
          >
          </div>

          {/* Inline Selection Toolbar */}
          {selectionRect && (
            <div className="compose-floating-toolbar" style={{ top: Math.max(10, selectionRect.top), left: Math.max(10, selectionRect.left) }}>
              <button className="compose-tool-btn" onClick={() => applyFormat('bold')}><b style={{fontFamily:'serif'}}>B</b></button>
              <button className="compose-tool-btn" onClick={() => applyFormat('italic')}><i style={{fontFamily:'serif'}}>I</i></button>
              <button className="compose-tool-btn" onClick={() => applyFormat('underline')}><u style={{fontFamily:'serif'}}>U</u></button>
              <button className="compose-tool-btn" onClick={() => applyFormat('removeFormat')} title="Remove Formatting">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="3" x2="21" y2="21"/></svg>
              </button>
            </div>
          )}
        </div>

        {/* Attachments Section */}
        {hook.attachments.length > 0 && (
          <div className="compose-attachments-list">
            {hook.attachments.map((f, i) => (
              <div key={i} className="compose-attachment-row">
                <div className="compose-attachment-icon">{getFileIcon(f.type, f.name)}</div>
                <div className="compose-attachment-info">
                  <div className="compose-attachment-name">{f.name}</div>
                  <div className="compose-attachment-size">({(f.size/1024/1024).toFixed(1)} MB)</div>
                </div>
                <button className="compose-attachment-remove" onClick={() => hook.setAttachments(hook.attachments.filter((_, idx) => idx !== i))}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Status bar */}
        {hook.draftSavedAt && (
          <div style={{ padding: '0 16px 8px', fontSize: 11, color: '#5f6368', textAlign: 'right' }}>
            Draft saved
          </div>
        )}

        {/* Bottom Toolbar */}
        <div className="compose-bottom-toolbar">
          <div style={{ display: 'flex', position: 'relative' }}>
            <button className="compose-btn-primary" onClick={() => handleSend(null)} disabled={hook.isSending} style={{ borderRadius: '18px 0 0 18px', paddingRight: 12 }}>
              {hook.isSending ? 'Sending...' : 'Send'}
            </button>
            <button className="compose-schedule-arrow compose-btn-primary" onClick={() => setShowScheduleMenu(!showScheduleMenu)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            
            {showScheduleMenu && (
              <div className="compose-dropdown-menu">
                <div className="compose-dropdown-item" onClick={() => { handleSend(null); setShowScheduleMenu(false) }}>Send now</div>
                <div className="compose-dropdown-item" onClick={() => {
                  const d = new Date()
                  d.setHours(8, 0, 0, 0)
                  d.setDate(d.getDate() + 1)
                  handleSend(d); 
                  setShowScheduleMenu(false) 
                }}>Schedule for Tomorrow Morning</div>
                <div className="compose-dropdown-item" onClick={() => {
                   const txt = window.prompt("Enter ISO Date to schedule (e.g., 2026-04-10T10:00:00Z)")
                   if (txt) handleSend(new Date(txt))
                   setShowScheduleMenu(false)
                }}>Custom date & time...</div>
              </div>
            )}
          </div>

          <div className="compose-toolbar-icons">
            <input type="file" ref={fileRef} multiple style={{ display: 'none' }} onChange={(e) => hook.setAttachments([...hook.attachments, ...Array.from(e.target.files)])} />
            <button className="compose-tool-btn" data-tooltip="Attach files" onClick={() => fileRef.current?.click()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <button className="compose-tool-btn" data-tooltip="Insert link" onClick={() => {
              const url = window.prompt("Enter URL:")
              if(url) applyFormat('createLink', url)
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            </button>
            <button className="compose-tool-btn" data-tooltip="Insert emoji" onClick={() => {
              const emo = window.prompt("Enter Emoji:")
              if(emo) applyFormat('insertText', emo)
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            </button>
            {/* Kept Smart Compose toggle button for future integration logic */}
            <button className="compose-tool-btn" data-tooltip="Smart Compose" style={{ marginLeft: 'auto', color: 'var(--accent)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            </button>
          </div>

          <button className="compose-tool-btn" onClick={handleClose} data-tooltip="Discard draft">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
