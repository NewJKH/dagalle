import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const TENDENCY_OPTIONS = [
  { value: 'RELAX',    label: '여유롭게', desc: '느긋하게 즐기는 힐링 여행', icon: '🌿' },
  { value: 'BALANCED', label: '균형있게', desc: '관광과 휴식 적절히 혼합',   icon: '⚖️' },
  { value: 'ACTIVE',   label: '빡빡하게', desc: '최대한 많이 보는 알찬 여행', icon: '⚡' },
]

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [tendency, setTendency] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // 프론트 검증
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
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
          tendency,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || '회원가입에 실패했습니다.'); return }
      // 가입 성공 → 자동 로그인
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
    { label: '아이디', key: 'username', type: 'text', placeholder: '영문/숫자 (공백 없이)' },
    { label: '이메일', key: 'email',    type: 'email',    placeholder: 'example@email.com' },
    { label: '비밀번호', key: 'password', type: 'password', placeholder: '8자 이상' },
    { label: '비밀번호 확인', key: 'confirm', type: 'password', placeholder: '다시 한번 입력해주세요' },
  ]

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(145deg, #F0F9FF 0%, #fff 60%, #FFF7ED 100%)',
      padding: '80px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 500 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, var(--sky-lt), var(--sky-dk))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '0 4px 12px rgba(14,165,233,0.3)' }}>✈️</div>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>다갈래<span style={{ color: 'var(--coral)' }}>.</span></span>
          </Link>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 6 }}>회원가입</h1>
          <p style={{ color: 'var(--text3)', fontSize: '0.9rem' }}>
            이미 계정이 있으신가요? <Link to="/login" style={{ color: 'var(--sky)', fontWeight: 600 }}>로그인</Link>
          </p>
        </div>

        <div style={{ background: '#fff', borderRadius: 24, padding: '36px', boxShadow: '0 8px 32px rgba(14,165,233,0.08)', border: '1px solid var(--border-lt)' }}>
          {error && (
            <div style={{ background: 'var(--coral-bg)', border: '1px solid var(--coral-lt)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: '0.85rem', color: 'var(--coral)', fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 기본 정보 */}
            {fields.map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text2)', marginBottom: 7 }}>{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  required
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 11,
                    border: '1.5px solid var(--border)', outline: 'none',
                    fontSize: '0.9rem', background: '#fff', color: 'var(--text)',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--sky)'; e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.1)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                />
              </div>
            ))}

            {/* 여행 스타일 선택 */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text2)', marginBottom: 10 }}>
                여행 스타일 <span style={{ color: 'var(--coral)', fontSize: '0.75rem' }}>*필수</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {TENDENCY_OPTIONS.map(opt => {
                  const selected = tendency === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTendency(opt.value)}
                      style={{
                        padding: '14px 10px', borderRadius: 14, cursor: 'pointer',
                        border: selected ? '2px solid var(--sky)' : '1.5px solid var(--border)',
                        background: selected ? 'var(--sky-bg)' : '#fff',
                        transition: 'all 0.15s', textAlign: 'center',
                        boxShadow: selected ? '0 0 0 3px rgba(14,165,233,0.1)' : 'none',
                      }}
                    >
                      <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{opt.icon}</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: selected ? 'var(--sky-dk)' : 'var(--text)', marginBottom: 3 }}>{opt.label}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text3)', lineHeight: 1.4 }}>{opt.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              marginTop: 8, padding: '14px', borderRadius: 12, fontSize: '0.95rem', fontWeight: 700,
              background: loading ? 'var(--border)' : 'linear-gradient(135deg, var(--sky-lt), var(--sky-dk))',
              color: '#fff', boxShadow: loading ? 'none' : '0 6px 20px rgba(14,165,233,0.35)',
              transition: 'all 0.2s', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              border: 'none',
            }}>
              {loading
                ? <><span style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}/> 가입 중...</>
                : '🎉 회원가입 완료'
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
