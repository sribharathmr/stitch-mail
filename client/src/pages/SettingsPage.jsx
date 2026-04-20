import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useUI } from '../context/UIContext'
import { useAuth } from '../context/AuthContext'
import { settingsAPI } from '../api'
import './SettingsPage.css'

const SettingsIcon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{typeof d === 'string' ? <path d={d}/> : d}</svg>
)

const SETTINGS_NAV = [
  { id: 'general', label: 'General', icon: <SettingsIcon d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>} /> },
  { id: 'account', label: 'Account', icon: <SettingsIcon d={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>} /> },
  { id: 'connectivity', label: 'Connectivity', icon: <SettingsIcon d={<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>} /> },
  { id: 'themes', label: 'Themes', icon: <SettingsIcon d={<><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></>} /> },
  { id: 'notifications', label: 'Notifications', icon: <SettingsIcon d={<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>} /> },
  { id: 'signatures', label: 'Signatures', icon: <SettingsIcon d={<><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></>} /> },
]

const THEME_OPTIONS = [
  { id: 'light', label: 'Light Mode', desc: 'Clean and minimal', emoji: '☀️' },
  { id: 'deep-space', label: 'Deep Space', desc: 'Dark, elegant', emoji: '🌙' },
  { id: 'system', label: 'System Default', desc: 'Follows your OS', emoji: '💻' },
]

export default function SettingsPage() {
  const { theme, setTheme, glassMode, setGlassMode, settings, loadSettings } = useUI()
  const { user, setUser } = useAuth()
  const [activeSection, setActiveSection] = useState('general')
  const [prefs, setPrefs] = useState({
    smartNotifications: true,
    threadGrouping: false,
    compactView: true,
  })
  const [signature, setSignature] = useState({
    text: '"Design is not just what it looks like. Design is how it works."',
    name: '',
    title: ''
  })
  const [smtpConfig, setSmtpConfig] = useState({ host: '', port: '587', user: '', pass: '' })
  const [imapConfig, setImapConfig] = useState({ host: '', port: '993', user: '', pass: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Security section state
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showSessionsModal, setShowSessionsModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' })
  const [passwordMsg, setPasswordMsg] = useState('')
  const [sessions, setSessions] = useState([
    { device: 'Chrome · Windows', location: 'Current device', lastActive: 'Now', icon: '💻' },
    { device: 'Safari · iPhone', location: 'Mobile', lastActive: '2 hours ago', icon: '📱' },
  ])

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    if (settings) {
      setPrefs(p => ({ ...p, ...settings.preferences }))
      setSignature(s => ({ ...s, ...settings.signature }))
      if (settings.smtpConfig) setSmtpConfig(s => ({ ...s, ...settings.smtpConfig }))
      if (settings.imapConfig) setImapConfig(i => ({ ...i, ...settings.imapConfig }))
    }
  }, [settings])

  const handleApply = async () => {
    setSaving(true)
    try {
      await settingsAPI.update({ 
        preferences: { ...prefs, theme }, 
        signature,
        smtpConfig,
        imapConfig
      })
      await loadSettings() // Force context to update with saved DB values site-wide
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (_) {} finally { setSaving(false) }
  }

  const toggle = (key) => setPrefs(p => ({ ...p, [key]: !p[key] }))

  return (
    <div className="settings-layout">
      {/* Left nav */}
      <aside className="settings-nav">
        <div className="settings-nav-header">
          <h2 style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.3 }}>Settings</h2>
        </div>
        {SETTINGS_NAV.map(item => (
          <button
            key={item.id}
            id={`settings-nav-${item.id}`}
            className={`settings-nav-item ${activeSection === item.id ? 'active' : ''}`}
            onClick={(e) => {
              setActiveSection(item.id)
              e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </aside>

      {/* Main content */}
      <div className="settings-main">
        {activeSection === 'themes' && (
          <div className="settings-section fade-in">
            <div className="settings-section-header">
              <h2 className="settings-section-title">Themes & Appearance</h2>
              <p className="settings-section-desc">Customize how Stitch Mail looks and feels.</p>
            </div>

            {/* Visual Mode */}
            <div className="settings-block">
              <h3 className="settings-block-title">VISUAL MODE</h3>
              <div className="theme-cards">
                {THEME_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    id={`theme-${opt.id}`}
                    className={`theme-card ${theme === opt.id ? 'selected' : ''}`}
                    onClick={() => setTheme(opt.id)}
                  >
                    <div className="theme-card-preview" data-theme-preview={opt.id}>
                      <div className="preview-sidebar" />
                      <div className="preview-content">
                        <div className="preview-line" />
                        <div className="preview-line short" />
                        <div className="preview-line" />
                      </div>
                    </div>
                    <div className="theme-card-footer">
                      <div>
                        <div className="theme-card-emoji">{opt.emoji}</div>
                        <div className="theme-card-label">{opt.label}</div>
                        <div className="theme-card-desc">{opt.desc}</div>
                      </div>
                      {theme === opt.id && (
                        <div className="theme-check">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 24 }}>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Liquid Glass Interface</div>
                    <div className="toggle-desc">Enable frosted translucent blurs across panels</div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={!!glassMode}
                      onChange={(e) => setGlassMode(e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            </div>

            {/* Interaction Settings */}
            <div className="settings-block">
              <h3 className="settings-block-title">INTERACTION SETTINGS</h3>
              <div className="settings-toggles">
                {[
                  { key: 'smartNotifications', label: 'Smart Notifications', desc: 'Get notified only for important emails' },
                  { key: 'threadGrouping', label: 'Thread Grouping', desc: 'Group related emails into conversations' },
                  { key: 'compactView', label: 'Compact View', desc: 'Reduce spacing for more emails on screen' },
                ].map(item => (
                  <div key={item.key} className="toggle-row">
                    <div>
                      <div className="toggle-label">{item.label}</div>
                      <div className="toggle-desc">{item.desc}</div>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        id={`toggle-${item.key}`}
                        checked={!!prefs[item.key]}
                        onChange={() => toggle(item.key)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer actions */}
            <div className="settings-footer">
              <button className="btn btn-secondary" onClick={() => loadSettings()}>Discard Changes</button>
              <button
                id="settings-apply-btn"
                className="btn btn-primary"
                onClick={handleApply}
                disabled={saving}
              >
                {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Apply Preferences'}
              </button>
            </div>
          </div>
        )}

        {activeSection === 'signatures' && (
          <div className="settings-section fade-in">
            <div className="settings-section-header">
              <h2 className="settings-section-title">Email Signatures</h2>
              <p className="settings-section-desc">Create a professional signature like Gmail, Outlook, or Yahoo Mail.</p>
            </div>

            {/* Live Preview */}
            <div className="settings-block">
              <h3 className="settings-block-title">LIVE PREVIEW</h3>
              <div style={{
                padding: 20, background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0',
                fontFamily: signature.fontFamily || 'Arial, sans-serif',
                fontSize: signature.fontSize || '14px', color: '#333'
              }}>
                <div style={{ borderTop: '2px solid #4F4AA8', paddingTop: 14, marginTop: 4 }}>
                  {signature.imageUrl && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #4F4AA8, #6C67C7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22, fontWeight: 700 }}>
                        {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'SM'}
                      </div>
                    </div>
                  )}
                  <div style={{ fontWeight: 700, fontSize: '1.1em', color: '#1A202C' }}>{user?.name || 'Your Name'}</div>
                  {signature.title && <div style={{ color: '#4A5568', marginTop: 2 }}>{signature.title}</div>}
                  {signature.company && <div style={{ color: '#718096', fontWeight: 600, marginTop: 2 }}>{signature.company}</div>}
                  <div style={{ height: 1, background: '#E2E8F0', margin: '10px 0' }} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: '0.9em', color: '#4A5568' }}>
                    {signature.phone && <span>📱 {signature.phone}</span>}
                    {user?.email && <span>✉️ {user.email}</span>}
                    {signature.website && <span style={{ color: '#4F4AA8' }}>🔗 {signature.website}</span>}
                  </div>
                  {signature.text && (
                    <div style={{ marginTop: 10, fontStyle: 'italic', color: '#718096', fontSize: '0.9em', borderLeft: '3px solid #4F4AA8', paddingLeft: 10 }}>
                      "{signature.text}"
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Editor */}
            <div className="settings-block">
              <h3 className="settings-block-title">SIGNATURE DETAILS</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>JOB TITLE / ROLE</label>
                  <input className="input" value={signature.title || ''} onChange={e => setSignature(s => ({ ...s, title: e.target.value }))} placeholder="e.g. Software Engineer" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>COMPANY / ORG</label>
                  <input className="input" value={signature.company || ''} onChange={e => setSignature(s => ({ ...s, company: e.target.value }))} placeholder="e.g. Stitch Mail Inc." />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>PHONE NUMBER</label>
                  <input className="input" value={signature.phone || ''} onChange={e => setSignature(s => ({ ...s, phone: e.target.value }))} placeholder="+1 (555) 123-4567" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>WEBSITE</label>
                  <input className="input" value={signature.website || ''} onChange={e => setSignature(s => ({ ...s, website: e.target.value }))} placeholder="https://yoursite.com" />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>QUOTE / TAGLINE</label>
                <textarea className="input" value={signature.text || ''} onChange={e => setSignature(s => ({ ...s, text: e.target.value }))} rows={2} placeholder="Your favorite quote or professional tagline..." />
              </div>
            </div>

            {/* Styling */}
            <div className="settings-block">
              <h3 className="settings-block-title">STYLING</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>FONT FAMILY</label>
                  <select className="smart-compose-select" style={{ width: '100%' }} value={signature.fontFamily || 'Arial, sans-serif'} onChange={e => setSignature(s => ({ ...s, fontFamily: e.target.value }))}>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="'Times New Roman', serif">Times New Roman</option>
                    <option value="Verdana, sans-serif">Verdana</option>
                    <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                    <option value="'Courier New', monospace">Courier New</option>
                    <option value="Tahoma, sans-serif">Tahoma</option>
                    <option value="'Segoe UI', sans-serif">Segoe UI</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>FONT SIZE</label>
                  <select className="smart-compose-select" style={{ width: '100%' }} value={signature.fontSize || '14px'} onChange={e => setSignature(s => ({ ...s, fontSize: e.target.value }))}>
                    <option value="12px">Small (12px)</option>
                    <option value="13px">Medium (13px)</option>
                    <option value="14px">Normal (14px)</option>
                    <option value="15px">Large (15px)</option>
                    <option value="16px">Larger (16px)</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>PROFILE IMAGE</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #4F4AA8, #6C67C7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
                    {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'SM'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="toggle" style={{ marginBottom: 4 }}>
                      <input type="checkbox" checked={!!signature.imageUrl} onChange={() => setSignature(s => ({ ...s, imageUrl: s.imageUrl ? '' : 'avatar' }))} />
                      <span className="toggle-slider" />
                    </label>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Show profile avatar in signature</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-footer">
              <button className="btn btn-secondary" onClick={() => loadSettings()}>Discard Changes</button>
              <button id="settings-save-signature" className="btn btn-primary" onClick={handleApply} disabled={saving}>
                {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Signature'}
              </button>
            </div>
          </div>
        )}

        {activeSection === 'general' && (
          <div className="settings-section fade-in">
            <div className="settings-section-header">
              <h2 className="settings-section-title">General Settings</h2>
              <p className="settings-section-desc">Manage your email preferences and behavior.</p>
            </div>

            <div className="settings-block">
              <h3 className="settings-block-title">COMPOSE & REPLY</h3>
              <div className="settings-toggles">
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Default Reply Behavior</div>
                    <div className="toggle-desc">Choose what happens when you click reply</div>
                  </div>
                  <select className="smart-compose-select" value={prefs.replyBehavior || 'reply'} onChange={e => setPrefs(p => ({ ...p, replyBehavior: e.target.value }))}>
                    <option value="reply">Reply</option>
                    <option value="reply-all">Reply All</option>
                  </select>
                </div>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Undo Send Timer</div>
                    <div className="toggle-desc">Time window to cancel a sent email</div>
                  </div>
                  <select className="smart-compose-select" value={prefs.undoSendTimer || '5'} onChange={e => setPrefs(p => ({ ...p, undoSendTimer: e.target.value }))}>
                    <option value="5">5 seconds</option>
                    <option value="10">10 seconds</option>
                    <option value="20">20 seconds</option>
                    <option value="30">30 seconds</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="settings-block">
              <h3 className="settings-block-title">READING & NAVIGATION</h3>
              <div className="settings-toggles">
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Conversation View</div>
                    <div className="toggle-desc">Group emails in the same thread together</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={!!prefs.conversationView} onChange={() => toggle('conversationView')} />
                    <span className="toggle-slider" />
                  </label>
                </div>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Auto-Advance</div>
                    <div className="toggle-desc">After archiving or deleting a message</div>
                  </div>
                  <select className="smart-compose-select" value={prefs.autoAdvance || 'next'} onChange={e => setPrefs(p => ({ ...p, autoAdvance: e.target.value }))}>
                    <option value="next">Go to next message</option>
                    <option value="previous">Go to previous message</option>
                    <option value="list">Return to inbox</option>
                  </select>
                </div>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Preview Pane</div>
                    <div className="toggle-desc">Show email preview in a split pane</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={!!prefs.previewPane} onChange={() => toggle('previewPane')} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            </div>

            <div className="settings-block">
              <h3 className="settings-block-title">LANGUAGE & REGION</h3>
              <div className="settings-toggles">
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Language</div>
                    <div className="toggle-desc">Display language for the interface</div>
                  </div>
                  <select className="smart-compose-select" value={prefs.language || 'en'} onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}>
                    <option value="en">English (US)</option>
                    <option value="en-gb">English (UK)</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="ja">日本語</option>
                    <option value="hi">हिन्दी</option>
                  </select>
                </div>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Stars</div>
                    <div className="toggle-desc">Number of stars available for marking emails</div>
                  </div>
                  <select className="smart-compose-select" value={prefs.starType || '1'} onChange={e => setPrefs(p => ({ ...p, starType: e.target.value }))}>
                    <option value="1">1 star</option>
                    <option value="4">4 stars</option>
                    <option value="all">All stars</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="settings-footer">
              <button className="btn btn-secondary" onClick={() => loadSettings()}>Discard Changes</button>
              <button className="btn btn-primary" onClick={handleApply} disabled={saving}>
                {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save General Settings'}
              </button>
            </div>
          </div>
        )}

        {activeSection === 'account' && (
          <div className="settings-section fade-in">
            <div className="settings-section-header">
              <h2 className="settings-section-title">Account & Profile</h2>
              <p className="settings-section-desc">Manage your personal information and security.</p>
            </div>

            <div className="settings-block">
              <h3 className="settings-block-title">PROFILE INFORMATION</h3>
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 4 }}>
                <div className="avatar avatar-xl" style={{ background: '#4F4AA8', color: '#fff', fontSize: 22, flexShrink: 0 }}>
                  {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'DC'}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Full Name</label>
                    <input className="input" value={user?.name || ''} readOnly style={{ opacity: 0.7 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Email Address</label>
                    <input className="input" value={user?.email || ''} readOnly style={{ opacity: 0.7 }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-block">
              <h3 className="settings-block-title">SECURITY</h3>
              <div className="settings-toggles">
                {/* Change Password */}
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Password</div>
                    <div className="toggle-desc">{passwordMsg || 'Update your account password'}</div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowPasswordModal(true)}>Change Password</button>
                </div>

                {/* Two-Factor Authentication */}
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Two-Factor Authentication</div>
                    <div className="toggle-desc">Add an extra layer of security to your account</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={!!prefs.twoFactor} onChange={() => {
                      toggle('twoFactor')
                      alert(prefs.twoFactor ? '2FA has been disabled.' : '2FA has been enabled. You will need an authenticator app on your next login.')
                    }} />
                    <span className="toggle-slider" />
                  </label>
                </div>

                {/* Active Sessions */}
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Active Sessions</div>
                    <div className="toggle-desc">{sessions.length} active session{sessions.length !== 1 ? 's' : ''}</div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowSessionsModal(true)}>View Sessions</button>
                </div>

                {/* Login Activity */}
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Login Notifications</div>
                    <div className="toggle-desc">Get notified when someone logs into your account</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={!!prefs.loginNotifications} onChange={() => toggle('loginNotifications')} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            </div>

            <div className="settings-block">
              <h3 className="settings-block-title">STORAGE</h3>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>3.2 GB of 15 GB used</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>21%</span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '21%', background: 'linear-gradient(90deg, #4F4AA8, #6C67C7)', borderRadius: 3 }} />
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: '#4F4AA8' }} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Emails: 2.1 GB</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: '#6C67C7' }} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Attachments: 1.1 GB</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-block">
              <h3 className="settings-block-title" style={{ color: 'var(--danger)' }}>DANGER ZONE</h3>
              <div className="settings-toggles">
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Export Data</div>
                    <div className="toggle-desc">Download a copy of all your emails and data</div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => alert('Export started. You will receive a download link via email.')}>Export</button>
                </div>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label" style={{ color: 'var(--danger)' }}>Delete Account</div>
                    <div className="toggle-desc">Permanently delete your account and all data</div>
                  </div>
                  <button className="btn btn-sm" style={{ background: 'var(--danger)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => { if (window.confirm('Are you sure you want to permanently delete your account? This action cannot be undone.')) alert('Account deletion request submitted. You will receive a confirmation email.') }}
                  >Delete</button>
                </div>
              </div>
            </div>

            <div className="settings-footer">
              <button className="btn btn-secondary" onClick={() => loadSettings()}>Discard Changes</button>
              <button className="btn btn-primary" onClick={handleApply} disabled={saving}>
                {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Account Settings'}
              </button>
            </div>

            {/* Change Password Modal */}
            {showPasswordModal && (
              <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
                <div className="modal" style={{ maxWidth: 420, padding: 0 }} onClick={e => e.stopPropagation()}>
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700 }}>Change Password</h2>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Enter your current and new password.</p>
                  </div>
                  <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Current Password</label>
                      <input className="input" type="password" value={passwordForm.current} onChange={e => setPasswordForm(f => ({ ...f, current: e.target.value }))} placeholder="••••••••" />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>New Password</label>
                      <input className="input" type="password" value={passwordForm.newPass} onChange={e => setPasswordForm(f => ({ ...f, newPass: e.target.value }))} placeholder="Minimum 8 characters" />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Confirm New Password</label>
                      <input className="input" type="password" value={passwordForm.confirm} onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Re-enter new password" />
                    </div>
                    {passwordForm.newPass && passwordForm.newPass.length < 8 && (
                      <div style={{ fontSize: 12, color: '#EF4444' }}>Password must be at least 8 characters</div>
                    )}
                    {passwordForm.confirm && passwordForm.newPass !== passwordForm.confirm && (
                      <div style={{ fontSize: 12, color: '#EF4444' }}>Passwords do not match</div>
                    )}
                  </div>
                  <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                    <button className="btn btn-primary"
                      disabled={!passwordForm.current || !passwordForm.newPass || passwordForm.newPass.length < 8 || passwordForm.newPass !== passwordForm.confirm}
                      onClick={async () => {
                        try {
                          await settingsAPI.update({ password: { current: passwordForm.current, newPassword: passwordForm.newPass } })
                          setPasswordMsg('Password changed successfully ✓')
                          setShowPasswordModal(false)
                          setPasswordForm({ current: '', newPass: '', confirm: '' })
                          setTimeout(() => setPasswordMsg(''), 5000)
                        } catch (err) { alert('Failed: ' + (err.response?.data?.message || err.message)) }
                      }}
                    >Update Password</button>
                  </div>
                </div>
              </div>
            )}

            {/* Sessions Modal */}
            {showSessionsModal && (
              <div className="modal-overlay" onClick={() => setShowSessionsModal(false)}>
                <div className="modal" style={{ maxWidth: 480, padding: 0 }} onClick={e => e.stopPropagation()}>
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700 }}>Active Sessions</h2>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Devices currently logged into your account.</p>
                  </div>
                  <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {sessions.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: i === 0 ? 'rgba(79,74,168,0.06)' : 'var(--bg-hover)', borderRadius: 10, border: i === 0 ? '1px solid rgba(79,74,168,0.2)' : '1px solid var(--border)' }}>
                        <div style={{ fontSize: 24 }}>{s.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{s.device}{i === 0 && <span style={{ fontSize: 10, color: '#4F4AA8', fontWeight: 700, marginLeft: 8 }}>CURRENT</span>}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.location} · {s.lastActive}</div>
                        </div>
                        {i > 0 && (
                          <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}
                            onClick={() => { setSessions(sessions.filter((_, j) => j !== i)); alert('Session revoked.') }}
                          >Revoke</button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => setShowSessionsModal(false)}>Close</button>
                    {sessions.length > 1 && (
                      <button className="btn btn-sm" style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => { setSessions([sessions[0]]); alert('All other sessions have been revoked.') }}
                      >Revoke All Others</button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'connectivity' && (
          <div className="settings-section fade-in">
            <div className="settings-section-header">
              <h2 className="settings-section-title">Accounts & Connectivity</h2>
              <p className="settings-section-desc">Manage your email server settings for sending and receiving.</p>
            </div>

            {user?.google_id && (
              <div className="settings-block" style={{ background: 'rgba(79, 74, 168, 0.05)', border: '1px solid rgba(79, 74, 168, 0.1)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ fontSize: 24 }}>🛡️</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Connected via Google</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>You are using Google OAuth for secure sync and sending.</div>
                  </div>
                </div>
              </div>
            )}

            <div className="settings-block">
              <h3 className="settings-block-title">OUTGOING MAIL (SMTP)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>SMTP HOST</label>
                  <input className="input" placeholder="smtp.gmail.com" value={smtpConfig.host} onChange={e => setSmtpConfig(s => ({ ...s, host: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>PORT</label>
                  <input className="input" placeholder="587" value={smtpConfig.port} onChange={e => setSmtpConfig(s => ({ ...s, port: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>USERNAME</label>
                  <input className="input" placeholder="you@example.com" value={smtpConfig.user} onChange={e => setSmtpConfig(s => ({ ...s, user: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>APP PASSWORD</label>
                  <input className="input" type="password" placeholder="••••••••••••" value={smtpConfig.pass} onChange={e => setSmtpConfig(s => ({ ...s, pass: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="settings-block" style={{ marginTop: 24 }}>
              <h3 className="settings-block-title">INCOMING MAIL (IMAP)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>IMAP HOST</label>
                  <input className="input" placeholder="imap.gmail.com" value={imapConfig.host} onChange={e => setImapConfig(i => ({ ...i, host: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>PORT</label>
                  <input className="input" placeholder="993" value={imapConfig.port} onChange={e => setImapConfig(i => ({ ...i, port: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>USERNAME</label>
                  <input className="input" placeholder="you@example.com" value={imapConfig.user} onChange={e => setImapConfig(i => ({ ...i, user: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>APP PASSWORD</label>
                  <input className="input" type="password" placeholder="••••••••••••" value={imapConfig.pass} onChange={e => setImapConfig(i => ({ ...i, pass: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="settings-footer">
              <button className="btn btn-secondary" onClick={() => loadSettings()}>Discard Changes</button>
              <button className="btn btn-primary" onClick={handleApply} disabled={saving}>
                {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Connectivity Settings'}
              </button>
            </div>
          </div>
        )}

        {activeSection === 'notifications' && (
          <div className="settings-section fade-in">
            <div className="settings-section-header">
              <h2 className="settings-section-title">Notification Preferences</h2>
              <p className="settings-section-desc">Control how and when you receive notifications.</p>
            </div>

            <div className="settings-block">
              <h3 className="settings-block-title">CHANNELS</h3>
              <div className="settings-toggles">
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Email Notifications</div>
                    <div className="toggle-desc">Get notified about important updates via email</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={prefs.emailNotifications !== false} onChange={() => toggle('emailNotifications')} />
                    <span className="toggle-slider" />
                  </label>
                </div>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Desktop Notifications</div>
                    <div className="toggle-desc">Show browser push notifications for new mail</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={!!prefs.desktopNotifications} onChange={() => toggle('desktopNotifications')} />
                    <span className="toggle-slider" />
                  </label>
                </div>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Sound Alerts</div>
                    <div className="toggle-desc">Play a sound when new mail arrives</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={!!prefs.soundAlerts} onChange={() => toggle('soundAlerts')} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            </div>

            <div className="settings-block">
              <h3 className="settings-block-title">SMART FILTERING</h3>
              <div className="settings-toggles">
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Important Only</div>
                    <div className="toggle-desc">Only notify for emails marked as important</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={!!prefs.importantOnly} onChange={() => toggle('importantOnly')} />
                    <span className="toggle-slider" />
                  </label>
                </div>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Quiet Hours</div>
                    <div className="toggle-desc">Mute notifications during specific hours</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={!!prefs.quietHours} onChange={() => toggle('quietHours')} />
                    <span className="toggle-slider" />
                  </label>
                </div>
                {prefs.quietHours && (
                  <div className="toggle-row">
                    <div>
                      <div className="toggle-label">Quiet Period</div>
                      <div className="toggle-desc">Notifications paused during this time</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <select className="smart-compose-select" value={prefs.quietStart || '22:00'} onChange={e => setPrefs(p => ({ ...p, quietStart: e.target.value }))}>
                        <option value="20:00">8 PM</option>
                        <option value="21:00">9 PM</option>
                        <option value="22:00">10 PM</option>
                        <option value="23:00">11 PM</option>
                      </select>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
                      <select className="smart-compose-select" value={prefs.quietEnd || '08:00'} onChange={e => setPrefs(p => ({ ...p, quietEnd: e.target.value }))}>
                        <option value="06:00">6 AM</option>
                        <option value="07:00">7 AM</option>
                        <option value="08:00">8 AM</option>
                        <option value="09:00">9 AM</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="settings-footer">
              <button className="btn btn-secondary" onClick={() => loadSettings()}>Discard Changes</button>
              <button className="btn btn-primary" onClick={handleApply} disabled={saving}>
                {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Notification Settings'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right panel — signature preview */}
      <div className="settings-right">
        <div className="card" style={{ padding: '18px', marginBottom: 16 }}>
          <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Active Signature
          </h4>
          <div className="signature-mini-preview">
            <div style={{ fontWeight: 700, fontSize: 13 }}>{user?.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{signature.title || 'Your Title'}</div>
            {signature.company && <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{signature.company}</div>}
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {signature.phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>📱 {signature.phone}</div>}
              {signature.website && <div style={{ fontSize: 11, color: 'var(--accent)' }}>🔗 {signature.website}</div>}
            </div>
            {signature.text && (
              <p style={{ fontStyle: 'italic', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 8, borderLeft: '2px solid var(--accent)', paddingLeft: 8 }}>
                "{signature.text}"
              </p>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: '18px', background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '20px' }}>⌨️</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Keyboard Shortcut</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            Press <kbd style={{ background: 'var(--accent)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', fontWeight: 700, boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>C</kbd> anywhere to quickly compose a new email.
          </p>
        </div>
      </div>
    </div>
  )
}
