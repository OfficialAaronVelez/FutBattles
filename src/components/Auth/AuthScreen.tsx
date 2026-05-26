import { useState } from 'react'
import { supabase } from '../../lib/supabase'

type Mode = 'login' | 'signup'

export function AuthScreen() {
  const [mode, setMode]         = useState<Mode>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [sent, setSent]         = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'signup') {
        if (!username.trim()) { setError('Please choose a username'); setLoading(false); return }
        if (username.length < 3) { setError('Username must be at least 3 characters'); setLoading(false); return }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username.trim().toUpperCase() },
          },
        })
        if (signUpError) throw signUpError
        setSent(true)
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        if (loginError) throw loginError
        // App.tsx listens to onAuthStateChange and will re-render
      }
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

  if (sent) {
    return (
      <div style={outerStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
          <div className="font-display" style={{ fontSize: 28, color: 'var(--gold-1)', marginBottom: 8 }}>
            CHECK YOUR EMAIL
          </div>
          <p style={{ color: 'var(--ink-2)', fontSize: 13, textAlign: 'center', maxWidth: 280 }}>
            We sent a confirmation link to <strong style={{ color: 'var(--ink-0)' }}>{email}</strong>.
            Click it to activate your account, then come back and log in.
          </p>
          <button
            className="btn-link"
            style={{ marginTop: 24, color: 'var(--ink-3)' }}
            onClick={() => { setSent(false); setMode('login') }}
          >
            ← Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={outerStyle}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div className="font-display" style={{ fontSize: 14, color: 'var(--gold-2)', letterSpacing: '0.2em' }}>
          FUT
        </div>
        <div className="font-display" style={{
          fontSize: 56, lineHeight: 0.85, color: 'var(--gold-1)',
          textShadow: '0 0 40px var(--gold-glow)',
        }}>
          BATTLES
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6, letterSpacing: '0.12em' }}>
          BUILD · BATTLE · DOMINATE
        </div>
      </div>

      <div style={cardStyle}>
        {/* Mode toggle */}
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,0.04)',
          borderRadius: 10, padding: 3, marginBottom: 24, gap: 3,
        }}>
          {(['login', 'signup'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null) }}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12,
                fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.08em',
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: mode === m ? 'var(--gold-1)' : 'transparent',
                color: mode === m ? '#1a1006' : 'var(--ink-3)',
              }}
            >
              {m === 'login' ? 'LOG IN' : 'SIGN UP'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && (
            <div style={fieldStyle}>
              <label style={labelStyle}>USERNAME</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="STRIKER_99"
                maxLength={20}
                autoComplete="username"
                required
                style={inputStyle}
              />
            </div>
          )}

          <div style={fieldStyle}>
            <label style={labelStyle}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={6}
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(255,71,103,0.1)', border: '1px solid rgba(255,71,103,0.3)',
              borderRadius: 8, padding: '8px 12px',
              color: 'var(--red-1)', fontSize: 12, textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ marginTop: 4, width: '100%', fontSize: 15, padding: '14px', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? '...' : mode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          margin: '20px 0', color: 'var(--ink-3)', fontSize: 11,
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          OR
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogle}
          style={{
            width: '100%', padding: '12px', borderRadius: 10,
            border: '1px solid var(--line)', background: 'rgba(255,255,255,0.04)',
            color: 'var(--ink-1)', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 8, transition: 'background 0.15s',
          }}
          onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          onMouseOut={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  )
}

/* ── Styles ── */
const outerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 16px',
  background: 'var(--bg)',
}

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 380,
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 20,
  padding: '28px 24px',
}

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}

const labelStyle: React.CSSProperties = {
  fontSize: 9,
  fontFamily: 'var(--font-display)',
  letterSpacing: '0.12em',
  color: 'var(--ink-3)',
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--line)',
  borderRadius: 10,
  padding: '12px 14px',
  color: 'var(--ink-0)',
  fontSize: 14,
  fontFamily: 'var(--font-ui)',
  outline: 'none',
  transition: 'border-color 0.15s',
  width: '100%',
  boxSizing: 'border-box' as const,
}
