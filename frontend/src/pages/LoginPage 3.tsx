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
    <div style={{ minHeight: '100vh', display: 'flex', background: '#FAFAFA' }}>
      {/* 좌측 — 이미지 패널 */}
      <div style={{
        flex: '0 0 480px', position: 'relative', overflow: 'hidden',
        backgroundImage: 'url(https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=900&q=85)',
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.48)' }}/>
        <div style={{ position: 'relative', zIndex: 1, padding: '40px 48px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'auto' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✈️</div>
            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>다갈래<span style={{ color: 'var(--primary)' }}>.</span></span>
          </Link>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: 12, lineHeight: 1.3 }}>
              다시 만나서<br />반가워요 👋
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.92rem', lineHeight: 1.8 }}>
              로그인하고 여행 계획을<br />이어서 만들어요
            </p>
          </div>
        </div>
      </div>

      {/* 우측 — 폼 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 64px' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: 8 }}>로그인</h1>
            <p style={{ color: '#888', fontSize: '0.88rem' }}>
              계정이 없으신가요?{' '}
              <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700 }}>회원가입</Link>
            </p>
          </div>

          {error && (
            <div style={{ background: '#FFF3F1', border: '1px solid #FFBDB5', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: '이메일', key: 'email', type: 'email', placeholder: 'example@email.com' },
              { label: '비밀번호', key: 'password', type: 'password', placeholder: '••••••••' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#333', marginBottom: 8 }}>{label}</label>
                <input
                  type={type} placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  required
                  style={{
                    width: '100%', padding: '13px 16px', borderRadius: 10,
                    border: '1.5px solid #E0E0E0', outline: 'none',
                    fontSize: '0.92rem', background: '#fff', color: '#1A1A1A',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                  onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
                />
              </div>
            ))}

            <button type="submit" disabled={loading} style={{
              marginTop: 8, padding: '14px', borderRadius: 10, fontSize: '0.95rem', fontWeight: 800,
              background: loading ? '#E0E0E0' : 'var(--primary)',
              color: '#fff',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(255,86,64,0.35)',
              transition: 'all 0.2s', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
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
  )
}
