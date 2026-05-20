import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
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
      navigate(data.data.isPreferenceSet ? '/travels' : '/travels')
    } catch {
      setError('서버에 연결할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'linear-gradient(145deg, #F0F9FF 0%, #fff 50%, #FFF1F1 100%)',
    }}>
      {/* Left panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '64px 80px',
        background: 'linear-gradient(145deg, #0284C7 0%, #0EA5E9 50%, #38BDF8 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {[{ w:300,h:300,t:-60,r:-60 },{ w:200,h:200,b:40,l:40 }].map((c,i) => (
          <div key={i} style={{ position:'absolute', width:c.w, height:c.h, top:c.t, right:c.r, bottom:c.b, left:c.l, borderRadius:'50%', background:'rgba(255,255,255,0.07)', pointerEvents:'none' }}/>
        ))}
        <Link to="/" style={{ display:'flex', alignItems:'center', gap:10, marginBottom:60 }}>
          <div style={{ width:38, height:38, borderRadius:12, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>✈️</div>
          <span style={{ fontSize:'1.4rem', fontWeight:800, color:'#fff' }}>다갈래<span style={{ color:'#FDE68A' }}>.</span></span>
        </Link>
        <h1 style={{ fontSize:'clamp(2rem,3.5vw,3rem)', fontWeight:800, color:'#fff', lineHeight:1.2, letterSpacing:'-0.03em', marginBottom:20 }}>
          다시 만나서<br />반가워요 👋
        </h1>
        <p style={{ color:'rgba(255,255,255,0.7)', fontSize:'1rem', lineHeight:1.8, fontWeight:300 }}>
          로그인하고 여행 계획을<br />이어서 만들어요
        </p>
        <div style={{ marginTop:48, display:'flex', flexDirection:'column', gap:16 }}>
          {[
            { icon:'✈️', text:'AI가 최적 동선을 짜드려요' },
            { icon:'🍽️', text:'리뷰 분석 맛집 추천' },
            { icon:'👥', text:'팀원과 실시간 공유' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem' }}>{icon}</div>
              <span style={{ color:'rgba(255,255,255,0.85)', fontSize:'0.9rem', fontWeight:500 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display:'flex', alignItems:'center', justifyContent:'center', padding:'64px 80px' }}>
        <div style={{ width:'100%', maxWidth:400 }}>
          <div style={{ marginBottom:36 }}>
            <h2 style={{ fontSize:'1.8rem', fontWeight:800, color:'var(--text)', letterSpacing:'-0.02em', marginBottom:8 }}>로그인</h2>
            <p style={{ color:'var(--text3)', fontSize:'0.9rem' }}>계정이 없으신가요? <Link to="/register" style={{ color:'var(--sky)', fontWeight:600 }}>회원가입</Link></p>
          </div>

          {error && (
            <div style={{ background:'var(--coral-bg)', border:'1px solid var(--coral-lt)', borderRadius:12, padding:'12px 16px', marginBottom:20, fontSize:'0.85rem', color:'var(--coral)', fontWeight:500 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {[
              { label:'이메일', key:'email', type:'email', placeholder:'example@email.com' },
              { label:'비밀번호', key:'password', type:'password', placeholder:'비밀번호를 입력해주세요' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label style={{ display:'block', fontSize:'0.82rem', fontWeight:600, color:'var(--text2)', marginBottom:8 }}>{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  required
                  style={{
                    width:'100%', padding:'13px 16px', borderRadius:12,
                    border:'1.5px solid var(--border)', outline:'none',
                    fontSize:'0.92rem', background:'#fff', color:'var(--text)',
                    transition:'border-color 0.15s',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--sky)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            ))}

            <button type="submit" disabled={loading} style={{
              marginTop:8, padding:'14px', borderRadius:12, fontSize:'0.95rem', fontWeight:700,
              background: loading ? 'var(--border)' : 'linear-gradient(135deg, var(--sky-lt), var(--sky-dk))',
              color:'#fff', boxShadow: loading ? 'none' : '0 6px 20px rgba(14,165,233,0.35)',
              transition:'all 0.2s', cursor: loading ? 'not-allowed' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            }}>
              {loading ? (
                <><span style={{ width:16, height:16, border:'2.5px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }}/> 로그인 중...</>
              ) : '로그인 →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
