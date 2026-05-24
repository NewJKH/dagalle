import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import AutocompleteInput from '../components/AutocompleteInput'
import { DEPARTURE_OPTIONS, DEST_JP, DEST_KR, DEST_EMOJI, DEST_IMG } from '../constants/locations'

const SEARCH_KEY = 'dagalle_search'

interface TravelPlan {
  id: number; title: string; startLocation: string; endLocation: string
  startDate: string; endDate: string; status: string
  isAiGenerated?: boolean; totalEstimatedCost?: number
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:     { label: '계획 중', color: '#0984E3', bg: '#EBF4FF' },
  CONFIRMED: { label: '확정됨', color: '#00B894', bg: '#E8FAF5' },
  COMPLETED: { label: '완료',   color: '#888',    bg: '#F5F5F5' },
}

const TENDENCY_OPTIONS = [
  { value: 'RELAX',    label: '여유롭게', desc: '하루 2~3곳, 힐링 위주', icon: '🌿' },
  { value: 'BALANCED', label: '균형있게', desc: '하루 4~5곳, 관광+휴식', icon: '⚖️' },
  { value: 'ACTIVE',   label: '빡빡하게', desc: '하루 6곳+, 알찬 일정',   icon: '⚡' },
]

function nightCount(start: string, end: string) {
  const d = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000)
  return `${d}박 ${d + 1}일`
}
function formatDate(str: string) {
  const [y, m, d] = str.split('-')
  return `${y}.${m}.${d}`
}

// sessionStorage에서 저장된 검색값 읽기
function readSearch() {
  try { return JSON.parse(sessionStorage.getItem(SEARCH_KEY) || '{}') } catch { return {} }
}

export default function TravelListPage() {
  const [plans, setPlans]       = useState<TravelPlan[]>([])
  const [loading, setLoading]   = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter]     = useState<'all' | 'upcoming' | 'completed'>('all')
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) { navigate('/login'); return }
    fetch('/api/v1/travels', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setPlans(d.data?.content ?? []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false))
  }, [navigate])

  const filtered = plans.filter(p =>
    filter === 'all' ? true :
    filter === 'upcoming' ? p.status !== 'COMPLETED' :
    p.status === 'COMPLETED'
  )

  const upcoming  = plans.filter(p => p.status !== 'COMPLETED').length
  const completed = plans.filter(p => p.status === 'COMPLETED').length

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA' }}>
      <Navbar />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '88px 32px 64px' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.02em' }}>내 여행 목록</h1>
            <p style={{ fontSize: '0.82rem', color: '#999', marginTop: 4 }}>AI가 만들어준 나만의 여행 플랜</p>
          </div>
          <button onClick={() => setShowCreate(true)} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '11px 22px', borderRadius: 10, fontSize: '0.875rem', fontWeight: 800,
            background: 'var(--primary)', color: '#fff', border: 'none',
            boxShadow: '0 2px 10px rgba(255,86,64,0.3)', cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-dk)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary)' }}
          >+ 새 여행 만들기</button>
        </div>

        {/* 필터 탭 + 카운트 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20, background: '#fff', borderRadius: 10, padding: 4, border: '1px solid #F0F0F0', width: 'fit-content' }}>
          {([
            { key: 'all',       label: `전체 ${plans.length}` },
            { key: 'upcoming',  label: `예정 ${upcoming}` },
            { key: 'completed', label: `완료 ${completed}` },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)} style={{
              padding: '7px 18px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, border: 'none', cursor: 'pointer',
              background: filter === key ? 'var(--primary)' : 'transparent',
              color: filter === key ? '#fff' : '#888',
              transition: 'all 0.15s',
            }}>{label}</button>
          ))}
        </div>

        {/* 리스트 */}
        {loading ? (
          <LoadingSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState onCreate={() => setShowCreate(true)} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(plan => (
              <TravelCard key={plan.id} plan={plan} onClick={() => navigate(`/travels/${plan.id}`)} />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={plan => { setPlans(p => [plan, ...p]); setShowCreate(false); navigate(`/travels/${plan.id}`) }}
        />
      )}
    </div>
  )
}

/* ── 여행 카드 ── */
function TravelCard({ plan, onClick }: { plan: TravelPlan; onClick: () => void }) {
  const st    = STATUS_MAP[plan.status] ?? STATUS_MAP.DRAFT
  const emoji = DEST_EMOJI[plan.endLocation] ?? '✈️'
  const img   = DEST_IMG[plan.endLocation]

  return (
    <div onClick={onClick} style={{
      background: '#fff', borderRadius: 14, overflow: 'hidden',
      border: '1px solid #EBEBEB', cursor: 'pointer', display: 'flex',
      transition: 'all 0.18s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}
    onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; el.style.borderColor = '#D8D8D8'; el.style.transform = 'translateY(-2px)' }}
    onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; el.style.borderColor = '#EBEBEB'; el.style.transform = '' }}
    >
      {/* 썸네일 */}
      <div style={{ width: 88, flexShrink: 0, position: 'relative', overflow: 'hidden', background: '#F5F5F5' }}>
        {img
          ? <img src={img} alt={plan.endLocation} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', background: '#F0F0F0' }}>{emoji}</div>}
        {img && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)' }}/>}
        <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', fontSize: '1rem' }}>{emoji}</div>
      </div>

      {/* 콘텐츠 */}
      <div style={{ flex: 1, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{plan.title}</h3>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: st.bg, color: st.color, flexShrink: 0 }}>{st.label}</span>
            {plan.isAiGenerated && <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#FFF3F1', color: 'var(--primary)', flexShrink: 0 }}>✨ AI</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#444', display: 'flex', alignItems: 'center', gap: 4 }}>
              {plan.startLocation} → {plan.endLocation}
            </span>
            <span style={{ fontSize: '0.78rem', color: '#999' }}>
              {formatDate(plan.startDate)} ~ {formatDate(plan.endDate)}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#BBB', background: '#F5F5F5', padding: '2px 9px', borderRadius: 20 }}>
              {nightCount(plan.startDate, plan.endDate)}
            </span>
          </div>
        </div>

        {/* 비용 */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {(plan.totalEstimatedCost ?? 0) > 0 && (
            <>
              <div style={{ fontSize: '0.65rem', color: '#BBB', marginBottom: 2 }}>예상 비용</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary)' }}>
                {(plan.totalEstimatedCost ?? 0).toLocaleString()}원
              </div>
            </>
          )}
        </div>
        <span style={{ color: '#CCC', fontSize: '1rem', flexShrink: 0 }}>›</span>
      </div>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0', background: '#fff', borderRadius: 14, border: '1px solid #EBEBEB' }}>
      <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>✈️</div>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1A1A1A', marginBottom: 8 }}>아직 여행 계획이 없어요</h3>
      <p style={{ color: '#999', fontSize: '0.85rem', marginBottom: 24 }}>AI와 함께 첫 여행 계획을 세워볼까요?</p>
      <button onClick={onCreate} style={{ padding: '12px 28px', borderRadius: 10, fontSize: '0.9rem', fontWeight: 800, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 2px 10px rgba(255,86,64,0.3)' }}>
        ✨ 첫 여행 만들기
      </button>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ background: '#fff', borderRadius: 14, height: 88, border: '1px solid #EBEBEB', overflow: 'hidden' }}>
          <div className="shimmer" style={{ width: '100%', height: '100%' }}/>
        </div>
      ))}
    </div>
  )
}

/* ── 여행 생성 모달 ── */
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: TravelPlan) => void }) {
  const saved = readSearch()

  const [tab, setTab] = useState<'natural' | 'ai'>('natural')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // 자유 입력
  const [nat, setNat] = useState({
    startLocation: saved.from || '인천국제공항',
    startDate:     saved.startDate || '',
    endDate:       saved.endDate   || '',
    memberCount:   saved.members   || 2,
    naturalInput:  saved.to ? `${saved.to}으로 여행 가고 싶어요. ` : '',
  })

  // AI 상세
  const [ai, setAi] = useState({
    startLocation:       saved.from || '인천국제공항',
    endLocation:         saved.to   || '',
    startDate:           saved.startDate || '',
    endDate:             saved.endDate   || '',
    tendency:            'BALANCED',
    memberCount:         saved.members || 2,
    countryCode:         'JP',
    keywords:            [] as string[],
    keywordInput:        '',
    theme:               '',
    withCar:             false,
    budgetTotal:         '',
    departureFlightTime: '',
    arrivalAtDestTime:   '',
    returnFlightTime:    '',
  })

  const inputSt: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1.5px solid #E0E0E0', outline: 'none',
    fontSize: '0.88rem', color: '#1A1A1A', background: '#fff', transition: 'border-color 0.15s',
  }

  const handleNaturalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nat.naturalInput.trim()) { setError('여행 설명을 입력해주세요.'); return }
    if (!nat.startDate || !nat.endDate) { setError('날짜를 입력해주세요.'); return }
    setLoading(true); setError('')
    const token = localStorage.getItem('accessToken') || ''
    try {
      const res = await fetch('/api/v1/travels/ai/init/natural', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ startLocation: nat.startLocation, startDate: nat.startDate, endDate: nat.endDate, memberCount: nat.memberCount, naturalInput: nat.naturalInput.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.data) { sessionStorage.removeItem(SEARCH_KEY); onCreated({ ...data.data, totalEstimatedCost: 0 } as TravelPlan) }
      else setError(data.message || 'AI 여행 생성에 실패했습니다.')
    } catch { setError('서버에 연결할 수 없습니다.') }
    finally { setLoading(false) }
  }

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ai.endLocation) { setError('여행지를 입력해주세요.'); return }
    setLoading(true); setError('')
    const token = localStorage.getItem('accessToken') || ''
    try {
      const res = await fetch('/api/v1/travels/ai/init', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...ai, theme: ai.theme || null, budgetTotal: ai.budgetTotal ? Number(ai.budgetTotal) : null, departureFlightTime: ai.departureFlightTime || null, arrivalAtDestTime: ai.arrivalAtDestTime || null, returnFlightTime: ai.returnFlightTime || null }),
      })
      const data = await res.json()
      if (res.ok && data.data) { sessionStorage.removeItem(SEARCH_KEY); onCreated({ ...data.data, totalEstimatedCost: 0 } as TravelPlan) }
      else setError(data.message || 'AI 일정 생성에 실패했습니다.')
    } catch { setError('서버에 연결할 수 없습니다.') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '32px 32px 28px', width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1A1A1A' }}>새 여행 만들기</h2>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E0E0E0', background: '#FAFAFA', cursor: 'pointer', fontSize: '0.9rem', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, border: '1px solid #E0E0E0', borderRadius: 10, overflow: 'hidden' }}>
          {([['natural', '💬 자유 입력'], ['ai', '✨ AI 상세 설정']] as const).map(([t, label], i) => (
            <button key={t} onClick={() => { setTab(t); setError('') }} style={{
              flex: 1, padding: '11px', fontSize: '0.82rem', fontWeight: 700, border: 'none', cursor: 'pointer',
              background: tab === t ? 'var(--primary)' : '#FAFAFA',
              color: tab === t ? '#fff' : '#888',
              borderRight: i === 0 ? '1px solid #E0E0E0' : 'none',
              transition: 'all 0.15s',
            }}>{label}</button>
          ))}
        </div>

        {error && (
          <div style={{ background: '#FFF3F1', border: '1px solid #FFBDB5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 500 }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── 자유 입력 탭 ── */}
        {tab === 'natural' && (
          <form onSubmit={handleNaturalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#F8FFF8', border: '1px solid #C8F0D0', borderRadius: 10, padding: '12px 14px', fontSize: '0.8rem', color: '#2D6A4F', lineHeight: 1.6 }}>
              💬 가고 싶은 여행을 자유롭게 설명하면 AI가 모든 것을 알아서 만들어줘요
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#333', marginBottom: 6 }}>출발지</label>
              <AutocompleteInput value={nat.startLocation} onChange={v => setNat(f => ({...f, startLocation: v}))} options={DEPARTURE_OPTIONS} placeholder="인천국제공항" required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {([['출발일', 'startDate'], ['귀국일', 'endDate']] as const).map(([label, key]) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#333', marginBottom: 6 }}>{label}</label>
                  <input type="date" value={nat[key]} required onChange={e => setNat(f => ({...f, [key]: e.target.value}))} style={inputSt}
                    onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                    onBlur={e => (e.target.style.borderColor = '#E0E0E0')} />
                </div>
              ))}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#333', marginBottom: 6 }}>인원 수</label>
              <select value={nat.memberCount} onChange={e => setNat(f => ({...f, memberCount: Number(e.target.value)}))} style={{ ...inputSt, cursor: 'pointer' }}>
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}명{n===1?' (혼자)':n===2?' (커플)':''}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#333', marginBottom: 6 }}>
                여행 설명 <span style={{ fontWeight: 400, color: '#BBB' }}>({nat.naturalInput.length}/300)</span>
              </label>
              <textarea
                placeholder="예) 후쿠오카 도착 후 벳푸 온천 여행하고 싶어요. 렌트카 없이 대중교통으로, 현지 라멘과 료칸 숙박이 있으면 좋겠어요."
                value={nat.naturalInput}
                onChange={e => setNat(f => ({...f, naturalInput: e.target.value.slice(0, 300)}))}
                rows={4}
                style={{ ...inputSt, resize: 'vertical', minHeight: 100, lineHeight: 1.6, fontFamily: 'inherit' }}
                onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
              />
            </div>

            <button type="submit" disabled={loading} style={{
              padding: '13px', borderRadius: 10, fontSize: '0.92rem', fontWeight: 800,
              background: loading ? '#E0E0E0' : 'var(--primary)', color: '#fff', border: 'none',
              boxShadow: loading ? 'none' : '0 3px 12px rgba(255,86,64,0.35)',
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {loading ? <><span style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}/> AI가 구성 중... (약 30초)</> : '✈️ AI 여행 일정 생성'}
            </button>
          </form>
        )}

        {/* ── AI 상세 탭 ── */}
        {tab === 'ai' && (
          <form onSubmit={handleAiSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* 국가 */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#333', marginBottom: 8 }}>여행 국가</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ code:'JP', flag:'🇯🇵', label:'일본' },{ code:'KR', flag:'🇰🇷', label:'국내' }].map(c => (
                  <button key={c.code} type="button" onClick={() => setAi(f => ({...f, countryCode: c.code}))} style={{
                    flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                    border: ai.countryCode === c.code ? '2px solid var(--primary)' : '1.5px solid #E0E0E0',
                    background: ai.countryCode === c.code ? '#FFF3F1' : '#fff',
                    color: ai.countryCode === c.code ? 'var(--primary)' : '#666', transition: 'all 0.15s',
                  }}>{c.flag} {c.label}</button>
                ))}
              </div>
            </div>

            {/* 출발지 */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#333', marginBottom: 6 }}>출발지</label>
              <AutocompleteInput value={ai.startLocation} onChange={v => setAi(f => ({...f, startLocation: v}))} options={DEPARTURE_OPTIONS} placeholder="인천국제공항..." required />
            </div>

            {/* 여행지 */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#333', marginBottom: 6 }}>여행지</label>
              <AutocompleteInput value={ai.endLocation} onChange={v => setAi(f => ({...f, endLocation: v}))}
                options={ai.countryCode === 'JP' ? DEST_JP : DEST_KR}
                placeholder={ai.countryCode === 'JP' ? '도쿄, 오사카, 삿포로...' : '부산, 제주, 강릉...'} required />
            </div>

            {/* 날짜 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {([['출발일','startDate'],['귀국일','endDate']] as const).map(([label, key]) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#333', marginBottom: 6 }}>{label}</label>
                  <input type="date" value={ai[key as keyof typeof ai] as string} required onChange={e => setAi(f => ({...f, [key]: e.target.value}))} style={inputSt}
                    onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                    onBlur={e => (e.target.style.borderColor = '#E0E0E0')} />
                </div>
              ))}
            </div>

            {/* 인원 */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#333', marginBottom: 6 }}>인원 수</label>
              <select value={ai.memberCount} onChange={e => setAi(f => ({...f, memberCount: Number(e.target.value)}))} style={{ ...inputSt, cursor: 'pointer' }}>
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}명{n===1?' (혼자)':n===2?' (커플)':''}</option>)}
              </select>
            </div>

            {/* 여행 스타일 */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#333', marginBottom: 8 }}>여행 스타일</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {TENDENCY_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setAi(f => ({...f, tendency: opt.value}))} style={{
                    padding: '12px 8px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                    border: ai.tendency === opt.value ? '2px solid var(--primary)' : '1.5px solid #E0E0E0',
                    background: ai.tendency === opt.value ? '#FFF3F1' : '#fff',
                    color: ai.tendency === opt.value ? 'var(--primary)' : '#666', transition: 'all 0.15s',
                  }}>
                    <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{opt.icon}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: 2 }}>{opt.label}</div>
                    <div style={{ fontSize: '0.62rem', color: '#999', lineHeight: 1.3 }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 렌트카 */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#333', marginBottom: 8 }}>이동 수단</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ val: false, label: '🚌 대중교통' }, { val: true, label: '🚗 렌트카' }].map(o => (
                  <button key={String(o.val)} type="button" onClick={() => setAi(f => ({...f, withCar: o.val}))} style={{
                    flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                    border: ai.withCar === o.val ? '2px solid var(--primary)' : '1.5px solid #E0E0E0',
                    background: ai.withCar === o.val ? '#FFF3F1' : '#fff',
                    color: ai.withCar === o.val ? 'var(--primary)' : '#666', transition: 'all 0.15s',
                  }}>{o.label}</button>
                ))}
              </div>
            </div>

            {/* 키워드 */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#333', marginBottom: 6 }}>키워드 <span style={{ fontWeight: 400, color: '#BBB' }}>(Enter로 추가)</span></label>
              {ai.keywords.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {ai.keywords.map(kw => (
                    <span key={kw} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: '#FFF3F1', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 600 }}>
                      {kw}
                      <button type="button" onClick={() => setAi(f => ({...f, keywords: f.keywords.filter(k => k !== kw)}))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 0, fontSize: '0.9rem' }}>×</button>
                    </span>
                  ))}
                </div>
              )}
              <input placeholder="야키니꾸, 스시, 온천..."
                value={ai.keywordInput} onChange={e => setAi(f => ({...f, keywordInput: e.target.value}))}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const kw = ai.keywordInput.trim(); if (kw && !ai.keywords.includes(kw)) setAi(f => ({...f, keywords: [...f.keywords, kw], keywordInput: ''})) }}}
                style={inputSt}
                onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.target.style.borderColor = '#E0E0E0')} />
            </div>

            {/* 항공편 시간 */}
            <div style={{ background: '#F8F8F8', borderRadius: 10, padding: '14px 14px', border: '1px solid #EBEBEB' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', marginBottom: 10 }}>✈️ 항공편 시간 <span style={{ fontWeight: 400, color: '#BBB' }}>(선택)</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[['출국 출발','departureFlightTime'],['현지 도착','arrivalAtDestTime'],['귀국 출발','returnFlightTime']].map(([label, key]) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, color: '#777', marginBottom: 4 }}>{label}</label>
                    <input type="time" value={ai[key as keyof typeof ai] as string} onChange={e => setAi(f => ({...f, [key]: e.target.value}))}
                      style={{ ...inputSt, fontSize: '0.82rem', padding: '8px 10px' }}
                      onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                      onBlur={e => (e.target.style.borderColor = '#E0E0E0')} />
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              padding: '13px', borderRadius: 10, fontSize: '0.92rem', fontWeight: 800,
              background: loading ? '#E0E0E0' : 'var(--primary)', color: '#fff', border: 'none',
              boxShadow: loading ? 'none' : '0 3px 12px rgba(255,86,64,0.35)',
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {loading ? <><span style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}/> AI가 일정 만드는 중... (약 30초)</> : `✨ AI 일정 생성 ${ai.withCar ? '🚗' : '🚌'}`}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
