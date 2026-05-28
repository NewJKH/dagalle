import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuthFetch } from '../hooks/useAuthFetch'

interface UserInfo {
  id: number
  username: string
  email: string
  tendency: string | null
}

const TENDENCY_OPTS = [
  { key: 'RELAX',    label: '😌 여유롭게', desc: '느긋한 일정을 선호해요' },
  { key: 'BALANCED', label: '⚖️ 균형있게', desc: '적당히 즐기고 싶어요' },
  { key: 'ACTIVE',   label: '🏃 활동적으로', desc: '최대한 많이 경험하고 싶어요' },
]

export default function ProfilePage() {
  const navigate = useNavigate()
  const [user, setUser]     = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [editUsername, setEditUsername] = useState('')
  const [editTendency, setEditTendency] = useState<string | null>(null)
  const [saved, setSaved]   = useState(false)

  const authFetch = useAuthFetch()

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) { navigate('/login'); return }
    authFetch('/api/v1/users/me')
      .then(r => r.json())
      .then(d => {
        if (d?.data) {
          setUser(d.data)
          setEditUsername(d.data.username ?? '')
          setEditTendency(d.data.tendency ?? null)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [navigate])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await authFetch('/api/v1/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: editUsername, tendency: editTendency }),
      })
      const data = await res.json()
      if (res.ok && data.data) {
        setUser(data.data)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch { /* ignore */ }
    setSaving(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ width: 40, height: 40, border: '4px solid #EBEBEB', borderTopColor: '#0EA5E9', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}/>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray7)' }}>
      <Navbar />
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '96px 32px 64px' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 32 }}>
          <div style={{
            width: 68, height: 68, borderRadius: '50%',
            background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem', fontWeight: 900, color: '#fff', flexShrink: 0, letterSpacing: '-0.02em',
          }}>
            {user?.username?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>{user?.username}</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text3)' }}>{user?.email}</p>
          </div>
        </div>

        {/* 정보 카드 */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--border-lt)', padding: '28px', marginBottom: 14, boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text)', marginBottom: 20, letterSpacing: '-0.01em' }}>프로필 수정</h2>

          {/* 닉네임 */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 7 }}>닉네임</label>
            <input value={editUsername} onChange={e => setEditUsername(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '11px 14px',
                borderRadius: 10, border: '1.5px solid var(--border)', fontSize: '0.9rem',
                outline: 'none', fontFamily: 'inherit', background: '#fff', color: 'var(--text)',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-pale)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>

          {/* 이메일 */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 7 }}>이메일 <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(변경 불가)</span></label>
            <div style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid var(--border-lt)', fontSize: '0.9rem', color: 'var(--text3)', background: 'var(--gray7)' }}>
              {user?.email}
            </div>
          </div>

          {/* 여행 성향 */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 10 }}>여행 성향</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {TENDENCY_OPTS.map(opt => {
                const isSel = editTendency === opt.key
                return (
                  <div key={opt.key} onClick={() => setEditTendency(opt.key)} style={{
                    padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
                    border: `1.5px solid ${isSel ? 'var(--primary)' : 'var(--border)'}`,
                    background: isSel ? 'var(--primary-bg)' : '#fff',
                    display: 'flex', alignItems: 'center', gap: 12,
                    transition: 'all 0.15s',
                    boxShadow: isSel ? '0 0 0 3px var(--primary-pale)' : 'none',
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>{opt.label.split(' ')[0]}</span>
                    <div>
                      <div style={{ fontSize: '0.87rem', fontWeight: 700, color: isSel ? 'var(--primary-dk)' : 'var(--text)' }}>{opt.label.split(' ').slice(1).join(' ')}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 1 }}>{opt.desc}</div>
                    </div>
                    {isSel && <span style={{ marginLeft: 'auto', color: 'var(--primary)', fontWeight: 800, fontSize: '0.95rem' }}>✓</span>}
                  </div>
                )
              })}
            </div>
          </div>

          <button onClick={handleSave} disabled={saving} style={{
            width: '100%', padding: '13px', borderRadius: 10, border: 'none',
            background: saved ? '#16A34A' : 'var(--primary)', color: '#fff',
            fontSize: '0.95rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1, transition: 'all 0.2s', fontFamily: 'inherit',
          }}>
            {saving ? '저장 중...' : saved ? '✅ 저장됐어요!' : '저장하기'}
          </button>
        </div>

        {/* 내 여행 / 로그아웃 */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/travels')} style={{
            flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--border)',
            background: '#fff', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            ✈️ 내 여행 목록
          </button>
          <button onClick={handleLogout} style={{
            flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--coral-lt)',
            background: 'var(--coral-bg)', fontSize: '0.88rem', fontWeight: 600, color: 'var(--coral)', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            로그아웃
          </button>
        </div>
      </div>
    </div>
  )
}
