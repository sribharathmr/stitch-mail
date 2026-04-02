import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './AuthPages.css'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) return setError('Passwords do not match')
    if (form.password.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true)
    try {
      await register(form.name, form.email, form.password)
      navigate('/inbox')
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = () => {
    window.location.href = 'http://localhost:5000/api/auth/google'
  }

  return (
    <div className="auth-layout">
      <div className="auth-left">
        <div className="auth-brand">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M3 8l9-5 9 5v8l-9 5-9-5V8z" stroke="#3B82F6" strokeWidth="2" fill="none"/>
            <path d="M3 8l9 5 9-5" stroke="#3B82F6" strokeWidth="2"/>
            <path d="M12 13v8" stroke="#3B82F6" strokeWidth="2"/>
          </svg>
          <span className="auth-brand-name">Stitch Mail</span>
        </div>
        <div className="auth-hero">
          <h1 className="auth-hero-title">
            Start your<br/>
            <span className="auth-hero-accent">email journey</span>
          </h1>
          <p className="auth-hero-desc">
            Connect your Gmail account to Stitch Mail with one click. No app passwords, no hassle.
          </p>
          <div className="auth-steps">
            {[
              { num: '01', label: 'Click "Continue with Google"' },
              { num: '02', label: 'Approve Gmail access' },
              { num: '03', label: 'Start sending real emails!' },
            ].map(s => (
              <div key={s.num} className="auth-step">
                <div className="auth-step-num">{s.num}</div>
                <div className="auth-step-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="auth-left-footer">
          Free to start · No credit card required
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2 className="auth-card-title">Create account</h2>
            <p className="auth-card-subtitle">Connect your Gmail to get started instantly</p>
          </div>

          {/* Google Sign-Up (Primary — Recommended) */}
          <button
            id="google-signup-btn"
            type="button"
            className="btn-google"
            onClick={handleGoogleSignup}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>

          <div className="auth-divider"><span>or create with email</span></div>

          <form id="register-form" onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="auth-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="reg-name">Full name</label>
              <input id="reg-name" type="text" className="input" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Your full name" required autoComplete="name" />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email address</label>
              <input id="reg-email" type="email" className="input" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com" required autoComplete="email" />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Password</label>
              <input id="reg-password" type="password" className="input" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min. 6 characters" required minLength={6} autoComplete="new-password" />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-confirm">Confirm password</label>
              <input id="reg-confirm" type="password" className="input" value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="Re-enter password" required autoComplete="new-password" />
            </div>

            <button id="register-submit-btn" type="submit" className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 15 }}
              disabled={loading}>
              {loading ? (
                <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Creating account...</>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="auth-switch" style={{ marginTop: 20 }}>
            Already have an account?{' '}
            <Link to="/login" id="go-to-login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
