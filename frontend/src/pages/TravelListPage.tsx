import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { DEST_EMOJI, DEST_IMG } from '../constants/locations'

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

function nightCount(start: string, end: string) {
  const d = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000)
  return `${d}박 ${d + 1}일`
}
function formatDate(str: string) {
  const [y, m, d] = str.split('-')
  return `${y}.${m}.${d}`
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

/* ── 마법사 모달 상태 ── */
const CITIES_JP = ['도쿄','오사카','교토','삿포로','후쿠오카','나고야','오키나와','나라','고베','벳푸','유후인','히로시마','가나자와','하코네','요코하마']
const CITIES_KR = ['서울','부산','제주','강릉','경주','여수','전주','속초','통영','춘천']

interface WizardState {
  countryCode: string
  endLocation: string
  startDate: string
  endDate: string
  memberCount: number
  withCar: boolean
  tendency: string
  foodScore: number
  accommodationScore: number
  extremeScore: number
  keywords: string[]
}

type PillAnswer = 'yes' | 'no' | 'unsure' | null

const MEMBER_TILES = [
  { count: 1, icon: '🙋', label: '혼자', sub: '1명' },
  { count: 2, icon: '💑', label: '둘이서', sub: '2명' },
  { count: 3, icon: '👫', label: '셋이서', sub: '3명' },
  { count: 4, icon: '👨‍👩‍👧‍👦', label: '넷이서', sub: '4명' },
  { count: 5, icon: '🧑‍🤝‍🧑', label: '다섯이서', sub: '5명' },
  { count: 6, icon: '🎉', label: '여섯이서+', sub: '6명' },
]

const ACCOM_TILES = [
  { score: 2,  icon: '💸', label: '저렴하게',  sub: '게스트하우스·캡슐호텔' },
  { score: 5,  icon: '😊', label: '적당하게',  sub: '비즈니스호텔·3성급' },
  { score: 7,  icon: '✨', label: '편안하게',  sub: '고급호텔·4성급' },
  { score: 10, icon: '👑', label: '럭셔리하게', sub: '5성급·료칸·리조트' },
]

const PILL_OPTIONS = [
  { key: 'yes',    label: '✅ 예' },
  { key: 'no',     label: '❌ 아니오' },
  { key: 'unsure', label: '🤷 잘 모르겠어요' },
] as const

function calcNights(start: string, end: string): number {
  if (!start || !end) return 0
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000))
}

/* ── 여행 생성 마법사 모달 ── */
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: TravelPlan) => void }) {
  const today = new Date().toISOString().split('T')[0]
  const TOTAL_STEPS = 9 // 0..9 (step 9 = summary)

  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const [wizard, setWizard] = useState<WizardState>({
    countryCode: 'JP',
    endLocation: '',
    startDate: '',
    endDate: '',
    memberCount: 2,
    withCar: false,
    tendency: 'BALANCED',
    foodScore: 5,
    accommodationScore: 5,
    extremeScore: 4,
    keywords: [],
  })

  // per-step pill answers (for render state tracking)
  const [carAnswer,       setCarAnswer]       = useState<PillAnswer>(null)
  const [activityAnswer,  setActivityAnswer]  = useState<PillAnswer>(null)
  const [foodAnswer,      setFoodAnswer]       = useState<PillAnswer>(null)
  const [cultureAnswer,   setCultureAnswer]   = useState<PillAnswer>(null)
  const [adventureAnswer, setAdventureAnswer] = useState<PillAnswer>(null)
  const [accomScore,      setAccomScore]      = useState<number | null>(null)

  const nights = calcNights(wizard.startDate, wizard.endDate)
  const days   = nights + 1

  const goNext = () => setStep(s => Math.min(s + 1, TOTAL_STEPS))
  const goBack = () => setStep(s => Math.max(s - 1, 0))
  // 선택 후 자동으로 다음 단계로 (스무고개 느낌)
  const autoNext = (delay = 280) => setTimeout(() => setStep(s => Math.min(s + 1, TOTAL_STEPS)), delay)

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    const token = localStorage.getItem('accessToken') || ''
    try {
      const res = await fetch('/api/v1/travels/ai/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          countryCode:         wizard.countryCode,
          startLocation:       '인천국제공항',
          endLocation:         wizard.endLocation,
          startDate:           wizard.startDate,
          endDate:             wizard.endDate,
          memberCount:         wizard.memberCount,
          tendency:            wizard.tendency,
          withCar:             wizard.withCar,
          keywords:            wizard.keywords,
          foodScore:           wizard.foodScore,
          accommodationScore:  wizard.accommodationScore,
          extremeScore:        wizard.extremeScore,
          transportScore:      5,
          departureFlightTime: null,
          arrivalAtDestTime:   null,
          returnFlightTime:    null,
        }),
      })
      const data = await res.json()
      if (res.ok && data.data) {
        onCreated({ ...data.data, totalEstimatedCost: 0 } as TravelPlan)
      } else {
        setError(data.message || '생성에 실패했습니다.')
      }
    } catch {
      setError('서버에 연결할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const cities = wizard.countryCode === 'JP' ? CITIES_JP : CITIES_KR

  // shared styles
  const pillBase: React.CSSProperties = {
    flex: 1, padding: '14px 20px', borderRadius: 50, fontSize: '0.95rem', fontWeight: 700,
    border: '2px solid #E0E0E0', background: '#fff', color: '#444',
    cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center',
  }
  const pillSelected: React.CSSProperties = {
    ...pillBase,
    border: '2px solid var(--primary)',
    background: '#FFF3F1',
    color: 'var(--primary)',
  }
  const tileBase: React.CSSProperties = {
    padding: '16px 12px', borderRadius: 14, border: '2px solid #E0E0E0',
    background: '#fff', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
  }
  const tileSelected: React.CSSProperties = {
    ...tileBase,
    border: '2px solid var(--primary)',
    background: '#FFF3F1',
  }

  const progressPct = (step / TOTAL_STEPS) * 100

  const summaryItems = [
    { label: '여행지', value: `${DEST_EMOJI[wizard.endLocation] ?? '✈️'} ${wizard.endLocation}` },
    { label: '기간', value: wizard.startDate && wizard.endDate ? `${wizard.startDate} ~ ${wizard.endDate} (${nights}박${days}일)` : '-' },
    { label: '인원', value: `${wizard.memberCount}명` },
    { label: '이동수단', value: wizard.withCar ? '렌트카' : '대중교통' },
    { label: '여행 스타일', value: wizard.tendency === 'ACTIVE' ? '빡빡하게' : wizard.tendency === 'RELAX' ? '여유롭게' : '균형있게' },
    { label: '맛집 중요도', value: wizard.foodScore >= 8 ? '높음' : wizard.foodScore <= 4 ? '낮음' : '보통' },
    { label: '문화명소', value: wizard.keywords.includes('문화·역사') ? '즐김' : wizard.keywords.includes('로컬체험') ? '로컬체험 선호' : '상관없음' },
    { label: '숙박 수준', value: wizard.accommodationScore <= 3 ? '저렴' : wizard.accommodationScore <= 6 ? '적당' : wizard.accommodationScore <= 8 ? '편안' : '럭셔리' },
    { label: '액티비티', value: wizard.extremeScore >= 8 ? '즐김' : wizard.extremeScore <= 2 ? '패스' : '중간' },
  ]

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)', zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        background: '#fff', borderRadius: 24, width: '100%', maxWidth: 480,
        boxShadow: '0 32px 80px rgba(0,0,0,0.25)', overflow: 'hidden',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        animation: 'slideIn 0.25s ease',
      }}>
        {/* Progress bar */}
        <div style={{ height: 4, background: '#F0F0F0', flexShrink: 0 }}>
          <div style={{
            height: '100%', background: 'var(--primary)',
            width: `${progressPct}%`, transition: 'width 0.3s ease',
            borderRadius: '0 2px 2px 0',
          }} />
        </div>

        {/* Header row */}
        {(() => {
          const STEP_LABELS = ['목적지','날짜','인원','렌트카','활동량','맛집','문화','숙박','액티비티','요약']
          return (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px 0', flexShrink: 0,
            }}>
              {step > 0 ? (
                <button
                  onClick={goBack}
                  style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E0E0E0', background: '#FAFAFA', cursor: 'pointer', fontSize: '1rem', color: '#666' }}
                >←</button>
              ) : (
                <div style={{ width: 32 }} />
              )}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: step < TOTAL_STEPS ? 'var(--primary)' : '#059669' }}>
                  {step < TOTAL_STEPS ? STEP_LABELS[step] : '완성!'}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#CCC', marginTop: 1 }}>
                  {step < TOTAL_STEPS ? `${step + 1} / ${TOTAL_STEPS}` : '🎉'}
                </div>
              </div>
              <button
                onClick={onClose}
                style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E0E0E0', background: '#FAFAFA', cursor: 'pointer', fontSize: '0.9rem', color: '#888' }}
              >✕</button>
            </div>
          )
        })()}

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px 28px' }}>

          {/* ── Step 0: 목적지 ── */}
          {step === 0 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1A1A1A', marginBottom: 6, letterSpacing: '-0.02em' }}>
                어디로 여행을 가고 싶으신가요? 🌏
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: 20 }}>나라와 도시를 선택해주세요</p>

              {/* 국가 탭 */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[{ code: 'JP', flag: '🇯🇵', label: '일본' }, { code: 'KR', flag: '🇰🇷', label: '국내' }].map(c => (
                  <button key={c.code} type="button"
                    onClick={() => setWizard(w => ({ ...w, countryCode: c.code, endLocation: '' }))}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer', fontWeight: 800, fontSize: '0.95rem',
                      border: wizard.countryCode === c.code ? '2px solid var(--primary)' : '1.5px solid #E0E0E0',
                      background: wizard.countryCode === c.code ? '#FFF3F1' : '#FAFAFA',
                      color: wizard.countryCode === c.code ? 'var(--primary)' : '#666', transition: 'all 0.15s',
                    }}>{c.flag} {c.label}</button>
                ))}
              </div>

              {/* 도시 그리드 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
                {cities.map(city => {
                  const sel = wizard.endLocation === city
                  return (
                    <button key={city} type="button"
                      onClick={() => {
                        setWizard(w => ({ ...w, endLocation: city }))
                        autoNext(320)
                      }}
                      style={{
                        padding: '12px 6px', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                        border: sel ? '2px solid var(--primary)' : '1.5px solid #EBEBEB',
                        background: sel ? '#FFF3F1' : '#FAFAFA',
                        color: sel ? 'var(--primary)' : '#444', transition: 'all 0.15s',
                        boxShadow: sel ? '0 2px 8px rgba(255,86,64,0.2)' : 'none',
                      }}>{DEST_EMOJI[city] ?? '📍'} {city}</button>
                  )
                })}
              </div>
              <p style={{ fontSize: '0.72rem', color: '#CCC', textAlign: 'center', marginTop: 4 }}>도시를 선택하면 자동으로 넘어가요</p>
            </div>
          )}

          {/* ── Step 1: 날짜 ── */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1A1A1A', marginBottom: 6, letterSpacing: '-0.02em' }}>
                언제 떠나실 건가요? 📅
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: 24 }}>출발일과 귀국일을 선택해주세요</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#333', marginBottom: 6 }}>출발일</label>
                  <input type="date" value={wizard.startDate} min={today}
                    onChange={e => {
                      const d = e.target.value
                      setWizard(w => ({ ...w, startDate: d, endDate: w.endDate && w.endDate <= d ? '' : w.endDate }))
                    }}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E0E0E0', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#333', marginBottom: 6 }}>귀국일</label>
                  <input type="date" value={wizard.endDate} min={wizard.startDate || today}
                    onChange={e => setWizard(w => ({ ...w, endDate: e.target.value }))}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E0E0E0', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {nights > 0 && (
                <div style={{ background: '#FFF3F1', borderRadius: 10, padding: '12px 16px', marginBottom: 20, textAlign: 'center' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>🗓️ {nights}박 {days}일</span>
                </div>
              )}

              <button
                disabled={!wizard.startDate || !wizard.endDate}
                onClick={() => wizard.startDate && wizard.endDate && goNext()}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12, fontSize: '0.95rem', fontWeight: 800,
                  background: wizard.startDate && wizard.endDate ? 'var(--primary)' : '#E0E0E0',
                  color: '#fff', border: 'none',
                  cursor: wizard.startDate && wizard.endDate ? 'pointer' : 'not-allowed',
                }}
              >다음 →</button>
            </div>
          )}

          {/* ── Step 2: 인원 ── */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1A1A1A', marginBottom: 6, letterSpacing: '-0.02em' }}>
                몇 분이서 가시나요? 👥
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: 24 }}>인원에 맞춰 일정을 구성해드려요</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
                {MEMBER_TILES.map(m => {
                  const sel = wizard.memberCount === m.count
                  return (
                    <button key={m.count} type="button"
                      onClick={() => { setWizard(w => ({ ...w, memberCount: m.count })); autoNext() }}
                      style={sel ? tileSelected : tileBase}
                    >
                      <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>{m.icon}</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: sel ? 'var(--primary)' : '#333' }}>{m.label}</div>
                      <div style={{ fontSize: '0.7rem', color: sel ? 'var(--primary)' : '#999', marginTop: 2 }}>{m.sub}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Step 3: 렌트카 ── */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1A1A1A', marginBottom: 6, letterSpacing: '-0.02em' }}>
                렌트카를 이용할 예정인가요? 🚗
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: 28 }}>렌트카면 더 자유로운 동선으로 일정을 짤 수 있어요</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
                {PILL_OPTIONS.map(opt => {
                  const sel = carAnswer === opt.key
                  return (
                    <button key={opt.key} type="button"
                      onClick={() => {
                        setCarAnswer(opt.key)
                        setWizard(w => ({ ...w, withCar: opt.key === 'yes' }))
                        autoNext()
                      }}
                      style={sel ? pillSelected : pillBase}
                    >{opt.label}</button>
                  )
                })}
              </div>
              <p style={{ fontSize: '0.72rem', color: '#CCC', textAlign: 'center', marginBottom: 8 }}>선택하면 자동으로 다음으로 넘어가요</p>
            </div>
          )}

          {/* ── Step 4: 활동량 ── */}
          {step === 4 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1A1A1A', marginBottom: 6, letterSpacing: '-0.02em' }}>
                {wizard.memberCount === 1
                  ? '혼자서 이곳저곳 돌아다니는 걸 즐기시나요? 🚶'
                  : '다같이 여기저기 돌아다니는 걸 좋아하시나요? 🏃'}
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: 28 }}>여행 스타일에 맞게 일정 밀도를 조정해요</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
                {PILL_OPTIONS.map(opt => {
                  const sel = activityAnswer === opt.key
                  return (
                    <button key={opt.key} type="button"
                      onClick={() => {
                        setActivityAnswer(opt.key)
                        setWizard(w => ({
                          ...w,
                          tendency: opt.key === 'yes' ? 'ACTIVE' : opt.key === 'no' ? 'RELAX' : 'BALANCED',
                        }))
                        autoNext()
                      }}
                      style={sel ? pillSelected : pillBase}
                    >{opt.label}</button>
                  )
                })}
              </div>
              <p style={{ fontSize: '0.72rem', color: '#CCC', textAlign: 'center', marginBottom: 8 }}>선택하면 자동으로 다음으로 넘어가요</p>
            </div>
          )}

          {/* ── Step 5: 음식 ── */}
          {step === 5 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1A1A1A', marginBottom: 6, letterSpacing: '-0.02em' }}>
                맛집 탐방을 중요하게 생각하시나요? 🍜
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: 28 }}>음식 중심의 여행을 원하시면 현지 맛집 위주로 일정을 짤게요</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
                {PILL_OPTIONS.map(opt => {
                  const sel = foodAnswer === opt.key
                  return (
                    <button key={opt.key} type="button"
                      onClick={() => {
                        setFoodAnswer(opt.key)
                        setWizard(w => ({
                          ...w,
                          foodScore: opt.key === 'yes' ? 9 : opt.key === 'no' ? 3 : 5,
                        }))
                        autoNext()
                      }}
                      style={sel ? pillSelected : pillBase}
                    >{opt.label}</button>
                  )
                })}
              </div>
              <p style={{ fontSize: '0.72rem', color: '#CCC', textAlign: 'center', marginBottom: 8 }}>선택하면 자동으로 다음으로 넘어가요</p>
            </div>
          )}

          {/* ── Step 6: 문화 ── */}
          {step === 6 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1A1A1A', marginBottom: 6, letterSpacing: '-0.02em' }}>
                박물관·신사 같은 문화 명소를 즐기시나요? 🏯
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: 28 }}>문화·역사 명소 중심 vs 로컬 체험·상점가 위주를 선택해주세요</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
                {PILL_OPTIONS.map(opt => {
                  const sel = cultureAnswer === opt.key
                  return (
                    <button key={opt.key} type="button"
                      onClick={() => {
                        setCultureAnswer(opt.key)
                        setWizard(w => {
                          const kws = w.keywords.filter(k => k !== '문화·역사' && k !== '로컬체험')
                          if (opt.key === 'yes') kws.push('문화·역사')
                          else if (opt.key === 'no') kws.push('로컬체험')
                          return { ...w, keywords: kws }
                        })
                        autoNext()
                      }}
                      style={sel ? pillSelected : pillBase}
                    >{opt.label}</button>
                  )
                })}
              </div>
              <p style={{ fontSize: '0.72rem', color: '#CCC', textAlign: 'center', marginBottom: 8 }}>선택하면 자동으로 다음으로 넘어가요</p>
            </div>
          )}

          {/* ── Step 7: 숙박 ── */}
          {step === 7 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1A1A1A', marginBottom: 6, letterSpacing: '-0.02em' }}>
                숙박은 어느 정도를 원하시나요? 🏨
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: 24 }}>예산과 취향에 맞게 선택해주세요</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 28 }}>
                {ACCOM_TILES.map(a => {
                  const sel = accomScore === a.score
                  return (
                    <button key={a.score} type="button"
                      onClick={() => {
                        setAccomScore(a.score)
                        setWizard(w => ({ ...w, accommodationScore: a.score }))
                        autoNext()
                      }}
                      style={sel ? tileSelected : tileBase}
                    >
                      <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>{a.icon}</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: sel ? 'var(--primary)' : '#333' }}>{a.label}</div>
                      <div style={{ fontSize: '0.7rem', color: sel ? 'var(--primary)' : '#999', marginTop: 3, lineHeight: 1.4 }}>{a.sub}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Step 8: 액티비티 ── */}
          {step === 8 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1A1A1A', marginBottom: 6, letterSpacing: '-0.02em' }}>
                번지점프·서핑 같은 액티비티를 즐기시나요? 🎯
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: 28 }}>익스트림 활동을 일정에 포함할지 결정해요</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
                {PILL_OPTIONS.map(opt => {
                  const sel = adventureAnswer === opt.key
                  return (
                    <button key={opt.key} type="button"
                      onClick={() => {
                        setAdventureAnswer(opt.key)
                        setWizard(w => ({
                          ...w,
                          extremeScore: opt.key === 'yes' ? 9 : opt.key === 'no' ? 1 : 4,
                        }))
                        autoNext()
                      }}
                      style={sel ? pillSelected : pillBase}
                    >{opt.label}</button>
                  )
                })}
              </div>
              <p style={{ fontSize: '0.72rem', color: '#CCC', textAlign: 'center', marginBottom: 8 }}>선택하면 자동으로 다음으로 넘어가요</p>
            </div>
          )}

          {/* ── Step 9: 요약 ── */}
          {step === 9 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1A1A1A', marginBottom: 6, letterSpacing: '-0.02em' }}>
                이렇게 하면 어떨까요! ✨
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: 20 }}>선택하신 내용을 확인해주세요</p>

              {/* Summary card */}
              <div style={{
                background: '#FAFAFA', borderRadius: 16, border: '1px solid #F0F0F0',
                padding: '20px', marginBottom: 20,
              }}>
                {summaryItems.map(item => (
                  <div key={item.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', borderBottom: '1px solid #F0F0F0',
                  }}>
                    <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600 }}>{item.label}</span>
                    <span style={{ fontSize: '0.85rem', color: '#1A1A1A', fontWeight: 700 }}>{item.value}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div style={{ background: '#FFF3F1', border: '1px solid #FFBDB5', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 500 }}>
                  ⚠️ {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  width: '100%', padding: '16px', borderRadius: 12, fontSize: '1rem', fontWeight: 800,
                  background: loading ? '#E0E0E0' : 'var(--primary)', color: '#fff', border: 'none',
                  boxShadow: loading ? 'none' : '0 4px 16px rgba(255,86,64,0.4)',
                  cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  marginBottom: 14,
                }}
              >
                {loading
                  ? <><span style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}/> 여행 만드는 중...</>
                  : '✨ 이 일정으로 만들기!'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={() => setStep(0)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', color: '#AAA', textDecoration: 'underline' }}
                >
                  ← 처음부터
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
