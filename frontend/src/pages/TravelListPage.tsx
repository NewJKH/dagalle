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
      .then(d => setPlans(Array.isArray(d.data) ? d.data : (d.data?.content ?? [])))
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
      <div style={{ width: 88, flexShrink: 0, position: 'relative', overflow: 'hidden', background: '#F5F5F5' }}>
        {img
          ? <img src={img} alt={plan.endLocation} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', background: '#F0F0F0' }}>{emoji}</div>}
        {img && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)' }}/>}
        <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', fontSize: '1rem' }}>{emoji}</div>
      </div>
      <div style={{ flex: 1, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{plan.title}</h3>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: st.bg, color: st.color, flexShrink: 0 }}>{st.label}</span>
            {plan.isAiGenerated && <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#FFF3F1', color: 'var(--primary)', flexShrink: 0 }}>✨ AI</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#444' }}>{plan.startLocation} → {plan.endLocation}</span>
            <span style={{ fontSize: '0.78rem', color: '#999' }}>{formatDate(plan.startDate)} ~ {formatDate(plan.endDate)}</span>
            <span style={{ fontSize: '0.72rem', color: '#BBB', background: '#F5F5F5', padding: '2px 9px', borderRadius: 20 }}>{nightCount(plan.startDate, plan.endDate)}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {(plan.totalEstimatedCost ?? 0) > 0 && (
            <>
              <div style={{ fontSize: '0.65rem', color: '#BBB', marginBottom: 2 }}>예상 비용</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary)' }}>{(plan.totalEstimatedCost ?? 0).toLocaleString()}원</div>
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

/* ── 선호도 슬라이더 ── */
type Prefs = { food: number; accommodation: number; extreme: number; transport: number }

function PreferenceSliders({ prefs, setPrefs }: {
  prefs: Prefs
  setPrefs: React.Dispatch<React.SetStateAction<Prefs>>
}) {
  const items: { key: keyof Prefs; icon: string; label: string }[] = [
    { key: 'food',          icon: '🍜', label: '음식' },
    { key: 'accommodation', icon: '🏨', label: '숙박' },
    { key: 'extreme',       icon: '🎯', label: '익스트림' },
    { key: 'transport',     icon: '🚇', label: '이동' },
  ]
  return (
    <div style={{ background: '#F8F8F8', borderRadius: 10, padding: '14px', border: '1px solid #EBEBEB' }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', marginBottom: 12 }}>
        ⚙️ 항목별 선호도 <span style={{ fontWeight: 400, color: '#BBB' }}>(0 = 관심없음 / 10 = 최우선)</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(({ key, icon, label }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1rem', width: 22, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#444', width: 52, flexShrink: 0 }}>{label}</span>
            <input
              type="range" min={0} max={10} step={1}
              value={prefs[key]}
              onChange={e => setPrefs(p => ({ ...p, [key]: Number(e.target.value) }))}
              style={{ flex: 1, accentColor: 'var(--primary)', cursor: 'pointer', height: 4 }}
            />
            <span style={{
              fontSize: '0.82rem', fontWeight: 800, width: 28, textAlign: 'center', flexShrink: 0,
              color: prefs[key] >= 8 ? 'var(--primary)' : prefs[key] >= 5 ? '#0984E3' : '#888',
            }}>{prefs[key]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── 여행 생성 모달 (2단계) ── */
const CITIES_JP = ['도쿄','오사카','교토','삿포로','후쿠오카','나고야','오키나와','나라','고베','벳푸','유후인','히로시마','가나자와','하코네','요코하마']
const CITIES_KR = ['서울','부산','제주','강릉','경주','여수','전주','속초','통영','춘천']

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: TravelPlan) => void }) {
  const saved = readSearch()
  const today = new Date().toISOString().split('T')[0]

  // step 1: 국가/도시 선택 / step 2: 상세 설정
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [prefs, setPrefs]     = useState<Prefs>({ food: 5, accommodation: 5, extreme: 3, transport: 5 })

  const [form, setForm] = useState({
    countryCode:         'JP',
    endLocation:         saved.to || '',
    startLocation:       saved.from || '인천국제공항',
    startDate:           saved.startDate || '',
    endDate:             saved.endDate   || '',
    memberCount:         saved.members || 2,
    tendency:            'BALANCED',
    withCar:             false,
    keywords:            [] as string[],
    keywordInput:        '',
    departureFlightTime: '',
    arrivalAtDestTime:   '',
    returnFlightTime:    '',
  })

  const inputSt: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1.5px solid #E0E0E0', outline: 'none',
    fontSize: '0.88rem', color: '#1A1A1A', background: '#fff', transition: 'border-color 0.15s',
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.endLocation) { setError('여행지를 선택해주세요.'); return }
    if (!form.startDate || !form.endDate) { setError('날짜를 입력해주세요.'); return }
    setLoading(true); setError('')
    const token = localStorage.getItem('accessToken') || ''
    try {
      const res = await fetch('/api/v1/travels/ai/init', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          countryCode:         form.countryCode,
          startLocation:       form.startLocation,
          endLocation:         form.endLocation,
          startDate:           form.startDate,
          endDate:             form.endDate,
          memberCount:         form.memberCount,
          tendency:            form.tendency,
          withCar:             form.withCar,
          keywords:            form.keywords,
          departureFlightTime: form.departureFlightTime || null,
          arrivalAtDestTime:   form.arrivalAtDestTime   || null,
          returnFlightTime:    form.returnFlightTime     || null,
          foodScore:           prefs.food,
          accommodationScore:  prefs.accommodation,
          extremeScore:        prefs.extreme,
          transportScore:      prefs.transport,
        }),
      })
      const data = await res.json()
      if (res.ok && data.data) { sessionStorage.removeItem(SEARCH_KEY); onCreated({ ...data.data, totalEstimatedCost: 0 } as TravelPlan) }
      else setError(data.message || '생성에 실패했습니다.')
    } catch { setError('서버에 연결할 수 없습니다.') }
    finally { setLoading(false) }
  }

  const cities = form.countryCode === 'JP' ? CITIES_JP : CITIES_KR

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      {/* ── Step 1: 국가 + 도시 선택 ── */}
      {step === 1 && (
        <div style={{ background: '#fff', borderRadius: 24, padding: '28px 28px 24px', width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1A1A1A' }}>어디로 가고 싶으세요?</h2>
              <p style={{ fontSize: '0.78rem', color: '#999', marginTop: 3 }}>나라와 도시를 골라주세요</p>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E0E0E0', background: '#FAFAFA', cursor: 'pointer', fontSize: '0.9rem', color: '#888' }}>✕</button>
          </div>

          {/* 국가 탭 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[{ code:'JP', flag:'🇯🇵', label:'일본' },{ code:'KR', flag:'🇰🇷', label:'국내' }].map(c => (
              <button key={c.code} type="button"
                onClick={() => setForm(f => ({ ...f, countryCode: c.code, endLocation: '' }))}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer', fontWeight: 800, fontSize: '0.95rem',
                  border: form.countryCode === c.code ? '2px solid var(--primary)' : '1.5px solid #E0E0E0',
                  background: form.countryCode === c.code ? '#FFF3F1' : '#FAFAFA',
                  color: form.countryCode === c.code ? 'var(--primary)' : '#666', transition: 'all 0.15s',
                }}>{c.flag} {c.label}</button>
            ))}
          </div>

          {/* 도시 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
            {cities.map(city => {
              const sel = form.endLocation === city
              return (
                <button key={city} type="button"
                  onClick={() => setForm(f => ({ ...f, endLocation: city }))}
                  style={{
                    padding: '10px 6px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                    border: sel ? '2px solid var(--primary)' : '1.5px solid #EBEBEB',
                    background: sel ? '#FFF3F1' : '#FAFAFA',
                    color: sel ? 'var(--primary)' : '#444', transition: 'all 0.12s',
                  }}>{DEST_EMOJI[city] ?? '📍'} {city}</button>
              )
            })}
          </div>

          <button
            disabled={!form.endLocation}
            onClick={() => { if (form.endLocation) setStep(2) }}
            style={{
              width: '100%', padding: '13px', borderRadius: 12, fontSize: '0.95rem', fontWeight: 800,
              background: form.endLocation ? 'var(--primary)' : '#E0E0E0',
              color: '#fff', border: 'none',
              boxShadow: form.endLocation ? '0 4px 14px rgba(255,86,64,0.35)' : 'none',
              cursor: form.endLocation ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
            }}>
            {form.endLocation ? `${DEST_EMOJI[form.endLocation] ?? '✈️'} ${form.endLocation} 선택 →` : '도시를 선택하세요'}
          </button>
        </div>
      )}

      {/* ── Step 2: 상세 설정 ── */}
      {step === 2 && (
        <div style={{ background: '#fff', borderRadius: 20, padding: '28px 28px 24px', width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <button onClick={() => setStep(1)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E0E0E0', background: '#FAFAFA', cursor: 'pointer', fontSize: '0.9rem', color: '#666' }}>←</button>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1A1A1A' }}>
                {DEST_EMOJI[form.endLocation] ?? '✈️'} {form.endLocation} 여행 설정
              </h2>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E0E0E0', background: '#FAFAFA', cursor: 'pointer', fontSize: '0.9rem', color: '#888' }}>✕</button>
          </div>

          {error && (
            <div style={{ background: '#FFF3F1', border: '1px solid #FFBDB5', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#333', marginBottom: 6 }}>출발일</label>
                <input type="date" value={form.startDate} required min={today}
                  onChange={e => { const d = e.target.value; setForm(f => ({ ...f, startDate: d, endDate: f.endDate && f.endDate < d ? '' : f.endDate })) }}
                  style={inputSt} onFocus={e => (e.target.style.borderColor='var(--primary)')} onBlur={e => (e.target.style.borderColor='#E0E0E0')} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#333', marginBottom: 6 }}>귀국일</label>
                <input type="date" value={form.endDate} required min={form.startDate || today}
                  onChange={e => setForm(f => ({...f, endDate: e.target.value}))}
                  style={inputSt} onFocus={e => (e.target.style.borderColor='var(--primary)')} onBlur={e => (e.target.style.borderColor='#E0E0E0')} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#333', marginBottom: 6 }}>인원</label>
                <select value={form.memberCount} onChange={e => setForm(f => ({...f, memberCount: Number(e.target.value)}))} style={{ ...inputSt, cursor: 'pointer' }}>
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}명{n===1?' (혼자)':n===2?' (커플)':''}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#333', marginBottom: 6 }}>이동 수단</label>
                <div style={{ display: 'flex', gap: 6, height: 44 }}>
                  {[{ val: false, label: '🚌 대중교통' }, { val: true, label: '🚗 렌트카' }].map(o => (
                    <button key={String(o.val)} type="button" onClick={() => setForm(f => ({...f, withCar: o.val}))} style={{
                      flex: 1, borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem',
                      border: form.withCar === o.val ? '2px solid var(--primary)' : '1.5px solid #E0E0E0',
                      background: form.withCar === o.val ? '#FFF3F1' : '#fff',
                      color: form.withCar === o.val ? 'var(--primary)' : '#666',
                    }}>{o.label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* 여행 스타일 */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#333', marginBottom: 8 }}>여행 스타일</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {TENDENCY_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setForm(f => ({...f, tendency: opt.value}))} style={{
                    padding: '10px 6px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                    border: form.tendency === opt.value ? '2px solid var(--primary)' : '1.5px solid #E0E0E0',
                    background: form.tendency === opt.value ? '#FFF3F1' : '#fff',
                    color: form.tendency === opt.value ? 'var(--primary)' : '#666',
                  }}>
                    <div style={{ fontSize: '1.1rem', marginBottom: 3 }}>{opt.icon}</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700 }}>{opt.label}</div>
                    <div style={{ fontSize: '0.58rem', color: '#999', lineHeight: 1.3, marginTop: 2 }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <PreferenceSliders prefs={prefs} setPrefs={setPrefs} />

            {/* 키워드 */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#333', marginBottom: 6 }}>키워드 <span style={{ fontWeight: 400, color: '#BBB' }}>(Enter로 추가)</span></label>
              {form.keywords.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 7 }}>
                  {form.keywords.map(kw => (
                    <span key={kw} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 20, background: '#FFF3F1', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600 }}>
                      {kw}
                      <button type="button" onClick={() => setForm(f => ({...f, keywords: f.keywords.filter(k => k !== kw)}))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 0 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
              <input placeholder="온천, 라멘, 야경..."
                value={form.keywordInput} onChange={e => setForm(f => ({...f, keywordInput: e.target.value}))}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const kw = form.keywordInput.trim(); if (kw && !form.keywords.includes(kw)) setForm(f => ({...f, keywords: [...f.keywords, kw], keywordInput: ''})) }}}
                style={inputSt} onFocus={e => (e.target.style.borderColor='var(--primary)')} onBlur={e => (e.target.style.borderColor='#E0E0E0')} />
            </div>

            {/* 항공편 */}
            <div style={{ background: '#F8F8F8', borderRadius: 10, padding: '12px 14px', border: '1px solid #EBEBEB' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555', marginBottom: 8 }}>✈️ 항공편 시간 <span style={{ fontWeight: 400, color: '#BBB' }}>(선택)</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[['출국 출발','departureFlightTime'],['현지 도착','arrivalAtDestTime'],['귀국 출발','returnFlightTime']].map(([label, key]) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, color: '#777', marginBottom: 4 }}>{label}</label>
                    <input type="time" value={form[key as keyof typeof form] as string}
                      onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
                      style={{ ...inputSt, fontSize: '0.8rem', padding: '7px 8px' }}
                      onFocus={e => (e.target.style.borderColor='var(--primary)')} onBlur={e => (e.target.style.borderColor='#E0E0E0')} />
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
              {loading
                ? <><span style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}/> 여행 만드는 중...</>
                : `✨ ${form.endLocation} 여행 만들기`}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
