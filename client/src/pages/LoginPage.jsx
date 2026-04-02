import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './AuthPages.css'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(searchParams.get('error') === 'oauth_failed' ? 'Google sign-in failed. Please try again.' : '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/inbox')
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5000/api/auth/google'
  }

  return (
    <div className="auth-layout">
      <div className="auth-left">
        <div className="auth-brand">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M3 8l9-5 9 5v8l-9 5-9-5V8z" stroke="#3B82F6" strokeWidth="2" fill="none" />
            <path d="M3 8l9 5 9-5" stroke="#3B82F6" strokeWidth="2" />
            <path d="M12 13v8" stroke="#3B82F6" strokeWidth="2" />
          </svg>
          <span className="auth-brand-name">Stitch Mail</span>
        </div>
        <div className="auth-hero">
          <h1 className="auth-hero-title">
            Your inbox,<br />
            <span className="auth-hero-accent">beautifully organized</span>
          </h1>
          <p className="auth-hero-desc">
            Stitch Mail brings clarity to your communications. Smart inbox, unified accounts, and elegant design — all in one place.
          </p>
          <div className="auth-features">
            {[
              { icon: '⚡', text: 'Lightning-fast performance' },
              { icon: '🔒', text: 'End-to-end security' },
              { icon: '🤖', text: 'AI-powered smart inbox' },
            ].map(f => (
              <div key={f.text} className="auth-feature-item">
                <span>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="auth-left-footer">
          "The best email experience I've ever had." — Design Weekly
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2 className="auth-card-title">Welcome back</h2>
            <p className="auth-card-subtitle">Sign in to your Stitch Mail account</p>
          </div>

          {/* Google Sign-In (Primary) */}
          <button
            id="google-login-btn"
            type="button"
            className="btn-google"
            onClick={handleGoogleLogin}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>

          <div className="auth-divider"><span>or sign in with email</span></div>

          <form id="login-form" onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="auth-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                className="input"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" htmlFor="login-password" style={{ marginBottom: 0 }}>Password</label>
                <a href="#" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>Forgot password?</a>
              </div>
              <input
                id="login-password"
                type="password"
                className="input"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 15 }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account?{' '}
            <Link to="/register" id="go-to-register">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
