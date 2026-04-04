import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useUI } from '../context/UIContext'
import { useAuth } from '../context/AuthContext'
import { settingsAPI } from '../api'
import './SettingsPage.css'

const SETTINGS_NAV = [
  { id: 'general', label: 'General', icon: '⚙️' },
  { id: 'account', label: 'Account', icon: '👤' },
  { id: 'connectivity', label: 'Connectivity', icon: '🔗' },
  { id: 'themes', label: 'Themes', icon: '🎨', default: true },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'signatures', label: 'Signatures', icon: '✍️' },
]

const THEME_OPTIONS = [
  { id: 'light', label: 'Light Mode', desc: 'Clean and minimal', emoji: '☀️' },
  { id: 'deep-space', label: 'Deep Space', desc: 'Dark, elegant', emoji: '🌙' },
  { id: 'system', label: 'System Default', desc: 'Follows your OS', emoji: '💻' },
]

export default function SettingsPage() {
  const { theme, setTheme, settings, loadSettings } = useUI()
  const { user, setUser } = useAuth()
  const [activeSection, setActiveSection] = useState('themes')
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
            onClick={() => setActiveSection(item.id)}
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
              <p className="settings-section-desc">Personalize your email with a signature.</p>
            </div>
            <div className="settings-block">
              <h3 className="settings-block-title">ACTIVE SIGNATURE</h3>
              <div className="signature-preview">
                <div className="signature-quote">
                  {signature.text}
                </div>
                <div className="signature-name">{user?.name || 'Your Name'}</div>
                <div className="signature-title">{signature.title || 'Your Title'}</div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea
                  id="settings-signature-text"
                  className="input"
                  value={signature.text}
                  onChange={e => setSignature(s => ({ ...s, text: e.target.value }))}
                  rows={3}
                  placeholder="Signature quote or text"
                />
                <input
                  id="settings-signature-title"
                  className="input"
                  value={signature.title}
                  onChange={e => setSignature(s => ({ ...s, title: e.target.value }))}
                  placeholder="Your title / role"
                />
              </div>
            </div>
            <div className="settings-footer">
              <button id="settings-save-signature" className="btn btn-primary" onClick={handleApply} disabled={saving}>
                {saving ? 'Saving...' : 'Save Signature'}
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
                <div className="avatar avatar-xl" style={{ background: '#3B82F6', color: '#fff', fontSize: 22, flexShrink: 0 }}>
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
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Password</div>
                    <div className="toggle-desc">Last changed 30 days ago</div>
                  </div>
                  <button className="btn btn-secondary btn-sm">Change Password</button>
                </div>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Two-Factor Authentication</div>
                    <div className="toggle-desc">Add an extra layer of security to your account</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={!!prefs.twoFactor} onChange={() => toggle('twoFactor')} />
                    <span className="toggle-slider" />
                  </label>
                </div>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Active Sessions</div>
                    <div className="toggle-desc">1 active session on this device</div>
                  </div>
                  <button className="btn btn-secondary btn-sm">View Sessions</button>
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
                  <div style={{ height: '100%', width: '21%', background: 'linear-gradient(90deg, #3B82F6, #8B5CF6)', borderRadius: 3 }} />
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: '#3B82F6' }} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Emails: 2.1 GB</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: '#8B5CF6' }} />
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
                  <button className="btn btn-secondary btn-sm">Export</button>
                </div>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label" style={{ color: 'var(--danger)' }}>Delete Account</div>
                    <div className="toggle-desc">Permanently delete your account and all data</div>
                  </div>
                  <button className="btn btn-sm" style={{ background: 'var(--danger)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'connectivity' && (
          <div className="settings-section fade-in">
            <div className="settings-section-header">
              <h2 className="settings-section-title">Accounts & Connectivity</h2>
              <p className="settings-section-desc">Manage your email server settings for sending and receiving.</p>
            </div>

            {user?.google_id && (
              <div className="settings-block" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
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
            <p style={{ fontStyle: 'italic', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {signature.text}
            </p>
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{user?.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{signature.title || 'Lead Designer'}</div>
            </div>
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
