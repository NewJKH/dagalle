import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { DEST_EMOJI } from '../constants/locations'
import { SAMPLE_ITINERARIES } from '../constants/sampleItineraries'
import type { SampleItinerary, SampleRoute } from '../constants/sampleItineraries'

// ── 도시 목록 ───────────────────────────────────────────
const CITIES_JP = ['도쿄','오사카','교토','삿포로','후쿠오카','나고야','오키나와','나라','고베','벳푸','유후인','히로시마','가나자와','하코네','요코하마']
const CITIES_KR = ['서울','부산','제주','강릉','경주','여수','전주','속초','통영','춘천']
const ALL_CITIES = [...CITIES_JP, ...CITIES_KR]

const POPULAR = [
  { img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80', name: '도쿄',   country: '일본', countryCode: 'JP', price: '89만원~', rating: '4.8', reviews: '2.4만', badge: '베스트', tags: ['미식','쇼핑'] },
  { img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80', name: '제주',   country: '국내', countryCode: 'KR', price: '32만원~', rating: '4.7', reviews: '1.8만', badge: '인기',   tags: ['힐링','자연'] },
  { img: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=600&q=80', name: '오사카', country: '일본', countryCode: 'JP', price: '78만원~', rating: '4.7', reviews: '1.6만', badge: '',      tags: ['미식','쇼핑'] },
  { img: 'https://images.unsplash.com/photo-1583400212045-a2bde5b5efba?w=600&q=80', name: '부산',   country: '국내', countryCode: 'KR', price: '19만원~', rating: '4.6', reviews: '2.1만', badge: '',      tags: ['바다','미식'] },
  { img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&q=80', name: '교토',   country: '일본', countryCode: 'JP', price: '85만원~', rating: '4.8', reviews: '1.2만', badge: '추천',   tags: ['문화','역사'] },
  { img: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=600&q=80', name: '방콕',   country: '태국', countryCode: 'TH', price: '74만원~', rating: '4.5', reviews: '9천',   badge: '',      tags: ['사원','야시장'] },
]

const FEATURES = [
  { icon: '📍', title: '검증된 현지 코스', desc: '현지 여행자 데이터를 기반으로 동선·시간·비용까지 최적화된 맞춤 일정을 제공해요', bg: '#FFF0E8' },
  { icon: '🗺️', title: '지도로 한눈에',   desc: 'Day별 동선이 지도에 표시되고, 구글 스트리트뷰로 장소를 미리 살펴볼 수 있어요', bg: '#E8F5F0' },
  { icon: '✏️', title: '자유로운 수정',   desc: '마음에 안 드는 구간은 언제든 원하는 대로 수정할 수 있어요. 장소 추가·교체도 자유롭게', bg: '#FFF8E8' },
  { icon: '💰', title: '투명한 비용 계산', desc: '항공료·렌트카·숙박·현지 교통비까지 1인/팀 전체 예상 비용을 한눈에 확인해요', bg: '#F0EEFF' },
]

const STATS = [
  { num: '12,000+', label: '큐레이션 여행 코스' },
  { num: '4.8',     label: '평균 만족도' },
  { num: '150+',    label: '국내외 여행지' },
  { num: '30박',    label: '최장 일정 지원' },
]

// ── 별점 ──────────────────────────────────────────────
function Stars({ rating }: { rating: string }) {
  const n = parseFloat(rating)
  return (
    <span style={{ color: '#FACC15', fontSize: '0.75rem', letterSpacing: '-0.02em' }}>
      {'★'.repeat(Math.floor(n))}{'☆'.repeat(5 - Math.floor(n))}
    </span>
  )
}

// ── 샘플 모달 헬퍼 ────────────────────────────────────
function addMins(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total  = h * 60 + m + mins
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
function diffMins(from: string, to: string): number {
  const [fh, fm] = from.split(':').map(Number)
  const [th, tm] = to.split(':').map(Number)
  return (th * 60 + tm) - (fh * 60 + fm)
}
const TYPE_ICON: Record<string, string>  = { RESTAURANT:'🍽️', CAFE:'☕', MUSEUM:'🏛️', PARK:'🌿', HOTEL:'🏨', STATION:'🚉', AIRPORT:'✈️', SHOPPING:'🛍️', ETC:'📍' }
const TRANS_ICON: Record<string, string> = { WALK:'🚶', SUBWAY:'🚇', BUS:'🚌', TRAIN:'🚆', CAR:'🚗' }
const TRANS_LABEL: Record<string, string>= { WALK:'도보', SUBWAY:'지하철', BUS:'버스', TRAIN:'기차', CAR:'자동차' }

// ── 샘플 일정 모달 ────────────────────────────────────
function SampleModal({ itinerary, onClose }: { itinerary: SampleItinerary; onClose: () => void }) {
  const navigate   = useNavigate()
  const [activeDay, setActiveDay] = useState(1)
  const [importing, setImporting] = useState(false)
  const [importErr, setImportErr] = useState('')
  const day = itinerary.schedule.find(d => d.dayNumber === activeDay)!

  const handleImport = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) { onClose(); navigate('/login'); return }
    setImporting(true); setImportErr('')
    try {
      const today    = new Date()
      const startDate= today.toISOString().split('T')[0]
      const endDate  = new Date(today.getTime() + itinerary.nights * 86400000).toISOString().split('T')[0]
      const res = await fetch('/api/v1/travels/import/sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: itinerary.title, countryCode: itinerary.countryCode, destination: itinerary.destination, startDate, endDate, transport: itinerary.transport, schedule: itinerary.schedule }),
      })
      const data = await res.json()
      if (res.ok && data.data?.id) { onClose(); navigate(`/travels/${data.data.id}`) }
      else setImportErr(data.message ?? '저장 중 오류가 발생했어요.')
    } catch { setImportErr('네트워크 오류가 발생했어요.') }
    finally   { setImporting(false) }
  }

  const places = day.routes.length > 0 ? [day.routes[0].from, ...day.routes.map((r: SampleRoute) => r.to)] : []

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 820, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.3)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        {/* 헤더 이미지 */}
        <div style={{ position: 'relative', height: 180, flexShrink: 0, overflow: 'hidden' }}>
          <img src={itinerary.imageUrl} alt={itinerary.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
          <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          <div style={{ position: 'absolute', bottom: 16, left: 20, right: 20 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {itinerary.tags.map(t => <span key={t} style={{ fontSize: '0.68rem', background: 'rgba(255,255,255,0.22)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>{t}</span>)}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>{itinerary.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>🗓️ {itinerary.nights}박{itinerary.days}일 &nbsp;·&nbsp; {itinerary.transport}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.65)' }}>예상 비용</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FFD966' }}>{itinerary.estimatedCost}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 일차 탭 */}
        <div style={{ display: 'flex', borderBottom: '1px solid #F0F0F0', padding: '0 4px', flexShrink: 0, overflowX: 'auto' }}>
          {itinerary.schedule.map(d => (
            <button key={d.dayNumber} onClick={() => setActiveDay(d.dayNumber)} style={{
              padding: '10px 16px', fontSize: '0.78rem', fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              color: activeDay === d.dayNumber ? 'var(--primary)' : '#888',
              borderBottom: activeDay === d.dayNumber ? '2.5px solid var(--primary)' : '2.5px solid transparent',
              transition: 'all 0.15s',
            }}>{d.dayNumber}일차</button>
          ))}
        </div>

        {/* 일차 레이블 */}
        <div style={{ padding: '12px 20px 4px', flexShrink: 0 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#444' }}>{day.label}</div>
        </div>

        {/* 내 일정에 추가 */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #F0F0F0', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleImport} disabled={importing} style={{
            flex: 1, padding: '13px 0', borderRadius: 12, border: 'none',
            background: importing ? '#A5B4FC' : '#6366F1',
            color: '#fff', fontSize: '0.95rem', fontWeight: 800, cursor: importing ? 'not-allowed' : 'pointer',
            boxShadow: importing ? 'none' : '0 4px 16px rgba(99,102,241,0.35)', transition: 'all 0.2s',
          }}>
            {importing ? '⏳ 저장 중...' : '✈️ 내 일정에 추가하기'}
          </button>
          <button onClick={onClose} style={{ padding: '13px 20px', borderRadius: 12, border: '1.5px solid #E5E7EB', background: '#fff', color: '#6B7280', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}>닫기</button>
        </div>
        {importErr && <div style={{ padding: '4px 20px 14px', color: '#EF4444', fontSize: '0.78rem', textAlign: 'center' }}>{importErr}</div>}

        {/* 타임라인 */}
        <div style={{ overflowY: 'auto', padding: '4px 20px 24px', flex: 1 }}>
          {places.map((place, pi) => {
            const prevRoute: SampleRoute | undefined = day.routes[pi - 1]
            const nextRoute: SampleRoute | undefined = day.routes[pi]
            const arrivalTime  = pi === 0 ? null : addMins(prevRoute.departureTime, prevRoute.durationMinutes)
            const departureTime= nextRoute?.departureTime ?? null
            const stayMins     = arrivalTime && departureTime ? diffMins(arrivalTime, departureTime) : null

            return (
              <div key={pi}>
                <div style={{ background: '#FAFAFA', borderRadius: 12, border: '1px solid #EBEBEB', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fff', border: '1.5px solid #E8E8E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{TYPE_ICON[place.type] ?? '📍'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1A1A1A' }}>{place.name}</span>
                        <span style={{ fontSize: '0.65rem', background: '#F0F0F0', color: '#666', padding: '1px 6px', borderRadius: 3, fontWeight: 600 }}>{place.type}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                        {arrivalTime && <span style={{ fontSize: '0.72rem', color: '#3B82F6', background: '#EFF6FF', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>도착 {arrivalTime}</span>}
                        {stayMins !== null && stayMins > 0 && <span style={{ fontSize: '0.72rem', color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>체류 {stayMins}분</span>}
                        {departureTime && pi > 0 && <span style={{ fontSize: '0.72rem', color: '#888', background: '#F5F5F5', padding: '2px 8px', borderRadius: 4 }}>{departureTime} 출발</span>}
                      </div>
                      {place.description && <div style={{ fontSize: '0.76rem', color: '#666', lineHeight: 1.55, marginTop: 6 }}>{place.description}</div>}
                    </div>
                  </div>
                </div>
                {nextRoute && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', margin: '2px 0' }}>
                    <div style={{ width: 2, height: 24, background: '#E5E7EB', marginLeft: 18, flexShrink: 0, borderRadius: 1 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F8F9FA', borderRadius: 8, padding: '5px 12px', border: '1px solid #EBEBEB', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.9rem' }}>{TRANS_ICON[nextRoute.transport] ?? '➡️'}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#555' }}>{TRANS_LABEL[nextRoute.transport]} {nextRoute.durationMinutes}분</span>
                      {nextRoute.estimatedCost > 0 && <span style={{ fontSize: '0.68rem', color: '#888' }}>₩{nextRoute.estimatedCost.toLocaleString()}</span>}
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

// ─────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate   = useNavigate()
  const isLoggedIn = !!localStorage.getItem('accessToken')
  const today      = new Date().toISOString().split('T')[0]

  const [previewItinerary, setPreviewItinerary] = useState<SampleItinerary | null>(null)

  // 검색바 상태
  const [searchDest,      setSearchDest]      = useState('')
  const [searchCountry,   setSearchCountry]   = useState('JP')
  const [searchStart,     setSearchStart]     = useState('')
  const [searchEnd,       setSearchEnd]       = useState('')
  const [searchTravelers, setSearchTravelers] = useState(2)
  const [showDrop,        setShowDrop]        = useState(false)
  const destRef = useRef<HTMLDivElement>(null)

  // 드롭다운 바깥 클릭 닫기
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (destRef.current && !destRef.current.contains(e.target as Node)) setShowDrop(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const filteredCities = ALL_CITIES.filter(c => !searchDest || c.includes(searchDest))
  const filteredJP = filteredCities.filter(c => CITIES_JP.includes(c))
  const filteredKR = filteredCities.filter(c => CITIES_KR.includes(c))

  const searchNights = searchStart && searchEnd
    ? Math.round((new Date(searchEnd).getTime() - new Date(searchStart).getTime()) / 86400000)
    : 0

  const handleSearch = () => {
    if (!isLoggedIn) { navigate('/register'); return }
    navigate('/travels', {
      state: {
        openCreate:  true,
        destCity:    searchDest,
        destCountry: searchCountry,
        startDate:   searchStart,
        endDate:     searchEnd,
        memberCount: searchTravelers,
      }
    })
  }

  const handleQuickDest = (city: string, country: string) => {
    setSearchDest(city)
    setSearchCountry(country)
    if (isLoggedIn) {
      navigate('/travels', { state: { openCreate: true, destCity: city, destCountry: country } })
    } else {
      navigate('/register')
    }
  }

  return (
    <div style={{ background: '#fff', color: '#1A1A1A' }}>
      {previewItinerary && <SampleModal itinerary={previewItinerary} onClose={() => setPreviewItinerary(null)} />}
      <Navbar />

      {/* ── HERO ── */}
      <section style={{ background: '#fff', padding: '96px 32px 72px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>

          {/* 타이틀 */}
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', fontWeight: 900, color: '#1A1A1A', lineHeight: 1.15, letterSpacing: '-0.04em', marginBottom: 16 }}>
            여행 일정,<br /><span style={{ color: 'var(--primary)' }}>쉽고 빠르게</span> 만드세요
          </h1>
          <p style={{ fontSize: '1.05rem', color: '#888', marginBottom: 40, lineHeight: 1.7 }}>
            검증된 현지 코스 기반으로 동선·비용·숙박까지 한 번에
          </p>

          {/* ── 검색바 ── */}
          <div style={{
            background: '#fff', borderRadius: 14, padding: 6,
            display: 'flex', alignItems: 'stretch', width: '100%', maxWidth: 800, margin: '0 auto',
            boxShadow: '0 2px 24px rgba(0,0,0,0.1)', border: '1.5px solid #E8E8E8',
          }}>
            {/* 여행지 */}
            <div ref={destRef} style={{ flex: '0 0 200px', padding: '10px 16px', borderRight: '1px solid #EBEBEB', position: 'relative' }}>
              <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#BBB', letterSpacing: '0.1em', marginBottom: 3, textTransform: 'uppercase' }}>여행지</div>
              <input
                value={searchDest}
                onChange={e => { setSearchDest(e.target.value); setShowDrop(true) }}
                onFocus={() => setShowDrop(true)}
                placeholder="어디로 가시나요?"
                style={{ border: 'none', outline: 'none', fontSize: '0.9rem', fontWeight: 700, color: '#1A1A1A', width: '100%', background: 'transparent' }}
              />
              {showDrop && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: 250, background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 200, overflow: 'hidden', border: '1px solid #EBEBEB' }}>
                  {filteredJP.length > 0 && (<>
                    <div style={{ padding: '10px 16px 4px', fontSize: '0.6rem', fontWeight: 800, color: '#BBB', letterSpacing: '0.1em', textTransform: 'uppercase' }}>🇯🇵 일본</div>
                    {filteredJP.slice(0, 6).map(city => (
                      <div key={city} onClick={() => { setSearchDest(city); setSearchCountry('JP'); setShowDrop(false) }}
                        style={{ padding: '9px 16px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: '#1A1A1A', display: 'flex', gap: 8, alignItems: 'center' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#FFF4EE')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      ><span>{DEST_EMOJI[city] ?? '📍'}</span>{city}</div>
                    ))}
                  </>)}
                  {filteredKR.length > 0 && (<>
                    <div style={{ padding: '8px 16px 4px', borderTop: filteredJP.length > 0 ? '1px solid #F5F5F5' : 'none', fontSize: '0.6rem', fontWeight: 800, color: '#BBB', letterSpacing: '0.1em', textTransform: 'uppercase' }}>🇰🇷 국내</div>
                    {filteredKR.slice(0, 4).map(city => (
                      <div key={city} onClick={() => { setSearchDest(city); setSearchCountry('KR'); setShowDrop(false) }}
                        style={{ padding: '9px 16px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: '#1A1A1A', display: 'flex', gap: 8, alignItems: 'center' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#FFF4EE')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      ><span>{DEST_EMOJI[city] ?? '📍'}</span>{city}</div>
                    ))}
                  </>)}
                  {filteredJP.length === 0 && filteredKR.length === 0 && (
                    <div style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#BBB' }}>일치하는 여행지가 없어요</div>
                  )}
                </div>
              )}
            </div>

            {/* 기간 */}
            <div style={{ flex: 1, padding: '10px 16px', borderRight: '1px solid #EBEBEB' }}>
              <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#BBB', letterSpacing: '0.1em', marginBottom: 3, textTransform: 'uppercase' }}>여행 기간</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="date" value={searchStart} min={today}
                  onChange={e => setSearchStart(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: '0.82rem', fontWeight: 600, color: searchStart ? '#1A1A1A' : '#BBB', background: 'transparent', flex: 1, minWidth: 0 }}
                />
                <span style={{ color: '#DDD', flexShrink: 0 }}>–</span>
                <input type="date" value={searchEnd} min={searchStart || today}
                  onChange={e => setSearchEnd(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: '0.82rem', fontWeight: 600, color: searchEnd ? '#1A1A1A' : '#BBB', background: 'transparent', flex: 1, minWidth: 0 }}
                />
              </div>
              {searchNights > 0 && <div style={{ fontSize: '0.68rem', color: 'var(--primary)', fontWeight: 700, marginTop: 2 }}>{searchNights}박 {searchNights + 1}일</div>}
            </div>

            {/* 인원 */}
            <div style={{ padding: '10px 14px', borderRight: '1px solid #EBEBEB', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#BBB', letterSpacing: '0.1em', marginBottom: 3, textTransform: 'uppercase' }}>인원</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setSearchTravelers(t => Math.max(1, t - 1))}
                  style={{ width: 24, height: 24, borderRadius: '50%', border: '1.5px solid #E0E0E0', background: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 700, color: '#555' }}>−</button>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, minWidth: 16, textAlign: 'center' }}>{searchTravelers}</span>
                <button onClick={() => setSearchTravelers(t => Math.min(10, t + 1))}
                  style={{ width: 24, height: 24, borderRadius: '50%', border: '1.5px solid #E0E0E0', background: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 700, color: '#555' }}>+</button>
              </div>
            </div>

            {/* 검색 버튼 */}
            <button onClick={handleSearch} style={{
              margin: 5, padding: '0 28px', borderRadius: 10,
              background: 'var(--primary)', color: '#fff',
              fontSize: '0.92rem', fontWeight: 800, border: 'none', cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0, transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-dk)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary)' }}
            >일정 만들기</button>
          </div>

          {/* 퀵 여행지 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 18 }}>
            {(['도쿄', '오사카', '교토', '삿포로', '후쿠오카', '제주', '부산'] as const).map(city => (
              <button key={city} onClick={() => handleQuickDest(city, CITIES_JP.includes(city) ? 'JP' : 'KR')}
                style={{ padding: '6px 14px', borderRadius: 20, background: '#F5F5F5', color: '#555', fontSize: '0.78rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'var(--primary)'; b.style.color = '#fff' }}
                onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = '#F5F5F5'; b.style.color = '#555' }}
              >{DEST_EMOJI[city]} {city}</button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 통계 바 ── */}
      <div style={{ borderTop: '1px solid #F0F0F0', borderBottom: '1px solid #F0F0F0', background: '#FAFAFA' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 32px', display: 'flex' }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{ flex: 1, padding: '20px 0', textAlign: 'center', borderRight: i < STATS.length - 1 ? '1px solid #EBEBEB' : 'none' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.num}</div>
              <div style={{ fontSize: '0.72rem', color: '#999', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 인기 여행지 ── */}
      <section id="popular" style={{ padding: '72px 32px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.1em', marginBottom: 6, textTransform: 'uppercase' }}>이번 달 인기</div>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.02em' }}>HOT 여행지</h2>
          </div>
          <span style={{ fontSize: '0.82rem', color: '#AAA' }}>실시간 업데이트</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
          {POPULAR.map((d, i) => (
            <div key={i}
              onClick={() => handleQuickDest(d.name, d.countryCode === 'JP' ? 'JP' : 'KR')}
              style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #EBEBEB', cursor: 'pointer', transition: 'all 0.22s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-5px)'; el.style.boxShadow = '0 14px 36px rgba(0,0,0,0.12)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ''; el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <div style={{ height: 168, overflow: 'hidden', position: 'relative' }}>
                <img src={d.img} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.05)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = '' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)' }} />
                {d.badge && (
                  <div style={{ position: 'absolute', top: 10, left: 10, background: 'var(--primary)', color: '#fff', borderRadius: 4, padding: '3px 8px', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.04em' }}>{d.badge}</div>
                )}
                <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: 4, padding: '3px 8px', fontSize: '0.65rem', fontWeight: 700 }}>
                  {d.countryCode === 'JP' ? '🇯🇵 일본' : d.countryCode === 'KR' ? '🇰🇷 국내' : d.country}
                </div>
                <div style={{ position: 'absolute', bottom: 10, left: 12 }}>
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>{DEST_EMOJI[d.name] ?? '✈️'} {d.name}</span>
                </div>
              </div>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Stars rating={d.rating} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#444' }}>{d.rating}</span>
                    <span style={{ fontSize: '0.7rem', color: '#AAA' }}>({d.reviews})</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {d.tags.map(t => <span key={t} style={{ fontSize: '0.63rem', background: '#F5F5F5', color: '#666', padding: '2px 6px', borderRadius: 3, fontWeight: 600 }}>{t}</span>)}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#999' }}>예상 여행 비용</span>
                  <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--primary)' }}>{d.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 왜 선택하나요 ── */}
      <section style={{ background: '#F7F7F7', padding: '72px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.1em', marginBottom: 10, textTransform: 'uppercase' }}>왜 다갈래인가요?</div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.03em', lineHeight: 1.25 }}>
              수천 명이 선택한 이유
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {FEATURES.map(f => (
              <div key={f.title}
                style={{ background: '#fff', borderRadius: 16, border: '1px solid #EBEBEB', padding: '26px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', transition: 'all 0.2s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ''; el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)' }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 12, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem', marginBottom: 16 }}>{f.icon}</div>
                <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#1A1A1A', marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: '0.8rem', color: '#666', lineHeight: 1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 추천 코스 ── */}
      <section id="sample-itineraries" style={{ padding: '64px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.1em', marginBottom: 6, textTransform: 'uppercase' }}>큐레이션 코스</div>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.02em' }}>
              검증된 <span style={{ color: 'var(--primary)' }}>베스트 일정</span>
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#999', marginTop: 6 }}>실제 여행자 후기와 현지 코스를 기반으로 구성한 검증된 일정이에요</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {SAMPLE_ITINERARIES.map(it => (
            <div key={it.id} onClick={() => setPreviewItinerary(it)}
              style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #EBEBEB', cursor: 'pointer', transition: 'all 0.22s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-6px)'; el.style.boxShadow = '0 16px 40px rgba(0,0,0,0.13)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ''; el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <div style={{ height: 180, overflow: 'hidden', position: 'relative' }}>
                <img src={it.imageUrl} alt={it.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.05)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = '' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)' }} />
                <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 5, padding: '3px 9px', fontSize: '0.68rem', fontWeight: 700 }}>🗓️ {it.nights}박{it.days}일</div>
                <div style={{ position: 'absolute', top: 12, right: 12, background: 'var(--primary)', color: '#fff', borderRadius: 5, padding: '3px 9px', fontSize: '0.68rem', fontWeight: 700 }}>
                  {it.countryCode === 'JP' ? '🇯🇵 일본' : it.countryCode === 'KR' ? '🇰🇷 국내' : '🌏 해외'}
                </div>
                <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.3 }}>{it.title}</div>
                </div>
              </div>

              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                  {it.tags.map(t => <span key={t} style={{ fontSize: '0.63rem', background: '#F3F4F6', color: '#555', padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>{t}</span>)}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#555', lineHeight: 1.55, marginBottom: 12 }}>{it.highlight}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F5F5F5', paddingTop: 10 }}>
                  <div style={{ fontSize: '0.7rem', color: '#AAA' }}>🚌 {it.transport} · {it.days}일</div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 900, color: 'var(--primary)' }}>{it.estimatedCost}</div>
                </div>
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--primary-bg)', borderRadius: 8, textAlign: 'center' }}>
                  <span style={{ fontSize: '0.73rem', color: 'var(--primary)', fontWeight: 700 }}>일정 전체 보기 →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: 'var(--primary)', padding: '60px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40 }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.3 }}>
              첫 여행 일정, 지금 무료로 시작하세요
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.9rem' }}>회원가입 후 무제한으로 여행 일정을 관리할 수 있어요</p>
          </div>
          <button onClick={() => isLoggedIn ? navigate('/travels') : navigate('/register')}
            style={{ padding: '15px 38px', borderRadius: 10, fontSize: '0.95rem', fontWeight: 800, background: '#fff', color: 'var(--primary)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 28px rgba(0,0,0,0.2)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)' }}
          >무료 일정 만들기 →</button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#1A1A1A', padding: '48px 32px 28px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="#fff" stroke="none"/></svg>
                </div>
                <span style={{ fontSize: '1rem', fontWeight: 900, color: '#fff' }}>다갈래</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, maxWidth: 220 }}>
                검증된 현지 코스로 만드는<br />나만의 맞춤 여행 일정 서비스
              </p>
            </div>
            <div style={{ display: 'flex', gap: 48 }}>
              {[
                { title: '서비스', links: ['여행지 안내', '추천 코스', '베스트 일정', '여행 가이드'] },
                { title: '고객지원', links: ['자주 묻는 질문', '고객센터', '이용약관', '개인정보처리방침'] },
              ].map(col => (
                <div key={col.title}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', marginBottom: 12, letterSpacing: '0.06em' }}>{col.title}</div>
                  {col.links.map(l => (
                    <a key={l} href="#" style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginBottom: 8, transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                    >{l}</a>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)' }}>© 2026 다갈래. All rights reserved.</span>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)' }}>대한민국 서울</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
