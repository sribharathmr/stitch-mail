import { useState, useRef, useEffect, useCallback } from 'react'
import { useEmail } from '../context/EmailContext'
import { useCompose } from '../hooks/useCompose'
import './ComposeWindow.css'

// ── Emoji data ────────────────────────────────────────────────────────────────
const EMOJI_CATEGORIES = [
  { id: 'recent', icon: '🕐', label: 'Recently used' },
  { id: 'smileys', icon: '😀', label: 'Smileys & Emotions' },
  { id: 'people', icon: '🧑', label: 'People & Body' },
  { id: 'animals', icon: '🐶', label: 'Animals & Nature' },
  { id: 'food', icon: '🍔', label: 'Food & Drink' },
  { id: 'travel', icon: '✈️', label: 'Travel & Places' },
  { id: 'objects', icon: '💡', label: 'Objects' },
  { id: 'symbols', icon: '❤️', label: 'Symbols' },
  { id: 'flags', icon: '🚩', label: 'Flags' },
]

const EMOJI_DATA = {
  smileys: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😋','😛','😜','🤪','😝','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬','😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','🫤','😟','🙁','😮','😯','😲','😳','🥺','🥹','😦','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  people: ['👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏'],
  animals: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🐙','🦀','🦞','🦐','🦑','🐠','🐟','🐡','🐬','🦈','🐋','🐳','🐊','🦓','🦍','🦧','🐘','🦛','🦏'],
  food: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥝','🍅','🥑','🥦','🥬','🌶️','🫑','🥒','🥕','🧄','🧅','🥔','🍠','🥐','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🫔','🥙','🧆','🥘','🍝','🍜','🦪','🍣','🍱','🥟','🍤','🍙','🍡','🎂','🍰','🧁','🍫','🍬','🍭'],
  travel: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🏍️','🛵','🚲','✈️','🚀','🛸','🚁','🛶','⛵','🚤','🗺️','🗿','🗽','🏰','🏯','🏟️','🎡','🎢','🎪','🌍','🌎','🌏','🏔️','⛰️','🌋','🏝️','🏖️'],
  objects: ['⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','💾','💿','📷','📹','📼','🔍','💡','🔦','🏮','📔','📕','📖','📗','📘','📙','📓','📃','📜','📰','📑','🔖','💰','🪙','💎','⚖️','🔧','🔨','⚒️','🛠️','🔩','⚙️','🔑','🗝️','🔒','🔓','✉️','📧','📨','📩','📤','📥','📦','📫','📬'],
  symbols: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','💕','💞','💓','💗','💖','💘','💝','✅','❌','⭐','🌟','💫','❗','❓','‼️','⁉️','💯','🔥','✨','🎵','🎶','🔔','🔕','📣','📢','🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈'],
  flags: ['🇺🇸','🇬🇧','🇨🇦','🇦🇺','🇫🇷','🇩🇪','🇮🇹','🇪🇸','🇯🇵','🇰🇷','🇨🇳','🇮🇳','🇧🇷','🇲🇽','🇷🇺','🇿🇦','🇳🇬','🇪🇬','🇸🇦','🇦🇪','🇹🇷','🇮🇩','🇹🇭','🇻🇳','🇵🇭','🇲🇾','🇸🇬','🇳🇿','🇸🇪','🇳🇴','🇩🇰','🇫🇮','🇮🇸','🇳🇱','🇧🇪','🇨🇭','🇦🇹','🇵🇱','🇨🇿','🇬🇷','🇵🇹','🇮🇪'],
}

const CONFIDENTIAL_EXPIRY_OPTIONS = [
  { value: '1_day', label: '1 day', days: 1 },
  { value: '1_week', label: '1 week', days: 7 },
  { value: '1_month', label: '1 month', days: 30 },
  { value: '3_months', label: '3 months', days: 90 },
  { value: '5_years', label: '5 years', days: 1825 },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Main Component ────────────────────────────────────────────────────────────
export default function ComposeWindow({ windowState, index }) {
  const { dispatch } = useEmail()
  const fileRef = useRef(null)
  const imageRef = useRef(null)
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

  // Popover / modal states
  const [showFormatBar, setShowFormatBar] = useState(false)
  const [showLinkPopover, setShowLinkPopover] = useState(false)
  const [linkText, setLinkText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiSearch, setEmojiSearch] = useState('')
  const [emojiCategory, setEmojiCategory] = useState('smileys')
  const [recentEmojis, setRecentEmojis] = useState([])
  const [showConfidentialModal, setShowConfidentialModal] = useState(false)
  const [confidentialExpiry, setConfidentialExpiry] = useState('1_week')
  const [confidentialPasscode, setConfidentialPasscode] = useState('none')
  const [isConfidentialEnabled, setIsConfidentialEnabled] = useState(false)
  const [showSignatureMenu, setShowSignatureMenu] = useState(false)
  const [activeSignature, setActiveSignature] = useState('none')
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [isPlainText, setIsPlainText] = useState(false)
  const [showScheduleDatePicker, setShowScheduleDatePicker] = useState(false)
  const [scheduleCalMonth, setScheduleCalMonth] = useState(new Date().getMonth())
  const [scheduleCalYear, setScheduleCalYear] = useState(new Date().getFullYear())
  const [scheduleSelectedDate, setScheduleSelectedDate] = useState(null)
  const [scheduleTime, setScheduleTime] = useState('08:00')

  // Close all popovers helper
  const closeAllPopovers = useCallback((except) => {
    if (except !== 'format') setShowFormatBar(false)
    if (except !== 'link') setShowLinkPopover(false)
    if (except !== 'emoji') setShowEmojiPicker(false)
    if (except !== 'signature') setShowSignatureMenu(false)
    if (except !== 'more') setShowMoreMenu(false)
    if (except !== 'schedule') setShowScheduleMenu(false)
  }, [])

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

  // ── Link popover ──
  const handleInsertLink = () => {
    if (!linkUrl.trim()) return
    const text = linkText.trim() || linkUrl.trim()
    if (editorRef.current) {
      editorRef.current.focus()
      const sel = window.getSelection()
      if (sel.rangeCount) {
        const range = sel.getRangeAt(0)
        range.collapse(false)
        const a = document.createElement('a')
        a.href = linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`
        a.textContent = text
        a.target = '_blank'
        a.style.color = 'var(--accent)'
        range.insertNode(a)
        range.setStartAfter(a)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
      }
      hook.setBodyHtml(editorRef.current.innerHTML)
      hook.setBodyText(editorRef.current.innerText)
    }
    setLinkText('')
    setLinkUrl('')
    setShowLinkPopover(false)
  }

  // ── Emoji ──
  const handleInsertEmoji = (emoji) => {
    if (editorRef.current) {
      editorRef.current.focus()
      document.execCommand('insertText', false, emoji)
      hook.setBodyHtml(editorRef.current.innerHTML)
      hook.setBodyText(editorRef.current.innerText)
    }
    setRecentEmojis(prev => {
      const updated = [emoji, ...prev.filter(e => e !== emoji)].slice(0, 20)
      return updated
    })
  }

  const filteredEmojis = emojiSearch.trim()
    ? Object.values(EMOJI_DATA).flat().filter(e => e.includes(emojiSearch))
    : (emojiCategory === 'recent' ? recentEmojis : EMOJI_DATA[emojiCategory] || [])

  // ── Confidential mode ──
  const handleConfidentialSave = () => {
    setIsConfidentialEnabled(true)
    setShowConfidentialModal(false)
    window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Confidential mode enabled' } }))
  }

  const handleConfidentialCancel = () => {
    setShowConfidentialModal(false)
  }

  // ── Signature ──
  const handleInsertSignature = (type) => {
    setActiveSignature(type)
    if (type === 'default' && editorRef.current) {
      editorRef.current.focus()
      const sigHtml = `<br><div style="margin-top:16px;padding-top:12px;border-top:1px solid #ccc;font-size:13px;color:#666;">
        <b>${windowState.from?.name || 'User'}</b><br>
        ${windowState.from?.address || ''}<br>
        <i>Sent from Stitch Mail</i>
      </div>`
      document.execCommand('insertHTML', false, sigHtml)
      hook.setBodyHtml(editorRef.current.innerHTML)
    }
    setShowSignatureMenu(false)
  }

  // ── More options handlers ──
  const handleTogglePlainText = () => {
    setIsPlainText(!isPlainText)
    if (!isPlainText && editorRef.current) {
      // Converting to plain text
      const plainText = editorRef.current.innerText
      editorRef.current.innerText = plainText
      hook.setBodyHtml(`<pre style="white-space:pre-wrap;font-family:inherit">${plainText}</pre>`)
      hook.setBodyText(plainText)
    }
    setShowMoreMenu(false)
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`<html><head><title>Print Email</title></head><body>
      <h2>${hook.subject || '(No Subject)'}</h2>
      <p><strong>To:</strong> ${hook.to.map(r => r.address || r).join(', ')}</p>
      <hr>
      ${editorRef.current?.innerHTML || hook.bodyHtml || ''}
    </body></html>`)
    printWindow.document.close()
    printWindow.print()
    setShowMoreMenu(false)
  }

  const handleSpellCheck = () => {
    if (editorRef.current) {
      editorRef.current.spellcheck = !editorRef.current.spellcheck
      editorRef.current.focus()
    }
    setShowMoreMenu(false)
  }

  const handleImageInsert = (e) => {
    const files = Array.from(e.target.files)
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          if (editorRef.current) {
            editorRef.current.focus()
            document.execCommand('insertHTML', false, `<img src="${ev.target.result}" style="max-width:100%;border-radius:8px;margin:8px 0;" />`)
            hook.setBodyHtml(editorRef.current.innerHTML)
          }
        }
        reader.readAsDataURL(file)
      }
    })
    e.target.value = ''
  }

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelection)
    return () => document.removeEventListener('selectionchange', handleSelection)
  }, [])

  // Close popovers on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('.compose-popover') && !e.target.closest('.compose-tool-btn') && !e.target.closest('.compose-modal-overlay')) {
        closeAllPopovers()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [closeAllPopovers])

  // Calculate expiry date for confidential mode
  const expiryOption = CONFIDENTIAL_EXPIRY_OPTIONS.find(o => o.value === confidentialExpiry)
  const expiryDate = new Date(Date.now() + (expiryOption?.days || 7) * 86400000)
  const expiryStr = expiryDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

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

        {/* Intent-Based AI Writing */}
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

        {/* Formatting bar — toggled by Aa button */}
        {showFormatBar && (
          <div className="compose-format-bar compose-popover">
            <button className="compose-fmt-btn" onClick={() => applyFormat('bold')} title="Bold"><b>B</b></button>
            <button className="compose-fmt-btn" onClick={() => applyFormat('italic')} title="Italic"><i>I</i></button>
            <button className="compose-fmt-btn" onClick={() => applyFormat('underline')} title="Underline"><u>U</u></button>
            <button className="compose-fmt-btn" onClick={() => applyFormat('strikeThrough')} title="Strikethrough"><s>S</s></button>
            <div className="compose-fmt-divider" />
            <select className="compose-fmt-select" onChange={e => { applyFormat('fontSize', e.target.value); e.target.value = '' }}>
              <option value="">Size</option>
              <option value="1">Small</option>
              <option value="3">Normal</option>
              <option value="5">Large</option>
              <option value="7">Huge</option>
            </select>
            <div className="compose-fmt-divider" />
            <button className="compose-fmt-btn" onClick={() => applyFormat('insertUnorderedList')} title="Bullet list">• ≡</button>
            <button className="compose-fmt-btn" onClick={() => applyFormat('insertOrderedList')} title="Numbered list">1. ≡</button>
            <button className="compose-fmt-btn" onClick={() => applyFormat('indent')} title="Indent more">→</button>
            <button className="compose-fmt-btn" onClick={() => applyFormat('outdent')} title="Indent less">←</button>
            <div className="compose-fmt-divider" />
            <button className="compose-fmt-btn" onClick={() => applyFormat('justifyLeft')} title="Align left">≡←</button>
            <button className="compose-fmt-btn" onClick={() => applyFormat('justifyCenter')} title="Align center">≡≡</button>
            <button className="compose-fmt-btn" onClick={() => applyFormat('justifyRight')} title="Align right">≡→</button>
            <div className="compose-fmt-divider" />
            <button className="compose-fmt-btn" onClick={() => applyFormat('removeFormat')} title="Remove formatting">Tx</button>
          </div>
        )}

        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div ref={editorRef} className="compose-editor-area" contentEditable data-placeholder={isPlainText ? 'Composing in plain text mode...' : 'Write your message here...'} onInput={handleEditorInput} suppressContentEditableWarning />
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

        {/* Confidential Mode Indicator */}
        {isConfidentialEnabled && (
          <div className="compose-confidential-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            <span>Confidential mode is on · Expires {expiryStr}</span>
            <button onClick={() => { setIsConfidentialEnabled(false) }}>Turn off</button>
          </div>
        )}

        {/* ═══════ BOTTOM TOOLBAR ═══════ */}
        <div className="compose-bottom-toolbar">
          <div className="compose-send-group">
            <button className="compose-btn-primary" onClick={() => handleSend()}>Send</button>
            <button className="compose-btn-primary-dropdown" onClick={() => { closeAllPopovers('schedule'); setShowScheduleMenu(!showScheduleMenu) }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {showScheduleMenu && (() => {
              // Calculate preset schedule dates
              const now = new Date()
              const tomorrow = new Date(now)
              tomorrow.setDate(tomorrow.getDate() + 1)
              const tomorrowMorning = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 8, 0)
              const tomorrowAfternoon = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 13, 0)
              // Next Monday
              const daysUntilMonday = ((1 - now.getDay()) + 7) % 7 || 7
              const nextMonday = new Date(now)
              nextMonday.setDate(now.getDate() + daysUntilMonday)
              const mondayMorning = new Date(nextMonday.getFullYear(), nextMonday.getMonth(), nextMonday.getDate(), 8, 0)

              const formatPresetDate = (d) => d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
              const tz = Intl.DateTimeFormat().resolvedOptions().timeZone?.replace(/_/g, ' ') || 'Local Time'

              return (
                <div className="compose-schedule-menu compose-popover">
                  <div className="schedule-header">
                    <span className="schedule-title">Schedule send</span>
                    <span className="schedule-tz">{tz}</span>
                  </div>
                  <button onClick={() => { handleSend(tomorrowMorning.toISOString()); setShowScheduleMenu(false) }}>
                    <span className="schedule-label">Tomorrow morning</span>
                    <span className="schedule-date">{formatPresetDate(tomorrowMorning)}</span>
                  </button>
                  <button onClick={() => { handleSend(tomorrowAfternoon.toISOString()); setShowScheduleMenu(false) }}>
                    <span className="schedule-label">Tomorrow afternoon</span>
                    <span className="schedule-date">{formatPresetDate(tomorrowAfternoon)}</span>
                  </button>
                  <button onClick={() => { handleSend(mondayMorning.toISOString()); setShowScheduleMenu(false) }}>
                    <span className="schedule-label">Monday morning</span>
                    <span className="schedule-date">{formatPresetDate(mondayMorning)}</span>
                  </button>
                  <div className="schedule-divider" />
                  <button onClick={() => { setShowScheduleMenu(false); setShowScheduleDatePicker(true); setScheduleCalMonth(now.getMonth()); setScheduleCalYear(now.getFullYear()); setScheduleSelectedDate(now); setScheduleTime(now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0')) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8, flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span className="schedule-label">Select date and time</span>
                  </button>
                </div>
              )
            })()}
          </div>
          
          <div className="compose-toolbar-actions" style={{ marginLeft: 12 }}>
            {/* Aa — Formatting */}
            <button className={`compose-tool-btn ${showFormatBar ? 'active' : ''}`} style={{ fontWeight: 700, fontFamily: 'serif', fontSize: 13 }} title="Formatting options" onClick={() => { closeAllPopovers('format'); setShowFormatBar(!showFormatBar) }}>Aa</button>
            
            {/* Help me write (AI wand) */}
            <button className="compose-tool-btn" title="Help me write" onClick={() => { if (editorRef.current) editorRef.current.scrollIntoView(); setIntent('') }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            </button>
            
            {/* Attach files */}
            <button className="compose-tool-btn" onClick={() => fileRef.current?.click()} title="Attach files">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
            </button>

            {/* Insert Link — popover */}
            <div style={{ position: 'relative' }}>
              <button className={`compose-tool-btn ${showLinkPopover ? 'active' : ''}`} onClick={() => { closeAllPopovers('link'); setShowLinkPopover(!showLinkPopover) }} title="Insert link">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
              </button>
              {showLinkPopover && (
                <div className="compose-link-popover compose-popover">
                  <div className="compose-link-row">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M4 6h16M4 12h16M4 18h7"/></svg>
                    <input className="compose-link-input" placeholder="Text" value={linkText} onChange={e => setLinkText(e.target.value)} autoFocus />
                  </div>
                  <div className="compose-link-row">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
                    <input className="compose-link-input" placeholder="Type or paste a link" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleInsertLink()} />
                    <button className="compose-link-apply" onClick={handleInsertLink} disabled={!linkUrl.trim()}>Apply</button>
                  </div>
                </div>
              )}
            </div>

            {/* Emoji picker */}
            <div style={{ position: 'relative' }}>
              <button className={`compose-tool-btn ${showEmojiPicker ? 'active' : ''}`} onClick={() => { closeAllPopovers('emoji'); setShowEmojiPicker(!showEmojiPicker) }} title="Insert emoji">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
              </button>
              {showEmojiPicker && (
                <div className="compose-emoji-picker compose-popover">
                  <div className="compose-emoji-search">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input placeholder="Search" value={emojiSearch} onChange={e => setEmojiSearch(e.target.value)} autoFocus />
                  </div>
                  <div className="compose-emoji-categories">
                    {EMOJI_CATEGORIES.map(cat => (
                      <button key={cat.id} className={`compose-emoji-cat-btn ${emojiCategory === cat.id ? 'active' : ''}`} onClick={() => { setEmojiCategory(cat.id); setEmojiSearch('') }} title={cat.label}>
                        {cat.icon}
                      </button>
                    ))}
                  </div>
                  <div className="compose-emoji-label">
                    {emojiSearch ? 'SEARCH RESULTS' : EMOJI_CATEGORIES.find(c => c.id === emojiCategory)?.label?.toUpperCase()}
                  </div>
                  <div className="compose-emoji-grid">
                    {filteredEmojis.length === 0 && (
                      <div className="compose-emoji-empty">
                        {emojiCategory === 'recent' ? "You haven't used any emoji yet." : 'No emojis found.'}
                      </div>
                    )}
                    {filteredEmojis.map((emoji, i) => (
                      <button key={`${emoji}-${i}`} className="compose-emoji-btn" onClick={() => handleInsertEmoji(emoji)}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drive insert */}
            <button className="compose-tool-btn" onClick={() => fileRef.current?.click()} title="Insert files using Drive">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><polygon points="12 2 2 20 22 20"/></svg>
            </button>

            {/* Insert photo — inline in editor */}
            <button className="compose-tool-btn" onClick={() => imageRef.current?.click()} title="Insert photo">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </button>

            {/* Confidential mode */}
            <button className={`compose-tool-btn ${isConfidentialEnabled ? 'active' : ''}`} onClick={() => { closeAllPopovers(); setShowConfidentialModal(true) }} title="Toggle confidential mode">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><circle cx="12" cy="16" r="2"/></svg>
            </button>

            {/* Signature */}
            <div style={{ position: 'relative' }}>
              <button className={`compose-tool-btn ${showSignatureMenu ? 'active' : ''}`} onClick={() => { closeAllPopovers('signature'); setShowSignatureMenu(!showSignatureMenu) }} title="Insert signature">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
              {showSignatureMenu && (
                <div className="compose-signature-menu compose-popover">
                  <button className="compose-sig-manage" onClick={() => { setShowSignatureMenu(false); window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'info', message: 'Manage signatures from Settings → General' } })) }}>
                    Manage signatures
                  </button>
                  <div className="compose-sig-divider" />
                  <button className={`compose-sig-option ${activeSignature === 'none' ? 'active' : ''}`} onClick={() => handleInsertSignature('none')}>
                    {activeSignature === 'none' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    No signature
                  </button>
                  <button className={`compose-sig-option ${activeSignature === 'default' ? 'active' : ''}`} onClick={() => handleInsertSignature('default')}>
                    {activeSignature === 'default' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    Default signature
                  </button>
                </div>
              )}
            </div>

            {/* More options */}
            <div style={{ position: 'relative' }}>
              <button className={`compose-tool-btn ${showMoreMenu ? 'active' : ''}`} title="More options" onClick={() => { closeAllPopovers('more'); setShowMoreMenu(!showMoreMenu) }}>
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              </button>
              {showMoreMenu && (
                <div className="compose-more-menu compose-popover">
                  <button onClick={() => { hook.setIsExpanded(!hook.isExpanded); setShowMoreMenu(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                    Default to full screen
                  </button>
                  <button onClick={handleTogglePlainText}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
                    {isPlainText ? 'Rich text mode' : 'Plain text mode'}
                  </button>
                  <button onClick={handlePrint}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    Print
                  </button>
                  <button onClick={handleSpellCheck}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    Spell check
                  </button>
                  <div className="compose-more-divider" />
                  <button onClick={() => { setShowMoreMenu(false); window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'info', message: 'Label feature coming soon' } })) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                    Label
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 'auto' }}><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                  <button onClick={() => { setShowMoreMenu(false); setShowScheduleMenu(true) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Help me schedule
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <button className="compose-tool-btn" style={{ marginLeft: 'auto' }} onClick={() => handleCloseAction('discard')} title="Discard draft">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>

      <input type="file" ref={fileRef} multiple style={{ display: 'none' }} onChange={(e) => hook.setAttachments([...hook.attachments, ...Array.from(e.target.files)])} />
      <input type="file" ref={imageRef} multiple accept="image/*" style={{ display: 'none' }} onChange={handleImageInsert} />

      {/* ═══════ CONFIDENTIAL MODE MODAL ═══════ */}
      {showConfidentialModal && (
        <div className="compose-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleConfidentialCancel() }}>
          <div className="compose-confidential-modal">
            <h2>Confidential mode</h2>
            <p className="compose-conf-desc">Recipients won't have the option to forward, copy, print or download this email.</p>

            <div className="compose-conf-section-label">SET EXPIRY</div>
            <div className="compose-conf-expiry-row">
              <select className="compose-conf-select" value={confidentialExpiry} onChange={e => setConfidentialExpiry(e.target.value)}>
                {CONFIDENTIAL_EXPIRY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>Expires in {o.label}</option>
                ))}
              </select>
              <span className="compose-conf-expiry-date">{expiryStr}</span>
            </div>

            <div className="compose-conf-section-label">REQUIRE PASSCODE</div>
            <p className="compose-conf-passcode-note">All passcodes will be generated by Google. <span className="compose-conf-help" title="Learn more">ⓘ</span></p>
            <div className="compose-conf-radio-group">
              <label className="compose-conf-radio">
                <input type="radio" name="passcode" value="none" checked={confidentialPasscode === 'none'} onChange={() => setConfidentialPasscode('none')} />
                <span className="compose-conf-radio-custom" />
                No SMS passcode
              </label>
              <label className="compose-conf-radio">
                <input type="radio" name="passcode" value="sms" checked={confidentialPasscode === 'sms'} onChange={() => setConfidentialPasscode('sms')} />
                <span className="compose-conf-radio-custom" />
                SMS passcode
              </label>
            </div>

            <div className="compose-conf-actions">
              <button className="compose-conf-cancel" onClick={handleConfidentialCancel}>Cancel</button>
              <button className="compose-conf-save" onClick={handleConfidentialSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ SCHEDULE DATE PICKER MODAL ═══════ */}
      {showScheduleDatePicker && (() => {
        const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
        const DAY_LABELS = ['M','T','W','T','F','S','S']
        const today = new Date()
        today.setHours(0,0,0,0)

        // Build calendar grid
        const firstDay = new Date(scheduleCalYear, scheduleCalMonth, 1)
        const lastDay = new Date(scheduleCalYear, scheduleCalMonth + 1, 0)
        // Monday = 0
        let startDow = (firstDay.getDay() + 6) % 7
        const prevMonthLast = new Date(scheduleCalYear, scheduleCalMonth, 0).getDate()

        const calDays = []
        // Previous month trailing days
        for (let i = startDow - 1; i >= 0; i--) {
          calDays.push({ day: prevMonthLast - i, current: false, date: new Date(scheduleCalYear, scheduleCalMonth - 1, prevMonthLast - i) })
        }
        // Current month
        for (let d = 1; d <= lastDay.getDate(); d++) {
          calDays.push({ day: d, current: true, date: new Date(scheduleCalYear, scheduleCalMonth, d) })
        }
        // Next month leading days
        const remaining = 42 - calDays.length
        for (let d = 1; d <= remaining; d++) {
          calDays.push({ day: d, current: false, date: new Date(scheduleCalYear, scheduleCalMonth + 1, d) })
        }

        const isToday = (d) => d.getTime() === today.getTime()
        const isSelected = (d) => scheduleSelectedDate && d.getFullYear() === scheduleSelectedDate.getFullYear() && d.getMonth() === scheduleSelectedDate.getMonth() && d.getDate() === scheduleSelectedDate.getDate()
        const isPast = (d) => d < today

        const handlePrevMonth = () => {
          if (scheduleCalMonth === 0) { setScheduleCalMonth(11); setScheduleCalYear(scheduleCalYear - 1) }
          else setScheduleCalMonth(scheduleCalMonth - 1)
        }
        const handleNextMonth = () => {
          if (scheduleCalMonth === 11) { setScheduleCalMonth(0); setScheduleCalYear(scheduleCalYear + 1) }
          else setScheduleCalMonth(scheduleCalMonth + 1)
        }

        const selectedDateStr = scheduleSelectedDate
          ? scheduleSelectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
          : ''

        const handleScheduleConfirm = () => {
          if (!scheduleSelectedDate) return
          const [h, m] = scheduleTime.split(':').map(Number)
          const scheduleDt = new Date(scheduleSelectedDate.getFullYear(), scheduleSelectedDate.getMonth(), scheduleSelectedDate.getDate(), h, m)
          handleSend(scheduleDt.toISOString())
          setShowScheduleDatePicker(false)
        }

        return (
          <div className="compose-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowScheduleDatePicker(false) }}>
            <div className="compose-schedule-picker-modal">
              <h2>Select date and time</h2>

              <div className="schedule-picker-body">
                {/* Calendar */}
                <div className="schedule-cal">
                  <div className="schedule-cal-nav">
                    <span className="schedule-cal-month">{MONTH_NAMES[scheduleCalMonth]} {scheduleCalYear}</span>
                    <div className="schedule-cal-arrows">
                      <button onClick={handlePrevMonth}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                      </button>
                      <button onClick={handleNextMonth}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                    </div>
                  </div>
                  <div className="schedule-cal-grid">
                    {DAY_LABELS.map((d, i) => (
                      <div key={`label-${i}`} className="schedule-cal-day-label">{d}</div>
                    ))}
                    {calDays.map((item, i) => (
                      <button
                        key={i}
                        className={`schedule-cal-day ${!item.current ? 'other-month' : ''} ${isToday(item.date) ? 'today' : ''} ${isSelected(item.date) ? 'selected' : ''} ${isPast(item.date) ? 'past' : ''}`}
                        disabled={isPast(item.date)}
                        onClick={() => setScheduleSelectedDate(item.date)}
                      >
                        {item.day}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date and time inputs */}
                <div className="schedule-picker-inputs">
                  <div className="schedule-picker-input-group">
                    <input type="text" className="schedule-picker-input" value={selectedDateStr} readOnly />
                  </div>
                  <div className="schedule-picker-input-group">
                    <input type="time" className="schedule-picker-input" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="schedule-picker-actions">
                <button className="compose-conf-cancel" onClick={() => setShowScheduleDatePicker(false)}>Cancel</button>
                <button className="compose-conf-save" onClick={handleScheduleConfirm} disabled={!scheduleSelectedDate}>Schedule send</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ═══════ CLOSE DIALOG ═══════ */}
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
