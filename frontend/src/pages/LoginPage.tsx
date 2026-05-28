import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || '로그인에 실패했습니다.'); return }
      localStorage.setItem('accessToken', data.data.accessToken)
      localStorage.setItem('refreshToken', data.data.refreshToken)
      navigate('/travels')
    } catch { setError('서버에 연결할 수 없습니다.') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#fff' }}>

      {/* 좌측 — 이미지 패널 */}
      <div style={{
        flex: '0 0 460px', position: 'relative', overflow: 'hidden',
        backgroundImage: 'url(https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=900&q=85)',
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '40px 44px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="#fff" stroke="none"/></svg>
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>다갈래</span>
          </Link>

          <div style={{ marginTop: 'auto', marginBottom: 48 }}>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, padding: '4px 12px', marginBottom: 20 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fff', letterSpacing: '0.06em' }}>AI 여행 플래너</span>
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: 14, lineHeight: 1.25 }}>
              다시 만나서<br />반가워요 👋
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', lineHeight: 1.8 }}>
              로그인하고 여행 계획을<br />이어서 만들어요
            </p>
          </div>
        </div>
      </div>

      {/* 우측 — 폼 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 60px', background: 'var(--gray7)' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: 8 }}>로그인</h1>
            <p style={{ color: 'var(--text3)', fontSize: '0.88rem' }}>
              계정이 없으신가요?{' '}
              <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700 }}>회원가입</Link>
            </p>
          </div>

          {error && (
            <div style={{ background: 'var(--coral-bg)', border: '1px solid var(--coral-lt)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.85rem', color: 'var(--coral)', fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ background: '#fff', borderRadius: 16, padding: '32px', border: '1px solid var(--border-lt)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {[
                { label: '이메일', key: 'email', type: 'email', placeholder: 'example@email.com' },
                { label: '비밀번호', key: 'password', type: 'password', placeholder: '••••••••' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text2)', marginBottom: 8 }}>{label}</label>
                  <input
                    type={type} placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    required
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 10,
                      border: '1.5px solid var(--border)', outline: 'none',
                      fontSize: '0.92rem', background: '#fff', color: 'var(--text)',
                      transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box', fontFamily: 'inherit',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-pale)' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
              ))}

              <button type="submit" disabled={loading} style={{
                marginTop: 4, padding: '13px', borderRadius: 10, fontSize: '0.95rem', fontWeight: 700,
                background: loading ? 'var(--gray5)' : 'var(--primary)',
                color: '#fff', border: 'none',
                transition: 'all 0.15s', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-dk)' }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary)' }}
              >
                {loading
                  ? <><span style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}/> 로그인 중...</>
                  : '로그인 →'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
