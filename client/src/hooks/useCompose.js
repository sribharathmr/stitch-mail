import { useState, useEffect, useRef, useCallback } from 'react'
import { emailAPI } from '../api'

export function useCompose(initialState, windowId) {
  const [to, setTo] = useState(initialState?.to || [])
  const [cc, setCc] = useState(initialState?.cc || [])
  const [bcc, setBcc] = useState(initialState?.bcc || [])
  const [subject, setSubject] = useState(initialState?.subject || '')
  const [bodyHtml, setBodyHtml] = useState(initialState?.bodyHtml || '')
  const [bodyText, setBodyText] = useState(initialState?.bodyText || '')
  const [attachments, setAttachments] = useState(initialState?.attachments || [])
  
  const [isMinimized, setIsMinimized] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showCc, setShowCc] = useState((initialState?.cc && initialState.cc.length > 0) || false)
  const [showBcc, setShowBcc] = useState((initialState?.bcc && initialState.bcc.length > 0) || false)
  
  const [isSending, setIsSending] = useState(false)
  const [scheduledAt, setScheduledAt] = useState(null)
  const [draftSavedAt, setDraftSavedAt] = useState(null)

  const lastSavedState = useRef({ to, cc, bcc, subject, bodyHtml, attachments })

  // Validate state changed
  const hasChanges = useCallback(() => {
    const ls = lastSavedState.current
    if (subject !== ls.subject || bodyHtml !== ls.bodyHtml || attachments.length !== ls.attachments.length) return true
    if (to.length !== ls.to.length || cc.length !== ls.cc.length || bcc.length !== ls.bcc.length) return true
    return false
  }, [subject, bodyHtml, attachments, to, cc, bcc])

  // Debounced auto-save draft
  useEffect(() => {
    const isNotEmpty = subject || bodyText || to.length > 0
    if (!isNotEmpty || !hasChanges()) return

    const timer = setTimeout(async () => {
      try {
        const fd = new FormData()
        fd.append('to', JSON.stringify(to))
        fd.append('cc', JSON.stringify(cc))
        fd.append('bcc', JSON.stringify(bcc))
        fd.append('subject', subject)
        fd.append('bodyHtml', bodyHtml)
        fd.append('bodyText', bodyText)
        attachments.forEach(f => fd.append('attachments', f))
        
        await emailAPI.draft(fd)
        
        lastSavedState.current = { to, cc, bcc, subject, bodyHtml, attachments }
        setDraftSavedAt(new Date())
      } catch (e) {
        console.error('Draft auto-save failed:', e)
      }
    }, 30000) // 30 seconds

    return () => clearTimeout(timer)
  }, [to, cc, bcc, subject, bodyHtml, bodyText, attachments, hasChanges])

  const sendEmail = async (scheduleDate = null) => {
    if (!to.length) throw new Error('Please add at least one recipient')
    
    setIsSending(true)
    try {
      const fd = new FormData()
      fd.append('to', JSON.stringify(to))
      fd.append('cc', JSON.stringify(cc))
      fd.append('bcc', JSON.stringify(bcc))
      fd.append('subject', subject || '(No Subject)')
      fd.append('bodyHtml', bodyHtml)
      fd.append('bodyText', bodyText)
      attachments.forEach(f => fd.append('attachments', f))
      
      if (scheduleDate) {
        // Technically backend takes ID and scheduledAt, but for a new compose we might just send it all
        // to a new endpoint or attach scheduledAt to formData. Let's attach scheduledAt to the draft API or send API.
        fd.append('scheduledAt', scheduleDate.toISOString())
      }
      
      await emailAPI.send(fd)
      return true
    } finally {
      setIsSending(false)
    }
  }

  const saveDraftNow = async () => {
    if (!subject && !bodyText && !to.length) return true
    try {
      const fd = new FormData()
      fd.append('to', JSON.stringify(to))
      fd.append('cc', JSON.stringify(cc))
      fd.append('bcc', JSON.stringify(bcc))
      fd.append('subject', subject)
      fd.append('bodyHtml', bodyHtml)
      fd.append('bodyText', bodyText)
      attachments.forEach(f => fd.append('attachments', f))
      await emailAPI.draft(fd)
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }

  return {
    to, setTo,
    cc, setCc,
    bcc, setBcc,
    subject, setSubject,
    bodyHtml, setBodyHtml,
    bodyText, setBodyText,
    attachments, setAttachments,
    isMinimized, setIsMinimized,
    isExpanded, setIsExpanded,
    showCc, setShowCc,
    showBcc, setShowBcc,
    isSending,
    scheduledAt, setScheduledAt,
    draftSavedAt,
    sendEmail,
    saveDraftNow,
    hasChanges
  }
}
