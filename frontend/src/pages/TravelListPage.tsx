import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

interface TravelPlan {
  id: number
  title: string
  startLocation: string
  endLocation: string
  startDate: string
  endDate: string
  status: string
  isAiGenerated?: boolean
  totalEstimatedCost?: number
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:     { label: '계획 중', color: 'var(--sky-dk)', bg: 'var(--sky-bg)' },
  CONFIRMED: { label: '확정됨', color: 'var(--mint)', bg: 'var(--mint-bg)' },
  COMPLETED: { label: '완료',   color: 'var(--text3)', bg: 'var(--border-lt)' },
}

const DEST_GRADIENT: Record<string, string> = {
  '부산': 'linear-gradient(135deg, #0EA5E9, #0284C7)',
  '제주': 'linear-gradient(135deg, #10B981, #059669)',
  '교토': 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
  '오사카': 'linear-gradient(135deg, #F59E0B, #D97706)',
  '도쿄': 'linear-gradient(135deg, #EC4899, #DB2777)',
  '다낭': 'linear-gradient(135deg, #06B6D4, #0891B2)',
  '방콕': 'linear-gradient(135deg, #EF4444, #DC2626)',
  '파리': 'linear-gradient(135deg, #6366F1, #4F46E5)',
  '뉴욕': 'linear-gradient(135deg, #F97316, #EA580C)',
  '강릉': 'linear-gradient(135deg, #14B8A6, #0D9488)',
}
const DEST_EMOJI: Record<string, string> = {
  '부산': '🌊', '제주': '🌿', '교토': '⛩️', '오사카': '🏯', '도쿄': '🗼',
  '다낭': '🏖️', '방콕': '🛕', '파리': '🗼', '뉴욕': '🗽', '강릉': '🌊',
}
function getDestGradient(city: string) {
  return DEST_GRADIENT[city] ?? 'linear-gradient(135deg, var(--sky-lt), var(--sky-dk))'
}
function getDestEmoji(city: string) {
  return DEST_EMOJI[city] ?? '✈️'
}

const MOCK: TravelPlan[] = [
  { id: 1, title: '부산 봄 여행', startLocation: '서울', endLocation: '부산', startDate: '2026-05-01', endDate: '2026-05-04', status: 'CONFIRMED', totalEstimatedCost: 503600 },
  { id: 2, title: '교토 혼자 떠나기', startLocation: '서울', endLocation: '교토', startDate: '2026-06-10', endDate: '2026-06-14', status: 'DRAFT', totalEstimatedCost: 892000 },
  { id: 3, title: '제주도 힐링 여행', startLocation: '서울', endLocation: '제주', startDate: '2026-04-12', endDate: '2026-04-14', status: 'COMPLETED', totalEstimatedCost: 350000 },
]

export default function TravelListPage() {
  const [plans, setPlans] = useState<TravelPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) { navigate('/login'); return }
    fetch('/api/v1/travels', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setPlans(d.data?.content ?? MOCK))
      .catch(() => setPlans(MOCK))
      .finally(() => setLoading(false))
  }, [navigate])

  const nightCount = (start: string, end: string) => {
    const diff = (new Date(end).getTime() - new Date(start).getTime()) / 86400000
    return `${diff}박 ${diff + 1}일`
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 32px 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36 }}>
          <div>
            <p style={{ fontFamily: "'Caveat', cursive", fontSize: '1rem', color: 'var(--sky)', marginBottom: 6 }}>내 여행 플래너</p>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>
              내 여행 목록
            </h1>
          </div>
          <button onClick={() => setShowCreate(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 12, fontSize: '0.9rem', fontWeight: 700,
            background: 'linear-gradient(135deg, var(--sky-lt), var(--sky-dk))',
            color: '#fff', boxShadow: '0 6px 20px rgba(14,165,233,0.35)',
            transition: 'all 0.2s', border: 'none',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 10px 28px rgba(14,165,233,0.45)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(14,165,233,0.35)' }}
          >+ 새 여행 만들기</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 36 }}>
          {[
            { icon: '🗺️', label: '전체 여행', value: plans.length, gradient: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', numColor: 'var(--sky-dk)', border: '#BFDBFE' },
            { icon: '✈️', label: '예정된 여행', value: plans.filter(p => p.status !== 'COMPLETED').length, gradient: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', numColor: 'var(--mint)', border: '#A7F3D0' },
            { icon: '🏁', label: '완료된 여행', value: plans.filter(p => p.status === 'COMPLETED').length, gradient: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', numColor: 'var(--purple)', border: '#DDD6FE' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 18, padding: '22px 24px', border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', gap: 18, boxShadow: '0 2px 12px rgba(14,165,233,0.06)', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(14,165,233,0.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(14,165,233,0.06)' }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 14, background: s.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: s.numColor, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text3)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <LoadingSkeleton />
        ) : plans.length === 0 ? (
          <EmptyState onCreate={() => setShowCreate(true)} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {plans.map(plan => (
              <TravelCard key={plan.id} plan={plan} nightCount={nightCount} onClick={() => navigate(`/travels/${plan.id}`)} />
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={plan => { setPlans(p => [plan, ...p]); setShowCreate(false) }} />}
    </div>
  )
}

function TravelCard({ plan, nightCount, onClick }: { plan: TravelPlan; nightCount: (s: string, e: string) => string; onClick: () => void }) {
  const st = STATUS_MAP[plan.status] ?? STATUS_MAP.DRAFT
  const gradient = getDestGradient(plan.endLocation)
  const emoji = getDestEmoji(plan.endLocation)
  return (
    <div onClick={onClick} style={{
      background: '#fff', borderRadius: 20, overflow: 'hidden',
      border: '1px solid var(--border-lt)', cursor: 'pointer',
      boxShadow: '0 2px 12px rgba(14,165,233,0.06)',
      display: 'flex', alignItems: 'stretch',
      transition: 'all 0.22s',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 16px 40px rgba(14,165,233,0.14)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--sky-pale)' }}
    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(14,165,233,0.06)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-lt)' }}
    >
      {/* Gradient thumbnail */}
      <div style={{
        width: 80, flexShrink: 0,
        background: gradient,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
      }}>
        <span style={{ fontSize: '1.6rem' }}>{emoji}</span>
        <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.9)', fontWeight: 700, letterSpacing: '0.02em' }}>{plan.endLocation}</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>{plan.title}</h3>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
            {plan.isAiGenerated && <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'linear-gradient(135deg, #FFF7ED, #FEF3C7)', color: '#D97706', border: '1px solid #FDE68A' }}>✨ AI 생성</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--sky-dk)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: '0.75rem' }}>📍</span>{plan.startLocation} → {plan.endLocation}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>📅 {plan.startDate} ~ {plan.endDate}</span>
            <span style={{ fontSize: '0.75rem', background: 'var(--bg)', padding: '2px 10px', borderRadius: 20, color: 'var(--text3)', fontWeight: 500 }}>
              {nightCount(plan.startDate, plan.endDate)}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text3)', marginBottom: 2 }}>예상 총 비용</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--sky-dk)' }}>
            {(plan.totalEstimatedCost ?? 0) > 0 ? `${(plan.totalEstimatedCost ?? 0).toLocaleString()}원` : '미산정'}
          </div>
        </div>
        <span style={{ color: 'var(--text3)', fontSize: '1.2rem', flexShrink: 0 }}>›</span>
      </div>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 32px' }}>
      <div style={{ fontSize: '4rem', marginBottom: 20 }}>🗺️</div>
      <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>아직 여행 계획이 없어요</h3>
      <p style={{ color: 'var(--text3)', fontSize: '0.9rem', marginBottom: 28 }}>AI와 함께 첫 여행 계획을 세워볼까요?</p>
      <button onClick={onCreate} style={{ padding: '13px 28px', borderRadius: 12, fontSize: '0.95rem', fontWeight: 700, background: 'linear-gradient(135deg, var(--sky-lt), var(--sky-dk))', color: '#fff', boxShadow: '0 6px 20px rgba(14,165,233,0.35)', border: 'none' }}>
        ✨ 첫 여행 만들기
      </button>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ background: '#fff', borderRadius: 18, padding: '24px 28px', height: 88, border: '1px solid var(--border-lt)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ background: 'linear-gradient(90deg, var(--border-lt) 25%, var(--bg) 50%, var(--border-lt) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: 8, height: 16, width: '60%', marginBottom: 10 }}/>
          <div style={{ background: 'linear-gradient(90deg, var(--border-lt) 25%, var(--bg) 50%, var(--border-lt) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: 8, height: 12, width: '40%' }}/>
        </div>
      ))}
    </div>
  )
}

const TENDENCY_OPTIONS = [
  { value: 'RELAX',    label: '여유롭게', desc: '하루 2~3곳, 힐링 위주', icon: '🌿' },
  { value: 'BALANCED', label: '균형있게', desc: '하루 4~5곳, 관광+휴식', icon: '⚖️' },
  { value: 'ACTIVE',   label: '빡빡하게', desc: '하루 6곳+, 알찬 일정',   icon: '⚡' },
]

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: TravelPlan) => void }) {
  const [tab, setTab] = useState<'manual' | 'ai'>('ai')
  // 수동 생성 폼
  const [form, setForm] = useState({ title: '', startLocation: '', endLocation: '', startDate: '', endDate: '' })
  // AI 생성 폼
  const [aiForm, setAiForm] = useState({ startLocation: '서울', endLocation: '', startDate: '', endDate: '', tendency: 'BALANCED', memberCount: 1 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── 수동 생성 ──
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const token = localStorage.getItem('accessToken') || ''
    try {
      const res = await fetch('/api/v1/travels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: form.title, startLocation: form.startLocation, endLocation: form.endLocation, startDate: form.startDate, endDate: form.endDate }),
      })
      const data = await res.json()
      if (res.ok) {
        onCreated({ id: data.data?.id ?? Date.now(), ...form, status: 'DRAFT', isAiGenerated: false } as TravelPlan)
      } else {
        setError(data.message || '여행 생성에 실패했습니다.')
      }
    } catch {
      onCreated({ id: Date.now(), ...form, status: 'DRAFT', isAiGenerated: false } as TravelPlan)
    } finally { setLoading(false) }
  }

  // ── AI 생성 ──
  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiForm.endLocation) { setError('여행지를 입력해주세요.'); return }
    setLoading(true); setError('')
    const token = localStorage.getItem('accessToken') || ''
    try {
      const res = await fetch('/api/v1/travels/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(aiForm),
      })
      const data = await res.json()
      if (res.ok && data.data) {
        onCreated({ ...data.data, totalEstimatedCost: 0 } as TravelPlan)
      } else {
        setError(data.message || 'AI 일정 생성에 실패했습니다.')
      }
    } catch {
      setError('서버에 연결할 수 없습니다.')
    } finally { setLoading(false) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1.5px solid var(--border)', outline: 'none',
    fontSize: '0.9rem', color: 'var(--text)', background: '#fff', transition: 'border-color 0.15s',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 36, width: '100%', maxWidth: 500, boxShadow: '0 32px 80px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text)' }}>새 여행 만들기</h2>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', width: 32, height: 32, borderRadius: 8, fontSize: '1rem', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'var(--bg)', borderRadius: 12, padding: 4 }}>
          {([['ai', '✨ AI 자동 생성'], ['manual', '✏️ 직접 만들기']] as const).map(([t, label]) => (
            <button key={t} onClick={() => { setTab(t); setError('') }} style={{
              flex: 1, padding: '10px 0', borderRadius: 9, fontSize: '0.85rem', fontWeight: 700,
              background: tab === t ? '#fff' : 'transparent',
              color: tab === t ? 'var(--sky-dk)' : 'var(--text3)',
              boxShadow: tab === t ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            }}>{label}</button>
          ))}
        </div>

        {error && (
          <div style={{ background: 'var(--coral-bg)', border: '1px solid var(--coral-lt)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem', color: 'var(--coral)', fontWeight: 500 }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── AI 탭 ── */}
        {tab === 'ai' && (
          <form onSubmit={handleAiSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #FFF7ED)', borderRadius: 12, padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.6 }}>
              🤖 출발지, 여행지, 날짜만 입력하면 <strong>Claude AI</strong>가 최적 동선을 자동으로 짜드려요!
            </div>

            {[
              { label: '출발지', key: 'startLocation', placeholder: '예) 서울' },
              { label: '여행지', key: 'endLocation', placeholder: '예) 부산, 교토, 다낭...' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>{label}</label>
                <input placeholder={placeholder} value={aiForm[key as keyof typeof aiForm] as string} required
                  onChange={e => setAiForm(f => ({ ...f, [key]: e.target.value }))}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--sky)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: '출발일', key: 'startDate' },
                { label: '귀국일', key: 'endDate' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>{label}</label>
                  <input type="date" value={aiForm[key as keyof typeof aiForm] as string} required
                    onChange={e => setAiForm(f => ({ ...f, [key]: e.target.value }))}
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = 'var(--sky)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
              ))}
            </div>

            {/* 인원 */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>인원 수</label>
              <select value={aiForm.memberCount} onChange={e => setAiForm(f => ({ ...f, memberCount: Number(e.target.value) }))}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}명{n === 1 ? ' (혼자)' : ''}</option>)}
              </select>
            </div>

            {/* 여행 스타일 */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>여행 스타일</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {TENDENCY_OPTIONS.map(opt => {
                  const selected = aiForm.tendency === opt.value
                  return (
                    <button key={opt.value} type="button" onClick={() => setAiForm(f => ({ ...f, tendency: opt.value }))}
                      style={{
                        padding: '12px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                        border: selected ? '2px solid var(--sky)' : '1.5px solid var(--border)',
                        background: selected ? 'var(--sky-bg)' : '#fff',
                        boxShadow: selected ? '0 0 0 3px rgba(14,165,233,0.1)' : 'none',
                        transition: 'all 0.15s',
                      }}>
                      <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{opt.icon}</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: selected ? 'var(--sky-dk)' : 'var(--text)', marginBottom: 2 }}>{opt.label}</div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text3)', lineHeight: 1.3 }}>{opt.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              marginTop: 4, padding: '14px', borderRadius: 12, fontSize: '0.95rem', fontWeight: 700,
              background: loading ? 'var(--border)' : 'linear-gradient(135deg, #FBBF24, #F59E0B, #EF4444)',
              color: '#fff', border: 'none', boxShadow: loading ? 'none' : '0 6px 20px rgba(245,158,11,0.4)',
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {loading
                ? <><span style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}/> AI가 일정 만드는 중... (약 20~30초)</>
                : '✨ AI로 일정 자동 생성'}
            </button>
          </form>
        )}

        {/* ── 수동 탭 ── */}
        {tab === 'manual' && (
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: '여행 제목', key: 'title', type: 'text', placeholder: '예) 부산 봄 여행' },
              { label: '출발지', key: 'startLocation', type: 'text', placeholder: '예) 서울' },
              { label: '도착지', key: 'endLocation', type: 'text', placeholder: '예) 부산, 도쿄...' },
              { label: '출발 날짜', key: 'startDate', type: 'date', placeholder: '' },
              { label: '도착 날짜', key: 'endDate', type: 'date', placeholder: '' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>{label}</label>
                <input type={type} placeholder={placeholder} value={form[key as keyof typeof form]} required
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--sky)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            ))}
            <button type="submit" disabled={loading} style={{ marginTop: 8, padding: '13px', borderRadius: 12, fontSize: '0.92rem', fontWeight: 700, background: 'linear-gradient(135deg, var(--sky-lt), var(--sky-dk))', color: '#fff', border: 'none', boxShadow: '0 6px 20px rgba(14,165,233,0.35)', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? '만드는 중...' : '✈️ 여행 만들기'}
            </button>
          </form>
        )}

      </div>
    </div>
  )
}
