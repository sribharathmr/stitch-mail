import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { emailAPI } from '../api'
import { format } from 'date-fns'
import './SearchPage.css'

const FILTER_TYPES = [
  { id: 'date', label: 'Date' },
  { id: 'sender', label: 'Sender' },
  { id: 'hasAttachment', label: 'Has Attachment' },
  { id: 'size', label: 'Size' },
]

function highlight(text = '', query = '') {
  if (!query) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i} className="search-highlight">{part}</mark> : part
  )
}

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const query = searchParams.get('q') || ''
  const [results, setResults] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [activeFilters, setActiveFilters] = useState({ hasAttachment: false })
  const [localQ, setLocalQ] = useState(query)

  useEffect(() => {
    if (query) {
      setLocalQ(query)
      doSearch(query)
    }
  }, [query])

  const doSearch = async (q, filters = activeFilters) => {
    setLoading(true)
    try {
      const params = { q }
      if (filters.hasAttachment) params.hasAttachment = 'true'
      if (filters.unread) params.unread = 'true'
      if (filters.sender) params.sender = filters.sender
      const res = await emailAPI.search(params)
      setResults(res.data.emails)
      setTotal(res.data.total)
    } catch (_) {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const toggleFilter = (id) => {
    const next = { ...activeFilters, [id]: !activeFilters[id] }
    setActiveFilters(next)
    if (query) doSearch(query, next)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (localQ.trim()) navigate(`/search?q=${encodeURIComponent(localQ)}`)
  }

  return (
    <div className="search-layout">
      {/* Search bar */}
      <div className="search-header">
        <form className="search-bar-large" onSubmit={handleSearch}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--accent)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            id="search-main-input"
            value={localQ}
            onChange={e => setLocalQ(e.target.value)}
            className="search-main-input"
            placeholder="Search emails..."
          />
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
        </form>

        {query && (
          <div className="search-meta">
            {loading ? 'Searching...' : `${total} result${total !== 1 ? 's' : ''} for "${query}"`}
          </div>
        )}

        {/* Filter chips */}
        <div className="filter-chips">
          {FILTER_TYPES.map(f => (
            <button
              key={f.id}
              id={`filter-${f.id}`}
              className={`filter-chip ${activeFilters[f.id] ? 'active' : ''}`}
              onClick={() => toggleFilter(f.id)}
            >
              {f.label}
              {activeFilters[f.id] && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              )}
            </button>
          ))}
          {Object.values(activeFilters).some(Boolean) && (
            <button
              id="filter-reset"
              className="filter-chip reset"
              onClick={() => { setActiveFilters({}); if (query) doSearch(query, {}) }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Active filters row */}
        {Object.values(activeFilters).some(Boolean) && (
          <div className="active-filters-row">
            {activeFilters.hasAttachment && (
              <span className="active-filter-tag">
                TYPE: DOCUMENTS
                <button onClick={() => toggleFilter('hasAttachment')}>×</button>
              </span>
            )}
            {activeFilters.unread && (
              <span className="active-filter-tag">
                STATUS: UNREAD
                <button onClick={() => toggleFilter('unread')}>×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="search-results">
        {loading && (
          <div className="empty-state"><div className="spinner" /><span>Searching...</span></div>
        )}

        {!loading && !results.length && query && (
          <div className="empty-state" style={{ marginTop: 40 }}>
            <div style={{ fontSize: 48 }}>🔍</div>
            <p style={{ fontWeight: 600, fontSize: 16 }}>No results found</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Try different keywords or remove filters.</p>
          </div>
        )}

        {!loading && !query && (
          <div className="search-suggestions">
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Recent Searches
            </h3>
            {['design review', 'invoice', 'urgent', 'figma'].map(s => (
              <button
                key={s}
                className="suggestion-item"
                onClick={() => { setLocalQ(s); navigate(`/search?q=${encodeURIComponent(s)}`) }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                {s}
              </button>
            ))}
          </div>
        )}

        {!loading && results.map(email => (
          <div
            key={email._id}
            id={`search-result-${email._id}`}
            className="search-result-item"
            onClick={() => navigate(`/mail/${email._id}`)}
          >
            <div className="result-row1">
              <div className="result-sender">{highlight(email.from.name || email.from.address, query)}</div>
              <div className="result-meta">
                {email.folder && <span className="badge badge-muted" style={{ fontSize: 10, textTransform: 'uppercase' }}>{email.folder}</span>}
                {email.attachments?.length > 0 && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}>
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                  </svg>
                )}
                <span className="result-date">{email.receivedAt ? format(new Date(email.receivedAt), 'MMM d') : ''}</span>
              </div>
            </div>
            <div className="result-subject">{highlight(email.subject, query)}</div>
            <div className="result-preview">{highlight((email.bodyText || '').slice(0, 120), query)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
