import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { DEST_EMOJI } from '../constants/locations'
import { SAMPLE_ITINERARIES } from '../constants/sampleItineraries'
import type { SampleItinerary, SampleRoute } from '../constants/sampleItineraries'

const CITIES_JP = ['도쿄','오사카','교토','삿포로','후쿠오카','나고야','오키나와','나라','고베','벳푸','유후인','히로시마','가나자와','하코네','요코하마']
const CITIES_KR = ['서울','부산','제주','강릉','경주','여수','전주','속초','통영','춘천']
const ALL_CITIES = [...CITIES_JP, ...CITIES_KR]

const POPULAR = [
  { img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=900&q=80', name: '도쿄',   country: '일본', countryCode: 'JP', price: '89만원~', rating: '4.8', reviews: '2.4만', badge: '베스트', tags: ['미식','쇼핑'] },
  { img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80', name: '제주',   country: '국내', countryCode: 'KR', price: '32만원~', rating: '4.7', reviews: '1.8만', badge: '인기',   tags: ['힐링','자연'] },
  { img: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=600&q=80', name: '오사카', country: '일본', countryCode: 'JP', price: '78만원~', rating: '4.7', reviews: '1.6만', badge: '',      tags: ['미식','쇼핑'] },
  { img: 'https://images.unsplash.com/photo-1583400212045-a2bde5b5efba?w=600&q=80', name: '부산',   country: '국내', countryCode: 'KR', price: '19만원~', rating: '4.6', reviews: '2.1만', badge: '',      tags: ['바다','미식'] },
  { img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&q=80', name: '교토',   country: '일본', countryCode: 'JP', price: '85만원~', rating: '4.8', reviews: '1.2만', badge: '추천',   tags: ['문화','역사'] },
  { img: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=600&q=80', name: '방콕',   country: '태국', countryCode: 'TH', price: '74만원~', rating: '4.5', reviews: '9천',   badge: '',      tags: ['사원','야시장'] },
]

const FEATURES = [
  { icon: '🗓️', title: 'AI 맞춤 일정', desc: '원하는 스타일을 말하면 동선·시간·비용까지 최적화된 일정을 즉시 만들어드려요' },
  { icon: '🗺️', title: '지도로 한눈에', desc: 'Day별 동선이 지도에 펼쳐지고, 구글 스트리트뷰로 장소를 미리 살펴볼 수 있어요' },
  { icon: '✏️', title: '자유로운 수정', desc: '마음에 안 드는 구간은 AI에게 말하면 바로 바꿔드려요. 장소 추가·교체도 자유롭게' },
  { icon: '💰', title: '비용 한눈에', desc: '항공료·렌트카·숙박·현지 교통비까지 1인/팀 전체 예상 비용을 실시간으로 확인해요' },
  { icon: '👥', title: '팀 플래닝', desc: '친구·가족과 함께 일정을 만들어요. 실시간 채팅과 멤버 관리까지 한 곳에서' },
]

const TYPE_ICON: Record<string, string>  = { RESTAURANT:'🍽️', CAFE:'☕', MUSEUM:'🏛️', PARK:'🌿', HOTEL:'🏨', STATION:'🚉', AIRPORT:'✈️', SHOPPING:'🛍️', ETC:'📍' }
const TRANS_ICON: Record<string, string> = { WALK:'🚶', SUBWAY:'🚇', BUS:'🚌', TRAIN:'🚆', CAR:'🚗' }
const TRANS_LABEL: Record<string, string> = { WALK:'도보', SUBWAY:'지하철', BUS:'버스', TRAIN:'기차', CAR:'자동차' }

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

// ── 샘플 일정 모달 ──────────────────────────────────────
function SampleModal({ itinerary, onClose }: { itinerary: SampleItinerary; onClose: () => void }) {
  const navigate = useNavigate()
  const [activeDay, setActiveDay] = useState(1)
  const [importing, setImporting] = useState(false)
  const [importErr, setImportErr] = useState('')
  const day = itinerary.schedule.find(d => d.dayNumber === activeDay)!

  const handleImport = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) { onClose(); navigate('/login'); return }
    setImporting(true); setImportErr('')
    try {
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + itinerary.nights * 86400000).toISOString().split('T')[0]
      const res = await fetch('/api/v1/travels/import/sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: itinerary.title, countryCode: itinerary.countryCode, destination: itinerary.destination, startDate, endDate, transport: itinerary.transport, schedule: itinerary.schedule }),
      })
      const data = await res.json()
      if (res.ok && data.data?.id) { onClose(); navigate(`/travels/${data.data.id}`) }
      else setImportErr(data.message ?? '저장 중 오류가 발생했어요.')
    } catch { setImportErr('네트워크 오류가 발생했어요.') }
    finally { setImporting(false) }
  }

  const places = day.routes.length > 0 ? [day.routes[0].from, ...day.routes.map((r: SampleRoute) => r.to)] : []

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 760, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.25)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

        {/* 헤더 이미지 */}
        <div style={{ position: 'relative', height: 200, flexShrink: 0, overflow: 'hidden' }}>
          <img src={itinerary.imageUrl} alt={itinerary.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>✕</button>
          <div style={{ position: 'absolute', bottom: 20, left: 24, right: 24 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {itinerary.tags.map(t => <span key={t} style={{ fontSize: '0.68rem', background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 600, backdropFilter: 'blur(4px)' }}>{t}</span>)}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>{itinerary.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>🗓️ {itinerary.nights}박{itinerary.days}일 &nbsp;·&nbsp; {itinerary.transport}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>예상 비용</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff' }}>{itinerary.estimatedCost}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 일차 탭 */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-lt)', padding: '0 4px', flexShrink: 0, overflowX: 'auto' }}>
          {itinerary.schedule.map(d => (
            <button key={d.dayNumber} onClick={() => setActiveDay(d.dayNumber)} style={{
              padding: '12px 18px', fontSize: '0.8rem', fontWeight: 700, border: 'none', background: 'none',
              cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
              color: activeDay === d.dayNumber ? 'var(--primary)' : 'var(--text3)',
              borderBottom: activeDay === d.dayNumber ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            }}>{d.dayNumber}일차</button>
          ))}
        </div>

        <div style={{ padding: '12px 24px 6px', flexShrink: 0 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text2)' }}>{day.label}</div>
        </div>

        {/* 타임라인 */}
        <div style={{ overflowY: 'auto', padding: '8px 24px 0', flex: 1 }}>
          {places.map((place, pi) => {
            const prevRoute: SampleRoute | undefined = day.routes[pi - 1]
            const nextRoute: SampleRoute | undefined = day.routes[pi]
            const arrivalTime = pi === 0 ? null : addMins(prevRoute.departureTime, prevRoute.durationMinutes)
            const departureTime = nextRoute?.departureTime ?? null
            const stayMins = arrivalTime && departureTime ? diffMins(arrivalTime, departureTime) : null
            return (
              <div key={pi}>
                <div style={{ background: 'var(--gray7)', borderRadius: 12, border: '1px solid var(--border-lt)', padding: '14px 16px', marginBottom: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', border: '1px solid var(--border-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{TYPE_ICON[place.type] ?? '📍'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text)' }}>{place.name}</span>
                        <span style={{ fontSize: '0.62rem', background: '#fff', color: 'var(--text3)', padding: '1px 6px', borderRadius: 3, fontWeight: 600, border: '1px solid var(--border-lt)' }}>{place.type}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {arrivalTime && <span style={{ fontSize: '0.72rem', color: 'var(--primary)', background: 'var(--primary-bg)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>도착 {arrivalTime}</span>}
                        {stayMins !== null && stayMins > 0 && <span style={{ fontSize: '0.72rem', color: '#16A34A', background: '#F0FDF4', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>체류 {stayMins}분</span>}
                      </div>
                      {place.description && <div style={{ fontSize: '0.75rem', color: 'var(--text3)', lineHeight: 1.55, marginTop: 6 }}>{place.description}</div>}
                    </div>
                  </div>
                </div>
                {nextRoute && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 12px', margin: '2px 0' }}>
                    <div style={{ width: 2, height: 22, background: 'var(--border)', marginLeft: 17, flexShrink: 0, borderRadius: 1 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', borderRadius: 8, padding: '4px 10px', border: '1px solid var(--border-lt)' }}>
                      <span style={{ fontSize: '0.85rem' }}>{TRANS_ICON[nextRoute.transport] ?? '➡️'}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text2)' }}>{TRANS_LABEL[nextRoute.transport]} {nextRoute.durationMinutes}분</span>
                      {nextRoute.estimatedCost > 0 && <span style={{ fontSize: '0.65rem', color: 'var(--text3)' }}>₩{nextRoute.estimatedCost.toLocaleString()}</span>}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          <div style={{ height: 16 }} />
        </div>

        {/* 하단 버튼 */}
        <div style={{ padding: '14px 24px 20px', borderTop: '1px solid var(--border-lt)', flexShrink: 0 }}>
          {importErr && <div style={{ marginBottom: 10, color: '#EF4444', fontSize: '0.78rem', textAlign: 'center' }}>{importErr}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '12px 20px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', color: 'var(--text3)', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>닫기</button>
            <button onClick={handleImport} disabled={importing} style={{
              flex: 1, padding: '12px 0', borderRadius: 10, border: 'none',
              background: importing ? 'var(--gray5)' : 'var(--primary)',
              color: '#fff', fontSize: '0.95rem', fontWeight: 700, cursor: importing ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}>
              {importing ? '⏳ 저장 중...' : '✈️ 내 일정에 추가하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 메인 ────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()
  const isLoggedIn = !!localStorage.getItem('accessToken')
  const today = new Date().toISOString().split('T')[0]

  const [previewItinerary, setPreviewItinerary] = useState<SampleItinerary | null>(null)
  const [searchDest, setSearchDest]     = useState('')
  const [searchCountry, setSearchCountry] = useState('JP')
  const [searchStart, setSearchStart]   = useState('')
  const [searchEnd, setSearchEnd]       = useState('')
  const [searchTravelers, setSearchTravelers] = useState(2)
  const [showDrop, setShowDrop]         = useState(false)
  const destRef = useRef<HTMLDivElement>(null)

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
    navigate('/travels', { state: { openCreate: true, destCity: searchDest, destCountry: searchCountry, startDate: searchStart, endDate: searchEnd, memberCount: searchTravelers } })
  }

  const handleQuickDest = (city: string, country: string) => {
    if (isLoggedIn) navigate('/travels', { state: { openCreate: true, destCity: city, destCountry: country } })
    else navigate('/register')
  }

  const [featured, ...rest] = POPULAR

  return (
    <div style={{ background: '#fff', color: 'var(--text)' }}>
      {previewItinerary && <SampleModal itinerary={previewItinerary} onClose={() => setPreviewItinerary(null)} />}
      <Navbar />

      {/* ── HERO ──────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '82vh', display: 'flex', alignItems: 'flex-end' }}>
        {/* 배경 */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1600&q=80)', backgroundSize: 'cover', backgroundPosition: 'center 40%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.52)' }} />

        <div style={{ position: 'relative', zIndex: 2, width: '100%', padding: '0 64px 72px' }}>
          <div style={{ maxWidth: 700 }}>
            {/* 라벨 */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, padding: '5px 14px', marginBottom: 20, backdropFilter: 'blur(8px)' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', letterSpacing: '0.06em' }}>AI 여행 플래너</span>
            </div>

            <h1 style={{ fontSize: 'clamp(2.4rem, 5.5vw, 4rem)', fontWeight: 900, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.04em', marginBottom: 20 }}>
              여행 일정,<br />
              <span style={{ color: 'var(--primary-lt)' }}>다갈래</span>에서
            </h1>
            <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.75)', marginBottom: 36, lineHeight: 1.7, maxWidth: 480 }}>
              검증된 현지 코스 기반으로 동선·비용·숙박까지 한 번에.<br />원하는 스타일만 말하면 AI가 맞춤 일정을 만들어드려요.
            </p>

            {/* 검색바 */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 6, display: 'flex', alignItems: 'stretch', maxWidth: 700, boxShadow: '0 4px 32px rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>

              {/* 여행지 */}
              <div ref={destRef} style={{ flex: '0 0 190px', padding: '10px 16px', borderRight: '1px solid var(--border-lt)', position: 'relative' }}>
                <div style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: 4 }}>여행지</div>
                <input value={searchDest} onChange={e => { setSearchDest(e.target.value); setShowDrop(true) }} onFocus={() => setShowDrop(true)}
                  placeholder="어디로 가시나요?"
                  style={{ border: 'none', outline: 'none', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', width: '100%', background: 'transparent', fontFamily: 'inherit' }}
                />
                {showDrop && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: 240, background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 200, overflow: 'hidden', border: '1px solid var(--border-lt)' }}>
                    {filteredJP.length > 0 && (<>
                      <div style={{ padding: '10px 16px 4px', fontSize: '0.6rem', fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.1em' }}>🇯🇵 일본</div>
                      {filteredJP.slice(0, 6).map(city => (
                        <div key={city} onClick={() => { setSearchDest(city); setSearchCountry('JP'); setShowDrop(false) }}
                          style={{ padding: '9px 16px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', display: 'flex', gap: 8, alignItems: 'center' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-bg)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        ><span>{DEST_EMOJI[city] ?? '📍'}</span>{city}</div>
                      ))}
                    </>)}
                    {filteredKR.length > 0 && (<>
                      <div style={{ padding: '8px 16px 4px', borderTop: filteredJP.length > 0 ? '1px solid var(--border-lt)' : 'none', fontSize: '0.6rem', fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.1em' }}>🇰🇷 국내</div>
                      {filteredKR.slice(0, 4).map(city => (
                        <div key={city} onClick={() => { setSearchDest(city); setSearchCountry('KR'); setShowDrop(false) }}
                          style={{ padding: '9px 16px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', display: 'flex', gap: 8, alignItems: 'center' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-bg)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        ><span>{DEST_EMOJI[city] ?? '📍'}</span>{city}</div>
                      ))}
                    </>)}
                    {filteredJP.length === 0 && filteredKR.length === 0 && (
                      <div style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text3)' }}>일치하는 여행지가 없어요</div>
                    )}
                  </div>
                )}
              </div>

              {/* 기간 */}
              <div style={{ flex: 1, padding: '10px 16px', borderRight: '1px solid var(--border-lt)' }}>
                <div style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: 4 }}>여행 기간</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="date" value={searchStart} min={today} onChange={e => setSearchStart(e.target.value)}
                    style={{ border: 'none', outline: 'none', fontSize: '0.82rem', fontWeight: 600, color: searchStart ? 'var(--text)' : 'var(--text3)', background: 'transparent', flex: 1, minWidth: 0, fontFamily: 'inherit' }} />
                  <span style={{ color: 'var(--border)' }}>–</span>
                  <input type="date" value={searchEnd} min={searchStart || today} onChange={e => setSearchEnd(e.target.value)}
                    style={{ border: 'none', outline: 'none', fontSize: '0.82rem', fontWeight: 600, color: searchEnd ? 'var(--text)' : 'var(--text3)', background: 'transparent', flex: 1, minWidth: 0, fontFamily: 'inherit' }} />
                </div>
                {searchNights > 0 && <div style={{ fontSize: '0.68rem', color: 'var(--primary)', fontWeight: 700, marginTop: 2 }}>{searchNights}박 {searchNights + 1}일</div>}
              </div>

              {/* 인원 */}
              <div style={{ padding: '10px 14px', borderRight: '1px solid var(--border-lt)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: 4 }}>인원</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => setSearchTravelers(t => Math.max(1, t - 1))}
                    style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--border)', background: '#fff', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text2)' }}>−</button>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, minWidth: 16, textAlign: 'center', color: 'var(--text)' }}>{searchTravelers}</span>
                  <button onClick={() => setSearchTravelers(t => Math.min(10, t + 1))}
                    style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--border)', background: '#fff', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text2)' }}>+</button>
                </div>
              </div>

              {/* 검색 버튼 */}
              <button onClick={handleSearch} style={{
                margin: 5, padding: '0 28px', borderRadius: 10,
                background: 'var(--primary)', color: '#fff',
                fontSize: '0.92rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0, transition: 'background 0.15s', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-dk)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary)' }}
              >일정 만들기</button>
            </div>

            {/* 퀵 칩 */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
              {(['도쿄', '오사카', '교토', '삿포로', '후쿠오카', '제주', '부산'] as const).map(city => (
                <button key={city} onClick={() => handleQuickDest(city, CITIES_JP.includes(city) ? 'JP' : 'KR')}
                  style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.78rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', transition: 'all 0.15s', backdropFilter: 'blur(4px)', fontFamily: 'inherit' }}
                  onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(255,255,255,0.3)' }}
                  onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(255,255,255,0.15)' }}
                >{DEST_EMOJI[city]} {city}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 통계 바 ─────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border-lt)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 48px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { num: '12,000+', label: '큐레이션 코스' },
            { num: '4.8',     label: '평균 만족도' },
            { num: '150+',    label: '국내외 여행지' },
            { num: '30일',    label: '최장 일정 지원' },
          ].map((s, i, arr) => (
            <div key={s.label} style={{ padding: '24px 0', textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid var(--border-lt)' : 'none' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.num}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 5, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 인기 여행지 ──────────────────────────────── */}
      <section id="popular" style={{ padding: '72px 48px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.12em', marginBottom: 8, textTransform: 'uppercase' }}>HOT DESTINATIONS</div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.2 }}>이번 달 인기 여행지</h2>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text3)', fontWeight: 500 }}>실시간 업데이트</span>
        </div>

        {/* Featured + Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {/* Featured — 좌측 큰 카드 */}
          <div
            onClick={() => handleQuickDest(featured.name, featured.countryCode === 'JP' ? 'JP' : 'KR')}
            style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-lt)', cursor: 'pointer', transition: 'all 0.22s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = '0 16px 40px rgba(0,0,0,0.12)' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ''; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            <div style={{ height: 320, overflow: 'hidden', position: 'relative' }}>
              <img src={featured.img} alt={featured.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.05)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = '' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)' }} />
              {featured.badge && <div style={{ position: 'absolute', top: 14, left: 14, background: 'var(--primary)', color: '#fff', borderRadius: 4, padding: '4px 10px', fontSize: '0.68rem', fontWeight: 800 }}>{featured.badge}</div>}
              <div style={{ position: 'absolute', bottom: 16, left: 18, right: 18 }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>{DEST_EMOJI[featured.name] ?? '✈️'} {featured.name}</div>
                <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                  {featured.tags.map(t => <span key={t} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 7px', borderRadius: 3, fontWeight: 600 }}>{t}</span>)}
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>★ {featured.rating} ({featured.reviews})</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--primary)' }}>{featured.price}</div>
            </div>
          </div>

          {/* 우측 2×2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 16 }}>
            {rest.slice(0, 4).map((d, i) => (
              <div key={i}
                onClick={() => handleQuickDest(d.name, d.countryCode === 'JP' ? 'JP' : 'KR')}
                style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border-lt)', cursor: 'pointer', transition: 'all 0.22s', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = '0 10px 28px rgba(0,0,0,0.1)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ''; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)' }}
              >
                <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                  <img src={d.img} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: 100, transition: 'transform 0.4s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.06)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = '' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.18)' }} />
                  {d.badge && <div style={{ position: 'absolute', top: 8, left: 8, background: 'var(--primary)', color: '#fff', borderRadius: 3, padding: '2px 7px', fontSize: '0.6rem', fontWeight: 800 }}>{d.badge}</div>}
                  <div style={{ position: 'absolute', bottom: 8, left: 10 }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>{DEST_EMOJI[d.name] ?? '✈️'} {d.name}</div>
                  </div>
                </div>
                <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text3)' }}>★ {d.rating}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)' }}>{d.price}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 기능 소개 ────────────────────────────────── */}
      <section style={{ background: 'var(--gray7)', borderTop: '1px solid var(--border-lt)', borderBottom: '1px solid var(--border-lt)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 48px' }}>
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.12em', marginBottom: 8, textTransform: 'uppercase' }}>WHY DAGALLE</div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em' }}>수천 명이 선택한 이유</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, background: 'var(--border-lt)', border: '1px solid var(--border-lt)', borderRadius: 16, overflow: 'hidden' }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ background: '#fff', padding: '28px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: '1.8rem' }}>{f.icon}</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.35 }}>{f.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text3)', lineHeight: 1.65 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 추천 코스 ────────────────────────────────── */}
      <section id="sample-itineraries" style={{ padding: '72px 48px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.12em', marginBottom: 8, textTransform: 'uppercase' }}>CURATED ITINERARIES</div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em' }}>
              검증된 <span style={{ color: 'var(--primary)' }}>베스트 일정</span>
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text3)', marginTop: 6, fontWeight: 400 }}>실제 여행자 후기와 현지 코스를 기반으로 구성한 검증된 일정이에요</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {SAMPLE_ITINERARIES.map(it => (
            <div key={it.id} onClick={() => setPreviewItinerary(it)}
              style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-lt)', cursor: 'pointer', transition: 'all 0.22s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-5px)'; el.style.boxShadow = '0 16px 40px rgba(0,0,0,0.1)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ''; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <div style={{ height: 200, overflow: 'hidden', position: 'relative' }}>
                <img src={it.imageUrl} alt={it.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.05)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = '' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.22)' }} />
                <div style={{ position: 'absolute', top: 12, left: 12 }}>
                  <span style={{ fontSize: '0.65rem', background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>🗓️ {it.nights}박{it.days}일</span>
                </div>
                <div style={{ position: 'absolute', top: 12, right: 12 }}>
                  <span style={{ fontSize: '0.65rem', background: 'var(--primary)', color: '#fff', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>
                    {it.countryCode === 'JP' ? '🇯🇵 일본' : it.countryCode === 'KR' ? '🇰🇷 국내' : '🌏 해외'}
                  </span>
                </div>
                <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14 }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.3 }}>{it.title}</div>
                </div>
              </div>

              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                  {it.tags.map(t => <span key={t} style={{ fontSize: '0.63rem', background: 'var(--gray7)', color: 'var(--text2)', padding: '2px 7px', borderRadius: 4, fontWeight: 600, border: '1px solid var(--border-lt)' }}>{t}</span>)}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text3)', lineHeight: 1.6, marginBottom: 14 }}>{it.highlight}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-lt)', paddingTop: 12 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>🚌 {it.transport} · {it.days}일</div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--primary)' }}>{it.estimatedCost}</div>
                </div>
                <div style={{ marginTop: 12, padding: '9px 0', background: 'var(--primary-bg)', borderRadius: 8, textAlign: 'center', border: '1px solid var(--primary-pale)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>일정 전체 보기 →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────── */}
      <section style={{ background: 'var(--primary)', padding: '64px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40 }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', marginBottom: 10, textTransform: 'uppercase' }}>무료 시작</div>
            <h2 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.25, marginBottom: 10 }}>
              첫 여행 일정,<br />지금 무료로 시작하세요
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', lineHeight: 1.6 }}>회원가입 후 무제한으로 여행 일정을 만들고 관리할 수 있어요</p>
          </div>
          <div style={{ flexShrink: 0 }}>
            <button onClick={() => isLoggedIn ? navigate('/travels') : navigate('/register')}
              style={{ display: 'block', padding: '16px 42px', borderRadius: 10, fontSize: '1rem', fontWeight: 800, background: '#fff', color: 'var(--primary)', border: 'none', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit', letterSpacing: '-0.01em' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none' }}
            >
              {isLoggedIn ? '내 여행 보러가기 →' : '무료로 시작하기 →'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 10, fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>신용카드 불필요 · 즉시 시작</div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────── */}
      <footer style={{ background: 'var(--black)', padding: '52px 48px 28px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 48, marginBottom: 36 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="#fff" stroke="none"/></svg>
                </div>
                <span style={{ fontSize: '1rem', fontWeight: 900, color: '#fff' }}>다갈래</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.7, maxWidth: 260 }}>
                검증된 현지 코스로 만드는 나만의 맞춤 여행 일정 서비스
              </p>
            </div>
            <div style={{ display: 'flex', gap: 52 }}>
              {[
                { title: '서비스', links: ['여행지 안내', '추천 코스', '베스트 일정'] },
                { title: '고객지원', links: ['자주 묻는 질문', '이용약관', '개인정보처리방침'] },
              ].map(col => (
                <div key={col.title}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', marginBottom: 14, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{col.title}</div>
                  {col.links.map(l => (
                    <a key={l} href="#" style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginBottom: 9, transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                    >{l}</a>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.18)' }}>© 2026 다갈래. All rights reserved.</span>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.18)' }}>대한민국 서울</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
