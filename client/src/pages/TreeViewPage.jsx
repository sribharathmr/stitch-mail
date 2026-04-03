import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { emailAPI } from '../api'
import { format, isToday, isYesterday } from 'date-fns'
import './TreeViewPage.css'

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatTime(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isToday(d)) return format(d, 'h:mm a')
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMM d')
}

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

const ORG_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B',
  '#EF4444', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#E11D48', '#7C3AED', '#0EA5E9', '#D946EF',
]

function orgColor(name = '') {
  let h = 0
  for (let c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return ORG_COLORS[Math.abs(h) % ORG_COLORS.length]
}

function contactColor(addr = '') {
  let h = 0
  for (let c of addr) h = c.charCodeAt(0) + ((h << 5) - h)
  return ORG_COLORS[Math.abs(h) % ORG_COLORS.length]
}

// ── Priority Badge ─────────────────────────────────────────────────────────────
function PriorityIndicator({ score, unread, starred }) {
  if (score <= 0) return null
  let level = 'low'
  if (score >= 15) level = 'high'
  else if (score >= 5) level = 'medium'

  return (
    <div className={`tree-priority tree-priority-${level}`} title={`Priority score: ${score}`}>
      {starred > 0 && <span className="tree-star-indicator">{'★'.repeat(Math.min(starred, 3))}</span>}
      {unread > 0 && <span className="tree-unread-badge">{unread}</span>}
    </div>
  )
}

// ── Email Leaf ─────────────────────────────────────────────────────────────────
function EmailLeaf({ email, onOpen, onDragStart }) {
  return (
    <div
      className={`tree-email-leaf ${!email.isRead ? 'unread' : ''}`}
      onClick={() => onOpen(email)}
      draggable
      onDragStart={(e) => onDragStart(e, email)}
    >
      <div className="tree-leaf-connector">
        <div className="tree-connector-line" />
        <div className="tree-connector-dot" />
      </div>
      <div className="tree-leaf-content">
        <div className="tree-leaf-row1">
          <span className="tree-leaf-subject">{email.subject || '(No Subject)'}</span>
          <span className="tree-leaf-time">{formatTime(email.receivedAt || email.createdAt)}</span>
        </div>
        <div className="tree-leaf-preview">{email.bodyText?.slice(0, 80) || ''}</div>
      </div>
      {email.isStarred && <span className="tree-leaf-star">★</span>}
      {email.attachments?.length > 0 && (
        <svg className="tree-leaf-attachment" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
        </svg>
      )}
    </div>
  )
}

// ── Contact Node ───────────────────────────────────────────────────────────────
function ContactNode({ contact, onOpenEmail, onDragStart, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="tree-contact-node">
      <div className="tree-contact-header" onClick={() => setExpanded(!expanded)}>
        <div className="tree-node-connector">
          <div className="tree-connector-line" />
        </div>
        <svg className={`tree-chevron ${expanded ? 'expanded' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M9 18l6-6-6-6"/>
        </svg>
        <div
          className="tree-contact-avatar"
          style={{ background: contactColor(contact.address) }}
        >
          {getInitials(contact.name)}
        </div>
        <div className="tree-contact-info">
          <span className="tree-contact-name">{contact.name || contact.address}</span>
          <span className="tree-contact-meta">
            {contact.emailCount} email{contact.emailCount !== 1 ? 's' : ''}
            {contact.unreadCount > 0 && (
              <span className="tree-contact-unread">{contact.unreadCount} unread</span>
            )}
          </span>
        </div>
      </div>
      <div className={`tree-contact-children ${expanded ? 'expanded' : ''}`}>
        {expanded && contact.emails.map(email => (
          <EmailLeaf
            key={email._id}
            email={email}
            onOpen={onOpenEmail}
            onDragStart={onDragStart}
          />
        ))}
      </div>
    </div>
  )
}

// ── Organization Node ──────────────────────────────────────────────────────────
function OrgNode({ org, onOpenEmail, onDragStart, onDrop, isDragOver, onDragOver, onDragLeave, searchQuery }) {
  const [expanded, setExpanded] = useState(org.unreadCount > 0 || org.priorityScore >= 10)
  const color = orgColor(org.orgName)

  return (
    <div
      className={`tree-org-node ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => onDragOver(e, org.domain)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, org.domain)}
    >
      <div className="tree-org-header" onClick={() => setExpanded(!expanded)}>
        <svg className={`tree-chevron ${expanded ? 'expanded' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M9 18l6-6-6-6"/>
        </svg>
        <div className="tree-org-avatar" style={{ background: color }}>
          <span className="tree-org-icon">🏢</span>
        </div>
        <div className="tree-org-info">
          <div className="tree-org-name-row">
            <span className="tree-org-name">{org.orgName}</span>
            <span className="tree-org-domain">{org.domain}</span>
          </div>
          <div className="tree-org-stats">
            <span>{org.totalEmails} email{org.totalEmails !== 1 ? 's' : ''}</span>
            <span className="tree-stat-dot">·</span>
            <span>{org.contactCount} contact{org.contactCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <PriorityIndicator score={org.priorityScore} unread={org.unreadCount} starred={org.starredCount} />
      </div>
      {isDragOver && (
        <div className="tree-drop-indicator">
          <span>📥 Drop to move to {org.orgName}</span>
        </div>
      )}
      <div className={`tree-org-children ${expanded ? 'expanded' : ''}`}>
        {expanded && org.contacts.map(contact => (
          <ContactNode
            key={contact.address}
            contact={contact}
            onOpenEmail={onOpenEmail}
            onDragStart={onDragStart}
            defaultExpanded={searchQuery ? true : contact.unreadCount > 0}
          />
        ))}
      </div>
      <div className="tree-org-accent-bar" style={{ background: `linear-gradient(180deg, ${color}40, transparent)` }} />
    </div>
  )
}

// ── Tree Stats Panel ───────────────────────────────────────────────────────────
function TreeStats({ stats, tree }) {
  const topOrgs = [...tree].sort((a, b) => b.totalEmails - a.totalEmails).slice(0, 5)

  return (
    <div className="tree-stats-panel">
      {/* Overview Card */}
      <div className="card tree-stats-card">
        <div className="tree-stats-header">
          <span>📊</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Tree Overview</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Email Distribution</div>
          </div>
        </div>
        <div className="tree-stats-grid">
          <div className="tree-stat-item">
            <span className="tree-stat-num">{stats.totalOrgs}</span>
            <span className="tree-stat-label">Organizations</span>
          </div>
          <div className="tree-stat-item">
            <span className="tree-stat-num">{stats.totalEmails}</span>
            <span className="tree-stat-label">Emails</span>
          </div>
          <div className="tree-stat-item">
            <span className="tree-stat-num">{stats.totalUnread}</span>
            <span className="tree-stat-label">Unread</span>
          </div>
        </div>
      </div>

      {/* Top Organizations */}
      <div className="card tree-top-orgs-card">
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          Top Senders
        </div>
        <div className="tree-top-orgs-list">
          {topOrgs.map((org, i) => (
            <div key={org.domain} className="tree-top-org-item">
              <div className="tree-top-org-rank">{i + 1}</div>
              <div className="tree-top-org-avatar-sm" style={{ background: orgColor(org.orgName) }}>
                {getInitials(org.orgName)}
              </div>
              <div className="tree-top-org-info">
                <span className="tree-top-org-name">{org.orgName}</span>
                <span className="tree-top-org-count">{org.totalEmails} emails</span>
              </div>
              <div className="tree-top-org-bar">
                <div
                  className="tree-top-org-bar-fill"
                  style={{
                    width: `${Math.min(100, (org.totalEmails / (topOrgs[0]?.totalEmails || 1)) * 100)}%`,
                    background: orgColor(org.orgName),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="card tree-tips-card">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 18 }}>💡</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tips</span>
        </div>
        <div className="tree-tips-list">
          <div className="tree-tip-item">
            <span className="tree-tip-icon">🖱️</span>
            <span>Click org/contact to expand</span>
          </div>
          <div className="tree-tip-item">
            <span className="tree-tip-icon">🔍</span>
            <span>Search by name, email, or subject</span>
          </div>
          <div className="tree-tip-item">
            <span className="tree-tip-icon">✋</span>
            <span>Drag emails between organizations</span>
          </div>
          <div className="tree-tip-item">
            <span className="tree-tip-icon">⌨️</span>
            <span>Press / to focus search</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main TreeView Page ─────────────────────────────────────────────────────────
export default function TreeViewPage() {
  const navigate = useNavigate()
  const [tree, setTree] = useState([])
  const [stats, setStats] = useState({ totalOrgs: 0, totalEmails: 0, totalUnread: 0 })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [dragOverDomain, setDragOverDomain] = useState(null)
  const [draggedEmail, setDraggedEmail] = useState(null)
  const [toast, setToast] = useState(null)
  const [expandAll, setExpandAll] = useState(false)
  const searchRef = useRef(null)
  const pollTimerRef = useRef(null)

  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'Escape') {
        searchRef.current?.blur()
        setSearchInput('')
        setSearchQuery('')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Fetch tree data
  const fetchTree = useCallback(async (search = '') => {
    try {
      const res = await emailAPI.tree({ search, folder: 'inbox' })
      setTree(res.data.tree)
      setStats({
        totalOrgs: res.data.totalOrgs,
        totalEmails: res.data.totalEmails,
        totalUnread: res.data.totalUnread,
      })
    } catch (err) {
      console.error('Failed to fetch tree:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load + polling
  useEffect(() => {
    fetchTree()
    pollTimerRef.current = setInterval(() => fetchTree(searchQuery), 30000)
    return () => clearInterval(pollTimerRef.current)
  }, [fetchTree, searchQuery])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
      if (searchInput !== searchQuery) {
        setLoading(true)
        fetchTree(searchInput)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Drag handlers
  const handleDragStart = (e, email) => {
    setDraggedEmail(email)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', email._id)
    // Create ghost element
    const ghost = document.createElement('div')
    ghost.className = 'tree-drag-ghost'
    ghost.textContent = email.subject || '(No Subject)'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }

  const handleDragOver = (e, domain) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDomain(domain)
  }

  const handleDragLeave = () => {
    setDragOverDomain(null)
  }

  const handleDrop = async (e, targetDomain) => {
    e.preventDefault()
    setDragOverDomain(null)

    if (!draggedEmail) return

    const emailId = draggedEmail._id
    const orgName = tree.find(o => o.domain === targetDomain)?.orgName || targetDomain

    try {
      await emailAPI.treeOverride(emailId, targetDomain)
      setToast({ message: `Moved to ${orgName}`, emailId, previousDomain: null })
      // Refresh tree
      fetchTree(searchQuery)
      // Auto-dismiss toast after 5s
      setTimeout(() => setToast(null), 5000)
    } catch (err) {
      console.error('Failed to override tree:', err)
      setToast({ message: 'Failed to move email', error: true })
      setTimeout(() => setToast(null), 3000)
    }

    setDraggedEmail(null)
  }

  const handleUndoDrop = async () => {
    if (!toast?.emailId) return
    try {
      await emailAPI.treeOverride(toast.emailId, '')
      fetchTree(searchQuery)
      setToast(null)
    } catch (err) {
      console.error('Failed to undo:', err)
    }
  }

  const handleOpenEmail = (email) => {
    navigate(`/mail/${email._id}`)
  }

  const handleExpandAll = () => {
    setExpandAll(!expandAll)
  }

  if (loading && tree.length === 0) {
    return (
      <div className="tree-loading">
        <div className="tree-loading-animation">
          <div className="tree-loading-branch" />
          <div className="tree-loading-branch delay-1" />
          <div className="tree-loading-branch delay-2" />
        </div>
        <span>Building your structured inbox...</span>
      </div>
    )
  }

  return (
    <div className="tree-page-layout">
      {/* Main tree column */}
      <div className="tree-main-col">
        {/* Header */}
        <div className="tree-header">
          <div className="tree-header-left">
            <div className="tree-header-icon">🌳</div>
            <div>
              <h1 className="tree-header-title">Structured Inbox</h1>
              <p className="tree-header-subtitle">
                {stats.totalOrgs} organizations · {stats.totalEmails} emails
              </p>
            </div>
          </div>
          <div className="tree-header-actions">
            <div className="tree-search-wrapper">
              <svg className="tree-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                ref={searchRef}
                id="tree-search-input"
                className="tree-search-input"
                type="text"
                placeholder="Search organizations, contacts, emails..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button className="tree-search-clear" onClick={() => { setSearchInput(''); setSearchQuery('') }}>
                  ✕
                </button>
              )}
              <kbd className="tree-search-kbd">/</kbd>
            </div>
            <button
              className="btn btn-ghost tree-expand-btn"
              onClick={handleExpandAll}
              title={expandAll ? 'Collapse All' : 'Expand All'}
            >
              {expandAll ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 15l-6-6-6 6"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              )}
            </button>
            <button
              className="btn btn-ghost tree-refresh-btn"
              onClick={() => { setLoading(true); fetchTree(searchQuery) }}
              title="Refresh"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M1 4v6h6M23 20v-6h-6"/>
                <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Empty state */}
        {!loading && tree.length === 0 && (
          <div className="tree-empty">
            <div className="tree-empty-icon">🌲</div>
            <h3>No emails to organize</h3>
            <p>{searchQuery ? `No results for "${searchQuery}"` : 'Your inbox is empty. Emails will be organized here automatically.'}</p>
          </div>
        )}

        {/* Tree container */}
        <div className="tree-container">
          {tree.map((org, index) => (
            <OrgNode
              key={org.domain}
              org={{...org, contacts: org.contacts.map(c => ({...c, emails: expandAll ? c.emails : c.emails}))}}
              onOpenEmail={handleOpenEmail}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              isDragOver={dragOverDomain === org.domain}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="tree-right-col">
        <TreeStats stats={stats} tree={tree} />
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`tree-toast ${toast.error ? 'error' : ''}`}>
          <span>{toast.message}</span>
          {!toast.error && toast.emailId && (
            <button className="tree-toast-undo" onClick={handleUndoDrop}>Undo</button>
          )}
          <button className="tree-toast-close" onClick={() => setToast(null)}>✕</button>
        </div>
      )}
    </div>
  )
}
