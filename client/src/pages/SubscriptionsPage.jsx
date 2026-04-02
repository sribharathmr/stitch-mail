import { useState, useEffect } from 'react'
import { aiAPI } from '../api'

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [unsubbing, setUnsubbing] = useState({})

  useEffect(() => {
    aiAPI.subscriptions()
      .then(res => setSubs(res.data.subscriptions || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const handleUnsubscribe = async (address) => {
    setUnsubbing(p => ({ ...p, [address]: true }))
    try {
      await aiAPI.unsubscribe(address)
      setSubs(p => p.filter(s => s.address !== address))
    } catch (e) {
      alert('Failed to unsubscribe')
      setUnsubbing(p => ({ ...p, [address]: false }))
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ padding: '8px', background: 'var(--accent)', color: '#fff', borderRadius: '8px', display: 'flex' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </span>
          AI Smart Unsubscribe
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          We scanned your recent emails to identify newsletters and marketing lists. Click unsubscribe to move them to trash.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px', borderColor: 'var(--accent)', borderRightColor: 'transparent' }} />
          Analyzing recent emails with Ollama AI...
        </div>
      ) : subs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-hover)', borderRadius: '12px' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>✨</div>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Inbox is Clean</h3>
          <p style={{ color: 'var(--text-muted)' }}>No recurring newsletters or subscriptions detected.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {subs.map(s => (
            <div key={s.address} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-hover)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>{s.name || s.address.split('@')[0]}</div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{s.address}</div>
                <div style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '8px', fontWeight: 600 }}>
                  Received {s.count} times recently
                </div>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => handleUnsubscribe(s.address)}
                disabled={unsubbing[s.address]}
                style={{ padding: '8px 16px', gap: '8px' }}
              >
                {unsubbing[s.address] ? 'Unsubscribing...' : 'Unsubscribe'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
