import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const TENDENCY_OPTIONS = [
  { value: 'RELAX',    label: '여유롭게', desc: '느긋하게 힐링 여행', icon: '🌿' },
  { value: 'BALANCED', label: '균형있게', desc: '관광과 휴식 적절히', icon: '⚖️' },
  { value: 'ACTIVE',   label: '빡빡하게', desc: '최대한 알차게',       icon: '⚡' },
]

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [tendency, setTendency] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.username.trim().length < 2) { setError('닉네임은 2자 이상이어야 합니다.'); return }
    if (form.username.trim().length > 20) { setError('닉네임은 20자 이하여야 합니다.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('유효한 이메일 형식이 아닙니다.'); return }
    if (form.password.length < 8) { setError('비밀번호는 8자 이상이어야 합니다.'); return }
    if (form.password !== form.confirm) { setError('비밀번호가 일치하지 않아요.'); return }
    if (!tendency) { setError('여행 스타일을 선택해주세요.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password, tendency }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || '회원가입에 실패했습니다.'); return }
      const loginRes = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      const loginData = await loginRes.json()
      if (loginRes.ok && loginData.data?.accessToken) {
        localStorage.setItem('accessToken', loginData.data.accessToken)
        localStorage.setItem('refreshToken', loginData.data.refreshToken)
        navigate('/travels')
      } else {
        navigate('/login')
      }
    } catch {
      setError('서버에 연결할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { label: '닉네임', key: 'username', type: 'text', placeholder: '2–20자 (공백 없이)' },
    { label: '이메일', key: 'email', type: 'email', placeholder: 'example@email.com' },
    { label: '비밀번호', key: 'password', type: 'password', placeholder: '8자 이상' },
    { label: '비밀번호 확인', key: 'confirm', type: 'password', placeholder: '다시 한번 입력해주세요' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#fff' }}>

      {/* 좌측 이미지 패널 */}
      <div style={{
        flex: '0 0 420px', position: 'relative', overflow: 'hidden',
        backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=85)',
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.48)' }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '40px 44px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="#fff" stroke="none"/></svg>
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>다갈래</span>
          </Link>
          <div style={{ marginTop: 'auto', marginBottom: 48 }}>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, padding: '4px 12px', marginBottom: 20 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fff', letterSpacing: '0.06em' }}>무료 시작</span>
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: 14, lineHeight: 1.25 }}>
              첫 여행을<br />함께해요 ✈️
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', lineHeight: 1.8 }}>
              가입하면 무제한으로<br />여행 일정을 만들 수 있어요
            </p>
          </div>
        </div>
      </div>

      {/* 우측 폼 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 60px', background: 'var(--gray7)', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: 8 }}>회원가입</h1>
            <p style={{ color: 'var(--text3)', fontSize: '0.88rem' }}>
              이미 계정이 있으신가요?{' '}
              <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>로그인</Link>
            </p>
          </div>

          {error && (
            <div style={{ background: 'var(--coral-bg)', border: '1px solid var(--coral-lt)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: '0.85rem', color: 'var(--coral)', fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ background: '#fff', borderRadius: 16, padding: '28px', border: '1px solid var(--border-lt)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {fields.map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>{label}</label>
                  <input type={type} placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    required
                    style={{
                      width: '100%', padding: '11px 14px', borderRadius: 10,
                      border: '1.5px solid var(--border)', outline: 'none',
                      fontSize: '0.9rem', background: '#fff', color: 'var(--text)',
                      transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box', fontFamily: 'inherit',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-pale)' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
              ))}

              {/* 여행 스타일 */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text2)', marginBottom: 8 }}>
                  여행 스타일 <span style={{ color: 'var(--coral)', fontSize: '0.7rem', fontWeight: 500 }}>*필수</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {TENDENCY_OPTIONS.map(opt => {
                    const sel = tendency === opt.value
                    return (
                      <button key={opt.value} type="button" onClick={() => setTendency(opt.value)}
                        style={{
                          padding: '12px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                          border: sel ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                          background: sel ? 'var(--primary-bg)' : '#fff',
                          boxShadow: sel ? '0 0 0 3px var(--primary-pale)' : 'none',
                          transition: 'all 0.15s', fontFamily: 'inherit',
                        }}>
                        <div style={{ fontSize: '1.3rem', marginBottom: 5 }}>{opt.icon}</div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: sel ? 'var(--primary)' : 'var(--text)', marginBottom: 2 }}>{opt.label}</div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text3)', lineHeight: 1.3 }}>{opt.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

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
                  ? <><span style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}/> 가입 중...</>
                  : '회원가입 완료 →'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
