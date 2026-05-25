import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import AutocompleteInput from '../components/AutocompleteInput'
import { DEPARTURE_OPTIONS, ALL_DEST, DEST_EMOJI } from '../constants/locations'
import { SAMPLE_ITINERARIES, SampleItinerary, SampleRoute } from '../constants/sampleItineraries'

// sessionStorage key — CreateModal이 읽어서 pre-fill
const SEARCH_KEY = 'dagalle_search'

const QUICK_TAGS = [
  { label: '🗼 도쿄 3박', to: '도쿄', days: 4 },
  { label: '🌿 제주 2박', to: '제주', days: 3 },
  { label: '🏯 오사카 4박', to: '오사카', days: 5 },
  { label: '🌊 다낭 5박', to: '다낭', days: 6 },
  { label: '🍜 후쿠오카 2박', to: '후쿠오카', days: 3 },
]

const POPULAR = [
  { img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80', name: '도쿄', country: '일본 🇯🇵', price: '89만원~', rating: '4.8', tags: ['미식','쇼핑','4박5일'] },
  { img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80', name: '제주', country: '국내 🇰🇷', price: '32만원~', rating: '4.7', tags: ['힐링','자연','2박3일'] },
  { img: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=600&q=80', name: '다낭', country: '베트남 🇻🇳', price: '69만원~', rating: '4.6', tags: ['리조트','해변','4박5일'] },
  { img: 'https://images.unsplash.com/photo-1583400212045-a2bde5b5efba?w=600&q=80', name: '부산', country: '국내 🇰🇷', price: '19만원~', rating: '4.6', tags: ['바다','미식','1박2일'] },
  { img: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=600&q=80', name: '오사카', country: '일본 🇯🇵', price: '78만원~', rating: '4.7', tags: ['미식','쇼핑','3박4일'] },
  { img: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=600&q=80', name: '방콕', country: '태국 🇹🇭', price: '74만원~', rating: '4.5', tags: ['사원','야시장','4박5일'] },
]

const STATS = [
  { num: '50,000+', label: '생성된 여행 일정' },
  { num: '4.8', label: '평균 만족도' },
  { num: '70초', label: '일정 생성 시간' },
  { num: '30+', label: '지원 여행지' },
]

// ── 샘플 일정 타임라인 헬퍼 ────────────────────────────
function addMins(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
function diffMins(from: string, to: string): number {
  const [fh, fm] = from.split(':').map(Number)
  const [th, tm] = to.split(':').map(Number)
  return (th * 60 + tm) - (fh * 60 + fm)
}
function bufferMins(type: string): number {
  switch (type) {
    case 'RESTAURANT': return 20
    case 'MUSEUM':     return 30
    case 'CAFE':       return 15
    case 'SHOPPING':   return 20
    case 'PARK':       return 20
    default:           return 10
  }
}
function trafficBuf(transport: string, duration: number): number {
  if (transport !== 'CAR') return 0
  if (duration < 15)  return 0
  if (duration < 40)  return 10
  if (duration < 90)  return 15
  if (duration < 150) return 20
  return 30
}
const TYPE_ICON: Record<string, string> = {
  RESTAURANT: '🍽️', CAFE: '☕', MUSEUM: '🏛️', PARK: '🌿',
  HOTEL: '🏨', STATION: '🚉', AIRPORT: '✈️', SHOPPING: '🛍️', ETC: '📍',
}
const TRANS_ICON: Record<string, string> = {
  WALK: '🚶', SUBWAY: '🚇', BUS: '🚌', TRAIN: '🚆', CAR: '🚗',
}
const TRANS_LABEL: Record<string, string> = {
  WALK: '도보', SUBWAY: '지하철', BUS: '버스', TRAIN: '기차', CAR: '자동차',
}

// ── 샘플 일정 미리보기 모달 ──────────────────────────────
function SampleModal({ itinerary, onClose }: { itinerary: SampleItinerary; onClose: () => void }) {
  const [activeDay, setActiveDay] = useState(1)
  const day = itinerary.schedule.find(d => d.dayNumber === activeDay)!

  // 장소 목록 추출
  const places = day.routes.length > 0
    ? [day.routes[0].from, ...day.routes.map(r => r.to)]
    : []

  // esc 로 닫기
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 820,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)', overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        {/* ── 모달 헤더 ── */}
        <div style={{
          position: 'relative', height: 180, flexShrink: 0, overflow: 'hidden',
        }}>
          <img src={itinerary.imageUrl} alt={itinerary.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)' }} />
          <button onClick={onClose} style={{
            position: 'absolute', top: 14, right: 14,
            width: 34, height: 34, borderRadius: '50%', border: 'none',
            background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: '1.1rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
          <div style={{ position: 'absolute', bottom: 16, left: 20, right: 20 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {itinerary.tags.map(t => (
                <span key={t} style={{ fontSize: '0.68rem', background: 'rgba(255,255,255,0.22)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>{t}</span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>{itinerary.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                  🗓️ {itinerary.nights}박{itinerary.days}일 &nbsp;·&nbsp; {itinerary.transport}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.65)' }}>예상 비용</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FFD966' }}>{itinerary.estimatedCost}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 일차 탭 ── */}
        <div style={{ display: 'flex', borderBottom: '1px solid #F0F0F0', padding: '0 4px', flexShrink: 0, overflowX: 'auto' }}>
          {itinerary.schedule.map(d => (
            <button key={d.dayNumber} onClick={() => setActiveDay(d.dayNumber)} style={{
              padding: '10px 16px', fontSize: '0.78rem', fontWeight: 700, border: 'none',
              background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              color: activeDay === d.dayNumber ? 'var(--primary)' : '#888',
              borderBottom: activeDay === d.dayNumber ? '2.5px solid var(--primary)' : '2.5px solid transparent',
              transition: 'all 0.15s',
            }}>{d.dayNumber}일차</button>
          ))}
        </div>

        {/* ── 일차 레이블 ── */}
        <div style={{ padding: '12px 20px 4px', flexShrink: 0 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#444' }}>{day.label}</div>
        </div>

        {/* ── 타임라인 ── */}
        <div style={{ overflowY: 'auto', padding: '4px 20px 24px', flex: 1 }}>
          {places.map((place, pi) => {
            const prevRoute: SampleRoute | undefined = day.routes[pi - 1]
            const nextRoute: SampleRoute | undefined = day.routes[pi]

            // 도착 시각 = 이전 route 출발 + 이동시간
            const arrivalTime = pi === 0 ? null : addMins(prevRoute.departureTime, prevRoute.durationMinutes)
            // 출발 시각
            const departureTime = nextRoute?.departureTime ?? null
            // 체류 시간 = 출발 - 도착
            const stayMins = arrivalTime && departureTime ? diffMins(arrivalTime, departureTime) : null
            const buf = bufferMins(place.type)

            return (
              <div key={pi}>
                {/* 장소 카드 */}
                <div style={{
                  background: '#FAFAFA', borderRadius: 12, border: '1px solid #EBEBEB',
                  padding: '14px 16px', marginBottom: 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    {/* 아이콘 */}
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, background: '#fff',
                      border: '1.5px solid #E8E8E8', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0,
                    }}>{TYPE_ICON[place.type] ?? '📍'}</div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1A1A1A' }}>{place.name}</span>
                        <span style={{ fontSize: '0.65rem', background: '#F0F0F0', color: '#666', padding: '1px 6px', borderRadius: 3, fontWeight: 600 }}>{place.type}</span>
                      </div>

                      {/* 시간 정보 */}
                      <div style={{ display: 'flex', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
                        {pi === 0 && departureTime && (
                          <span style={{ fontSize: '0.72rem', color: '#888', background: '#F5F5F5', padding: '2px 8px', borderRadius: 4 }}>
                            🕐 {departureTime} 출발
                          </span>
                        )}
                        {arrivalTime && (
                          <span style={{ fontSize: '0.72rem', color: '#3B82F6', background: '#EFF6FF', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                            도착 {arrivalTime}
                          </span>
                        )}
                        {stayMins !== null && stayMins > 0 && (
                          <span style={{ fontSize: '0.72rem', color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                            체류 {stayMins}분 {stayMins < buf ? `⚠️ 여유 부족` : `(+${buf}분 이동 준비)`}
                          </span>
                        )}
                        {departureTime && pi > 0 && (
                          <span style={{ fontSize: '0.72rem', color: '#888', background: '#F5F5F5', padding: '2px 8px', borderRadius: 4 }}>
                            {departureTime} 출발
                          </span>
                        )}
                        {pi === places.length - 1 && (
                          <span style={{ fontSize: '0.72rem', color: '#9CA3AF', background: '#F9FAFB', padding: '2px 8px', borderRadius: 4 }}>
                            도착 완료
                          </span>
                        )}
                      </div>

                      {/* 설명 */}
                      {place.description && (
                        <div style={{ fontSize: '0.76rem', color: '#666', lineHeight: 1.55, marginTop: 6 }}>
                          {place.description}
                        </div>
                      )}
                      {place.address && (
                        <div style={{ fontSize: '0.68rem', color: '#AAA', marginTop: 4 }}>📍 {place.address}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 이동 수단 화살표 (장소 사이) */}
                {nextRoute && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                    margin: '2px 0',
                  }}>
                    <div style={{ width: 2, height: 28, background: '#E5E7EB', marginLeft: 18, flexShrink: 0, borderRadius: 1 }} />
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: '#F8F9FA', borderRadius: 8, padding: '5px 12px',
                      border: '1px solid #EBEBEB', flexWrap: 'wrap',
                    }}>
                      <span style={{ fontSize: '0.9rem' }}>{TRANS_ICON[nextRoute.transport] ?? '➡️'}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#555' }}>
                        {TRANS_LABEL[nextRoute.transport]} {nextRoute.durationMinutes}분
                      </span>
                      {trafficBuf(nextRoute.transport, nextRoute.durationMinutes) > 0 && (
                        <span style={{ fontSize: '0.66rem', color: '#F59E0B', background: '#FFFBEB', padding: '1px 6px', borderRadius: 3, fontWeight: 600 }}>
                          🚗 정체 +{trafficBuf(nextRoute.transport, nextRoute.durationMinutes)}분
                        </span>
                      )}
                      {nextRoute.estimatedCost > 0 && (
                        <span style={{ fontSize: '0.68rem', color: '#888' }}>
                          ₩{nextRoute.estimatedCost.toLocaleString()}
                        </span>
                      )}
                      {nextRoute.note && (
                        <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>· {nextRoute.note}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function addDays(date: Date, n: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}
function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}
function formatDateKo(str: string) {
  if (!str) return ''
  const [,m,d] = str.split('-')
  return `${parseInt(m)}월 ${parseInt(d)}일`
}

export default function LandingPage() {
  const navigate = useNavigate()
  const isLoggedIn = !!localStorage.getItem('accessToken')

  const today = new Date()
  const [from,       setFrom]       = useState('인천국제공항')
  const [to,         setTo]         = useState('')
  const [startDate,  setStartDate]  = useState(toDateStr(addDays(today, 7)))
  const [endDate,    setEndDate]    = useState(toDateStr(addDays(today, 10)))
  const [members,    setMembers]    = useState(2)
  const [dateOpen,   setDateOpen]   = useState(false)
  const [activeTab,  setActiveTab]  = useState<'해외여행'|'국내여행'>('해외여행')
  const [previewItinerary, setPreviewItinerary] = useState<SampleItinerary | null>(null)
  const dateRef = useRef<HTMLDivElement>(null)

  // 날짜 패널 외부 클릭 닫기
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setDateOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const nights = Math.max(0, (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)

  const handleSearch = () => {
    // sessionStorage에 저장 → CreateModal에서 pre-fill
    sessionStorage.setItem(SEARCH_KEY, JSON.stringify({ from, to, startDate, endDate, members }))
    if (isLoggedIn) navigate('/travels')
    else navigate('/register')
  }

  const applyQuickTag = (tag: typeof QUICK_TAGS[0]) => {
    setTo(tag.to)
    const s = addDays(today, 7)
    setStartDate(toDateStr(s))
    setEndDate(toDateStr(addDays(s, tag.days)))
  }

  return (
    <div style={{ background: '#fff' }}>
      {previewItinerary && (
        <SampleModal itinerary={previewItinerary} onClose={() => setPreviewItinerary(null)} />
      )}
      <Navbar />

      {/* ── HERO ── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1800&q=85)',
          backgroundSize: 'cover', backgroundPosition: 'center 40%',
        }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}/>

        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 900, margin: '0 auto', padding: '100px 32px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <span style={{ display: 'inline-block', background: 'var(--primary)', color: '#fff', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em', padding: '5px 14px', borderRadius: 4, marginBottom: 20, textTransform: 'uppercase' }}>
            AI 여행 플래너
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', fontWeight: 900, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.03em', marginBottom: 14 }}>
            어디로 떠나실래요?
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.78)', marginBottom: 32, lineHeight: 1.7 }}>
            목적지와 날짜만 입력하면 AI가 맞춤 여행 일정을 70초 안에 완성해드려요
          </p>

          {/* ── 검색 카드 ── */}
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.28)', overflow: 'visible', width: '100%', position: 'relative' }}>
            {/* 탭 */}
            <div style={{ display: 'flex', borderBottom: '1px solid #F0F0F0', padding: '0 6px' }}>
              {(['해외여행', '국내여행'] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)} style={{
                  padding: '14px 20px', fontSize: '0.85rem', fontWeight: 700, background: 'none', cursor: 'pointer',
                  color: activeTab === t ? 'var(--primary)' : '#999',
                  borderBottom: activeTab === t ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                  transition: 'all 0.15s',
                }}>{t}</button>
              ))}
            </div>

            {/* 입력 행 */}
            <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 72 }}>

              {/* 출발지 */}
              <div style={{ flex: '0 0 200px', padding: '14px 16px', borderRight: '1px solid #F0F0F0', display: 'flex', flexDirection: 'column', gap: 4, position: 'relative', zIndex: 10 }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase' }}>📍 출발지</span>
                <AutocompleteInput
                  value={from}
                  onChange={setFrom}
                  options={DEPARTURE_OPTIONS}
                  placeholder="출발지 선택"
                  style={{ border: 'none', padding: '0', fontSize: '0.92rem', fontWeight: 700, color: '#1A1A1A' }}
                />
              </div>

              {/* 목적지 */}
              <div style={{ flex: 1, padding: '14px 16px', borderRight: '1px solid #F0F0F0', display: 'flex', flexDirection: 'column', gap: 4, position: 'relative', zIndex: 9 }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase' }}>✈️ 목적지</span>
                <AutocompleteInput
                  value={to}
                  onChange={setTo}
                  options={activeTab === '해외여행'
                    ? ALL_DEST.filter(o => ['도쿄','오사카','삿포로','후쿠오카','나고야','오키나와','교토','나라','히로시마','벳푸','유후인'].includes(o.value))
                    : ALL_DEST.filter(o => ['부산','제주','강릉','경주','전주','여수','속초','대구','광주','춘천'].includes(o.value))}
                  placeholder="여행지 검색 (도쿄, 제주...)"
                  style={{ border: 'none', padding: '0', fontSize: '0.92rem', fontWeight: 700, color: '#1A1A1A' }}
                />
              </div>

              {/* 날짜 */}
              <div ref={dateRef} style={{ flex: '0 0 220px', padding: '14px 16px', borderRight: '1px solid #F0F0F0', display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer', position: 'relative', zIndex: 8 }}
                onClick={() => setDateOpen(o => !o)}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase' }}>📅 날짜</span>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: startDate ? '#1A1A1A' : '#CCC', userSelect: 'none' }}>
                  {startDate && endDate
                    ? `${formatDateKo(startDate)} → ${formatDateKo(endDate)}`
                    : '날짜 선택'}
                </div>
                {startDate && endDate && (
                  <div style={{ fontSize: '0.7rem', color: '#999', marginTop: -2 }}>{nights}박 {nights + 1}일</div>
                )}

                {/* 날짜 드롭다운 */}
                {dateOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: 0,
                    background: '#fff', borderRadius: 14, border: '1px solid #E8E8E8',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.15)', padding: '20px 20px 16px',
                    zIndex: 100, minWidth: 280,
                  }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {[
                        { label: '출발일', val: startDate, key: 'start' },
                        { label: '귀국일', val: endDate,   key: 'end' },
                      ].map(({ label, val, key }) => (
                        <div key={key}>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#555', marginBottom: 6 }}>{label}</label>
                          <input type="date" value={val}
                            min={key === 'end' ? startDate : toDateStr(today)}
                            onChange={e => {
                              if (key === 'start') { setStartDate(e.target.value); if (e.target.value >= endDate) setEndDate(toDateStr(addDays(new Date(e.target.value), 3))) }
                              else setEndDate(e.target.value)
                            }}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E0E0E0', fontSize: '0.88rem', outline: 'none', cursor: 'pointer' }}
                          />
                        </div>
                      ))}
                      {/* 빠른 선택 */}
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#999', marginBottom: 8 }}>빠른 선택</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {[[2,3],[3,4],[4,5],[5,6],[6,7]].map(([nights, days]) => (
                            <button key={nights} type="button" onClick={() => {
                              const s = addDays(today, 14)
                              setStartDate(toDateStr(s))
                              setEndDate(toDateStr(addDays(s, nights)))
                              setDateOpen(false)
                            }} style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid #E0E0E0', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#555', transition: 'all 0.15s' }}
                            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--primary)'; b.style.color = 'var(--primary)' }}
                            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#E0E0E0'; b.style.color = '#555' }}
                            >{nights}박 {days}일</button>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => setDateOpen(false)} style={{ padding: '9px', borderRadius: 8, background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}>
                        확인
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 인원 */}
              <div style={{ flex: '0 0 110px', padding: '14px 16px', borderRight: '1px solid #F0F0F0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase' }}>👤 인원</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <button type="button" onClick={() => setMembers(m => Math.max(1, m-1))} style={{ width: 24, height: 24, borderRadius: '50%', border: '1.5px solid #E0E0E0', background: '#fff', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', flexShrink: 0 }}>−</button>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1A1A1A', minWidth: 24, textAlign: 'center' }}>{members}</span>
                  <button type="button" onClick={() => setMembers(m => Math.min(10, m+1))} style={{ width: 24, height: 24, borderRadius: '50%', border: '1.5px solid #E0E0E0', background: '#fff', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', flexShrink: 0 }}>+</button>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#BBB' }}>{members === 1 ? '혼자' : members === 2 ? '2인' : `${members}명`}</div>
              </div>

              {/* 버튼 */}
              <button onClick={handleSearch} style={{
                flex: '0 0 120px', background: 'var(--primary)', color: '#fff',
                fontSize: '0.9rem', fontWeight: 800, border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-dk)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary)' }}
              >
                <span style={{ fontSize: '1.4rem' }}>✈️</span>
                <span>일정 생성</span>
              </button>
            </div>

            {/* 인기 태그 */}
            <div style={{ padding: '10px 16px 12px', background: '#FAFAFA', borderTop: '1px solid #F5F5F5', display: 'flex', alignItems: 'center', gap: 8, borderRadius: '0 0 16px 16px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#AAA', whiteSpace: 'nowrap' }}>인기</span>
              {QUICK_TAGS.map(tag => (
                <button key={tag.label} onClick={() => applyQuickTag(tag)} style={{
                  padding: '4px 12px', borderRadius: 20, border: '1px solid #E8E8E8',
                  fontSize: '0.75rem', fontWeight: 500, color: '#555', background: '#fff',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--primary)'; b.style.color = 'var(--primary)' }}
                onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#E8E8E8'; b.style.color = '#555' }}
                >{tag.label}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #F0F0F0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 32px', display: 'flex' }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{ flex: 1, padding: '24px 20px', textAlign: 'center', borderRight: i < STATS.length - 1 ? '1px solid #F0F0F0' : 'none' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.02em' }}>{s.num}</div>
              <div style={{ fontSize: '0.77rem', color: '#888', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 추천 여행일정 ── */}
      <section style={{ padding: '56px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase' }}>추천 여행일정</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.02em' }}>
              실제 여행자 코스로 만든 <span style={{ color: 'var(--primary)' }}>베스트 일정</span>
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#888', marginTop: 6, lineHeight: 1.5 }}>
              실제 여행 후기와 현지 코스를 기반으로 구성한 검증된 여행 일정이에요
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {SAMPLE_ITINERARIES.map(it => (
            <div key={it.id}
              onClick={() => setPreviewItinerary(it)}
              style={{
                background: '#fff', borderRadius: 16, overflow: 'hidden',
                border: '1px solid #EBEBEB', cursor: 'pointer',
                transition: 'all 0.22s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-6px)'; el.style.boxShadow = '0 16px 40px rgba(0,0,0,0.13)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ''; el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              {/* 이미지 */}
              <div style={{ height: 180, overflow: 'hidden', position: 'relative' }}>
                <img src={it.imageUrl} alt={it.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.05)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = '' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)' }} />
                {/* 나이트/데이 뱃지 */}
                <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: '0.7rem', fontWeight: 700 }}>
                  🗓️ {it.nights}박{it.days}일
                </div>
                <div style={{ position: 'absolute', top: 12, right: 12, background: 'var(--primary)', color: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: '0.7rem', fontWeight: 700 }}>
                  🇯🇵 일본
                </div>
                <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.3 }}>{it.title}</div>
                </div>
              </div>

              {/* 본문 */}
              <div style={{ padding: '16px' }}>
                {/* 태그 */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                  {it.tags.map(t => (
                    <span key={t} style={{ fontSize: '0.65rem', background: '#F3F4F6', color: '#555', padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>{t}</span>
                  ))}
                </div>

                {/* 하이라이트 */}
                <div style={{ fontSize: '0.75rem', color: '#555', lineHeight: 1.55, marginBottom: 12 }}>
                  ✨ {it.highlight}
                </div>

                {/* 하단 정보 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F5F5F5', paddingTop: 12 }}>
                  <div style={{ fontSize: '0.7rem', color: '#999' }}>
                    🚌 {it.transport} &nbsp;|&nbsp; {it.days}일 일정
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {it.estimatedCost}
                  </div>
                </div>

                {/* 클릭 안내 */}
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'linear-gradient(135deg, #667EEA15, #764BA215)', borderRadius: 8, textAlign: 'center' }}>
                  <span style={{ fontSize: '0.73rem', color: 'var(--primary)', fontWeight: 700 }}>
                    📋 일정 전체 보기 →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 인기 여행지 ── */}
      <section style={{ padding: '56px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase' }}>인기 여행지</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.02em' }}>이번 달 HOT 여행지</h2>
          </div>
          <button style={{ fontSize: '0.82rem', fontWeight: 600, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = '#888')}
          >전체 보기 →</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {POPULAR.map((d, i) => (
            <div key={i} onClick={() => { setTo(d.name); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #EBEBEB', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ''; el.style.boxShadow = 'none' }}
            >
              <div style={{ height: 160, overflow: 'hidden', position: 'relative' }}>
                <img src={d.img} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%)' }}/>
                <span style={{ position: 'absolute', bottom: 12, left: 12, color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>
                  {DEST_EMOJI[d.name] ?? '✈️'} {d.name}
                </span>
                <span style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 5, padding: '3px 8px', fontSize: '0.7rem', fontWeight: 700 }}>{d.country}</span>
              </div>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {d.tags.map(t => <span key={t} style={{ fontSize: '0.68rem', background: '#F5F5F5', color: '#555', padding: '3px 8px', borderRadius: 4, fontWeight: 500 }}>{t}</span>)}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#888' }}>⭐ {d.rating}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#888' }}>AI 일정 예상 비용</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>{d.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 기능 ── */}
      <section style={{ background: '#FAFAFA', borderTop: '1px solid #F0F0F0', padding: '56px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.08em', marginBottom: 8, textTransform: 'uppercase' }}>왜 다갈래인가요?</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.02em' }}>단순 추천이 아닌 진짜 설계</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {[
              { icon: '🗺️', title: '이동 동선 최적화', desc: '실제 이동 시간·거리를 계산해 낭비 없는 최적 동선' },
              { icon: '🍽️', title: 'AI 맛집 추천',     desc: '리뷰 트렌드 분석으로 현지인 맛집 엄선' },
              { icon: '💰', title: '비용 자동 계산',   desc: '교통·숙소·식비·유류비 예산 자동 산출' },
              { icon: '✏️', title: '자유 수정·공유',   desc: '생성된 일정을 직접 수정하고 팀원과 공유' },
            ].map(f => (
              <div key={f.title} style={{ background: '#fff', borderRadius: 12, padding: '24px 20px', border: '1px solid #EBEBEB', transition: 'all 0.2s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'var(--primary)'; el.style.transform = 'translateY(-3px)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = '#EBEBEB'; el.style.transform = '' }}
              >
                <div style={{ fontSize: '1.8rem', marginBottom: 14 }}>{f.icon}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: '0.8rem', color: '#777', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: 'var(--primary)', padding: '56px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40 }}>
          <div>
            <h2 style={{ fontSize: '1.7rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.3 }}>첫 AI 여행 일정, 무료로 시작하세요</h2>
            <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.9rem' }}>회원가입 없이도 미리 체험 가능해요</p>
          </div>
          <button onClick={handleSearch} style={{ padding: '14px 36px', borderRadius: 10, fontSize: '0.95rem', fontWeight: 800, background: '#fff', color: 'var(--primary)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
          >✨ 무료 일정 만들기 →</button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#1A1A1A', padding: '36px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1rem', fontWeight: 900, color: '#fff' }}>다갈래<span style={{ color: 'var(--primary)' }}>.</span></span>
          <div style={{ display: 'flex', gap: 20 }}>
            {['서비스 소개','이용약관','개인정보처리방침','고객센터'].map(l => (
              <a key={l} href="#" style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
              >{l}</a>
            ))}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.18)' }}>© 2026 다갈래</span>
        </div>
      </footer>
    </div>
  )
}
