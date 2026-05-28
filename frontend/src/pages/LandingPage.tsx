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
  { img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=900&q=80', name: '도쿄',   country: '일본',   countryCode: 'JP', price: '89만원~', rating: '4.8', reviews: '2.4만', badge: 'BEST', tags: ['미식','쇼핑'] },
  { img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80', name: '제주',   country: '국내',   countryCode: 'KR', price: '32만원~', rating: '4.7', reviews: '1.8만', badge: '',      tags: ['힐링','자연'] },
  { img: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=600&q=80', name: '오사카', country: '일본',   countryCode: 'JP', price: '78만원~', rating: '4.7', reviews: '1.6만', badge: '',      tags: ['미식','쇼핑'] },
  { img: 'https://images.unsplash.com/photo-1583400212045-a2bde5b5efba?w=600&q=80', name: '부산',   country: '국내',   countryCode: 'KR', price: '19만원~', rating: '4.6', reviews: '2.1만', badge: '',      tags: ['바다','미식'] },
  { img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&q=80', name: '교토',   country: '일본',   countryCode: 'JP', price: '85만원~', rating: '4.8', reviews: '1.2만', badge: '',      tags: ['문화','역사'] },
  { img: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=600&q=80', name: '방콕',   country: '태국',   countryCode: 'TH', price: '74만원~', rating: '4.5', reviews: '9천',   badge: '',      tags: ['사원','야시장'] },
]

const FEATURES = [
  { icon: '🗓️', title: 'AI 맞춤 일정', desc: '원하는 스타일을 말하면 동선·시간·비용까지 최적화된 일정을 즉시 만들어드려요' },
  { icon: '🗺️', title: '지도로 한눈에', desc: 'Day별 동선이 지도에 펼쳐지고, 구글 스트리트뷰로 장소를 미리 살펴볼 수 있어요' },
  { icon: '✏️', title: '자유로운 수정', desc: '마음에 안 드는 구간은 AI에게 말하면 바로 바꿔드려요. 장소 추가·교체도 자유롭게' },
  { icon: '💰', title: '비용 한눈에', desc: '항공료·렌트카·숙박·현지 교통비까지 1인/팀 전체 예상 비용을 실시간으로 확인해요' },
  { icon: '👥', title: '팀 플래닝', desc: '친구·가족과 함께 일정을 만들어요. 실시간 채팅과 멤버 관리까지 한 곳에서' },
  { icon: '🔄', title: '실시간 동기화', desc: '팀원 모두가 동시에 일정을 보고 수정할 수 있어요. 변경사항이 즉시 반영돼요' },
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

// ── 샘플 일정 모달 ──────────────────────────────────────────
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 740, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

        {/* 헤더 이미지 */}
        <div style={{ position: 'relative', height: 195, flexShrink: 0, overflow: 'hidden' }}>
          <img src={itinerary.imageUrl} alt={itinerary.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.38)' }} />
          <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          <div style={{ position: 'absolute', bottom: 18, left: 22, right: 22 }}>
            <div style={{ display: 'flex', gap: 5, marginBottom: 7 }}>
              {itinerary.tags.map(t => <span key={t} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.18)', color: '#fff', padding: '2px 8px', borderRadius: 3, fontWeight: 600, border: '1px solid rgba(255,255,255,0.25)' }}>{t}</span>)}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>{itinerary.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>🗓️ {itinerary.nights}박{itinerary.days}일 &nbsp;·&nbsp; {itinerary.transport}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.55)', marginBottom: 2 }}>예상 비용</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff' }}>{itinerary.estimatedCost}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 일차 탭 */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-lt)', padding: '0 4px', flexShrink: 0, overflowX: 'auto' }}>
          {itinerary.schedule.map(d => (
            <button key={d.dayNumber} onClick={() => setActiveDay(d.dayNumber)} style={{
              padding: '11px 17px', fontSize: '0.78rem', fontWeight: 700, border: 'none', background: 'none',
              cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
              color: activeDay === d.dayNumber ? 'var(--primary)' : 'var(--text3)',
              borderBottom: activeDay === d.dayNumber ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -1,
            }}>{d.dayNumber}일차</button>
          ))}
        </div>

        <div style={{ padding: '11px 22px 5px', flexShrink: 0 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text2)' }}>{day.label}</div>
        </div>

        {/* 타임라인 */}
        <div style={{ overflowY: 'auto', padding: '8px 22px 0', flex: 1 }}>
          {places.map((place, pi) => {
            const prevRoute: SampleRoute | undefined = day.routes[pi - 1]
            const nextRoute: SampleRoute | undefined = day.routes[pi]
            const arrivalTime = pi === 0 ? null : addMins(prevRoute.departureTime, prevRoute.durationMinutes)
            const departureTime = nextRoute?.departureTime ?? null
            const stayMins = arrivalTime && departureTime ? diffMins(arrivalTime, departureTime) : null
            return (
              <div key={pi}>
                <div style={{ background: 'var(--gray7)', borderRadius: 10, border: '1px solid var(--border-lt)', padding: '13px 15px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fff', border: '1px solid var(--border-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{TYPE_ICON[place.type] ?? '📍'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text)' }}>{place.name}</span>
                        <span style={{ fontSize: '0.6rem', background: '#fff', color: 'var(--text3)', padding: '1px 5px', borderRadius: 3, fontWeight: 600, border: '1px solid var(--border-lt)' }}>{place.type}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {arrivalTime && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', background: 'var(--primary-bg)', padding: '2px 7px', borderRadius: 3, fontWeight: 600 }}>도착 {arrivalTime}</span>}
                        {stayMins !== null && stayMins > 0 && <span style={{ fontSize: '0.7rem', color: '#16A34A', background: '#F0FDF4', padding: '2px 7px', borderRadius: 3, fontWeight: 600 }}>체류 {stayMins}분</span>}
                      </div>
                      {place.description && <div style={{ fontSize: '0.73rem', color: 'var(--text3)', lineHeight: 1.55, marginTop: 5 }}>{place.description}</div>}
                    </div>
                  </div>
                </div>
                {nextRoute && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 12px', margin: '2px 0' }}>
                    <div style={{ width: 2, height: 20, background: 'var(--border)', marginLeft: 16, flexShrink: 0, borderRadius: 1 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff', borderRadius: 7, padding: '4px 10px', border: '1px solid var(--border-lt)' }}>
                      <span style={{ fontSize: '0.82rem' }}>{TRANS_ICON[nextRoute.transport] ?? '➡️'}</span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text2)' }}>{TRANS_LABEL[nextRoute.transport]} {nextRoute.durationMinutes}분</span>
                      {nextRoute.estimatedCost > 0 && <span style={{ fontSize: '0.63rem', color: 'var(--text3)' }}>₩{nextRoute.estimatedCost.toLocaleString()}</span>}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          <div style={{ height: 14 }} />
        </div>

        {/* 하단 버튼 */}
        <div style={{ padding: '13px 22px 18px', borderTop: '1px solid var(--border-lt)', flexShrink: 0 }}>
          {importErr && <div style={{ marginBottom: 9, color: 'var(--coral)', fontSize: '0.76rem', textAlign: 'center' }}>{importErr}</div>}
          <div style={{ display: 'flex', gap: 9 }}>
            <button onClick={onClose} style={{ padding: '11px 18px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', color: 'var(--text3)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>닫기</button>
            <button onClick={handleImport} disabled={importing} style={{
              flex: 1, padding: '11px 0', borderRadius: 8, border: 'none',
              background: importing ? 'var(--gray5)' : 'var(--primary)',
              color: '#fff', fontSize: '0.92rem', fontWeight: 700, cursor: importing ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}>
              {importing ? '저장 중...' : '✈️ 내 일정에 추가하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 메인 ─────────────────────────────────────────────────────
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
  const [destTab, setDestTab]           = useState<'ALL'|'JP'|'KR'|'TH'>('ALL')
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

  const displayedPopular = destTab === 'ALL' ? POPULAR : POPULAR.filter(p => p.countryCode === destTab)

  const QUICK_MENU = [
    { icon: '🗓️', label: 'AI 일정 만들기',  action: () => isLoggedIn ? navigate('/travels', { state: { openCreate: true } }) : navigate('/register') },
    { icon: '📍', label: '인기 여행지',       action: () => document.getElementById('sec-popular')?.scrollIntoView({ behavior: 'smooth' }) },
    { icon: '🗺️', label: '추천 코스',         action: () => document.getElementById('sec-courses')?.scrollIntoView({ behavior: 'smooth' }) },
    { icon: '💰', label: '여행 비용 계산',    action: () => isLoggedIn ? navigate('/travels') : navigate('/register') },
    { icon: '👥', label: '팀 여행',           action: () => isLoggedIn ? navigate('/travels') : navigate('/register') },
  ]

  return (
    <div style={{ background: '#fff', color: 'var(--text)' }}>
      {previewItinerary && <SampleModal itinerary={previewItinerary} onClose={() => setPreviewItinerary(null)} />}
      <Navbar />

      {/* ══════════════════════════════════════════════
          HERO — 중앙 정렬, 검색바 플로팅 카드
      ══════════════════════════════════════════════ */}
      <section style={{ position: 'relative', height: '72vh', minHeight: 520, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {/* 배경 */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1800&q=80)', backgroundSize: 'cover', backgroundPosition: 'center 40%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.44)' }} />

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', width: '100%', padding: '0 32px' }}>
          {/* 상단 레이블 */}
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.2em', marginBottom: 16, textTransform: 'uppercase' }}>
            AI TRAVEL PLANNER · 다갈래
          </p>

          {/* 메인 타이틀 */}
          <h1 style={{ fontSize: 'clamp(1.9rem, 4.2vw, 3rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1.25, marginBottom: 38 }}>
            어디로 떠나고 싶으세요?
          </h1>

          {/* ── 검색바 ── */}
          <div style={{ display: 'inline-flex', background: '#fff', borderRadius: 10, boxShadow: '0 6px 28px rgba(0,0,0,0.2)', overflow: 'visible', maxWidth: '100%' }}>

            {/* 여행지 */}
            <div ref={destRef} style={{ width: 188, padding: '11px 16px', borderRight: '1px solid var(--border-lt)', position: 'relative', textAlign: 'left' }}>
              <div style={{ fontSize: '0.57rem', fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase' }}>여행지</div>
              <input
                value={searchDest}
                onChange={e => { setSearchDest(e.target.value); setShowDrop(true) }}
                onFocus={() => setShowDrop(true)}
                placeholder="어디로 가시나요?"
                style={{ border: 'none', outline: 'none', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', width: '100%', background: 'transparent', fontFamily: 'inherit' }}
              />
              {showDrop && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: 238, background: '#fff', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 300, overflow: 'hidden', border: '1px solid var(--border-lt)' }}>
                  {filteredJP.length > 0 && (<>
                    <div style={{ padding: '10px 15px 4px', fontSize: '0.58rem', fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.1em' }}>🇯🇵 일본</div>
                    {filteredJP.slice(0, 6).map(city => (
                      <div key={city} onClick={() => { setSearchDest(city); setSearchCountry('JP'); setShowDrop(false) }}
                        style={{ padding: '9px 15px', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 600, color: 'var(--text)', display: 'flex', gap: 8, alignItems: 'center' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      ><span>{DEST_EMOJI[city] ?? '📍'}</span>{city}</div>
                    ))}
                  </>)}
                  {filteredKR.length > 0 && (<>
                    <div style={{ padding: '8px 15px 4px', borderTop: filteredJP.length > 0 ? '1px solid var(--border-lt)' : 'none', fontSize: '0.58rem', fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.1em' }}>🇰🇷 국내</div>
                    {filteredKR.slice(0, 4).map(city => (
                      <div key={city} onClick={() => { setSearchDest(city); setSearchCountry('KR'); setShowDrop(false) }}
                        style={{ padding: '9px 15px', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 600, color: 'var(--text)', display: 'flex', gap: 8, alignItems: 'center' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      ><span>{DEST_EMOJI[city] ?? '📍'}</span>{city}</div>
                    ))}
                  </>)}
                  {filteredJP.length === 0 && filteredKR.length === 0 && (
                    <div style={{ padding: '12px 15px', fontSize: '0.82rem', color: 'var(--text3)' }}>일치하는 여행지가 없어요</div>
                  )}
                </div>
              )}
            </div>

            {/* 여행 기간 */}
            <div style={{ padding: '11px 16px', borderRight: '1px solid var(--border-lt)', textAlign: 'left' }}>
              <div style={{ fontSize: '0.57rem', fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase' }}>여행 기간</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="date" value={searchStart} min={today} onChange={e => setSearchStart(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: '0.8rem', fontWeight: 600, color: searchStart ? 'var(--text)' : 'var(--text3)', background: 'transparent', width: 106, fontFamily: 'inherit' }} />
                <span style={{ color: 'var(--border)', fontSize: '0.9rem' }}>–</span>
                <input type="date" value={searchEnd} min={searchStart || today} onChange={e => setSearchEnd(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: '0.8rem', fontWeight: 600, color: searchEnd ? 'var(--text)' : 'var(--text3)', background: 'transparent', width: 106, fontFamily: 'inherit' }} />
              </div>
              {searchNights > 0 && <div style={{ fontSize: '0.63rem', color: 'var(--primary)', fontWeight: 700, marginTop: 2 }}>{searchNights}박 {searchNights + 1}일</div>}
            </div>

            {/* 인원 */}
            <div style={{ padding: '11px 14px', borderRight: '1px solid var(--border-lt)', textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.57rem', fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase' }}>인원</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setSearchTravelers(t => Math.max(1, t - 1))}
                  style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', lineHeight: 1 }}>−</button>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, minWidth: 14, textAlign: 'center', color: 'var(--text)' }}>{searchTravelers}</span>
                <button onClick={() => setSearchTravelers(t => Math.min(10, t + 1))}
                  style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', lineHeight: 1 }}>+</button>
              </div>
            </div>

            {/* 검색 버튼 */}
            <button onClick={handleSearch} style={{
              margin: 5, padding: '0 24px', borderRadius: 7,
              background: 'var(--primary)', color: '#fff',
              fontSize: '0.9rem', fontWeight: 700, border: 'none', cursor: 'pointer',
              whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-dk)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary)' }}
            >일정 만들기</button>
          </div>

          {/* 빠른 도시 칩 */}
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'center', marginTop: 18 }}>
            {(['도쿄', '오사카', '교토', '삿포로', '후쿠오카', '제주', '부산'] as const).map(city => (
              <button key={city} onClick={() => handleQuickDest(city, CITIES_JP.includes(city) ? 'JP' : 'KR')}
                style={{ padding: '5px 11px', borderRadius: 20, background: 'rgba(255,255,255,0.16)', color: '#fff', fontSize: '0.76rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.28)', cursor: 'pointer', transition: 'background 0.15s', fontFamily: 'inherit' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.26)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.16)' }}
              >{DEST_EMOJI[city]} {city}</button>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          퀵 서비스 메뉴 (visitkorea 스타일)
      ══════════════════════════════════════════════ */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border-lt)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex' }}>
          {QUICK_MENU.map((item, i) => (
            <button key={item.label} onClick={item.action}
              style={{ flex: 1, padding: '20px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9,
                border: 'none', borderRight: i < QUICK_MENU.length - 1 ? '1px solid var(--border-lt)' : 'none',
                background: 'none', cursor: 'pointer', transition: 'background 0.15s', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--gray7)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
            >
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--primary-bg)', border: '1px solid var(--primary-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>{item.icon}</div>
              <span style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          통계 바
      ══════════════════════════════════════════════ */}
      <div style={{ background: 'var(--gray7)', borderBottom: '1px solid var(--border-lt)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { num: '12,000+', label: '큐레이션 코스' },
            { num: '4.8 ★',   label: '평균 만족도' },
            { num: '150+',    label: '국내외 여행지' },
            { num: '30일',    label: '최장 일정 지원' },
          ].map((s, i, arr) => (
            <div key={s.label} style={{ padding: '18px 0', textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid var(--border-lt)' : 'none' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.num}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text3)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          인기 여행지 (탭 + 4열 균일 카드)
      ══════════════════════════════════════════════ */}
      <section id="sec-popular" style={{ padding: '52px 0', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 48px' }}>

          {/* 섹션 헤더 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.15em', marginBottom: 6, textTransform: 'uppercase' }}>Destinations</div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>인기 여행지</h2>
            </div>
            <button style={{ fontSize: '0.76rem', color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3 }}
              onClick={() => navigate('/register')}
            >전체 보기 →</button>
          </div>

          {/* 탭 */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-lt)', marginBottom: 24 }}>
            {([['ALL','전체'],['JP','일본'],['KR','국내'],['TH','동남아']] as const).map(([code, label]) => (
              <button key={code} onClick={() => setDestTab(code)}
                style={{ padding: '9px 18px', fontSize: '0.8rem', fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  color: destTab === code ? 'var(--primary)' : 'var(--text3)',
                  borderBottom: `2px solid ${destTab === code ? 'var(--primary)' : 'transparent'}`,
                  marginBottom: -1, transition: 'color 0.15s',
                }}>{label}</button>
            ))}
          </div>

          {/* 4열 카드 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {(displayedPopular.length > 0 ? displayedPopular : POPULAR).slice(0, 4).map(d => (
              <div key={d.name}
                onClick={() => handleQuickDest(d.name, d.countryCode)}
                style={{ borderRadius: 12, overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--border-lt)', background: '#fff', transition: 'box-shadow 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 22px rgba(0,0,0,0.1)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
              >
                {/* 이미지 영역 */}
                <div style={{ height: 175, position: 'relative', overflow: 'hidden' }}>
                  <img src={d.img} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.08)' }} />
                  {d.badge && (
                    <span style={{ position: 'absolute', top: 10, left: 10, background: 'var(--primary)', color: '#fff', fontSize: '0.56rem', fontWeight: 800, padding: '3px 7px', borderRadius: 3, letterSpacing: '0.05em' }}>{d.badge}</span>
                  )}
                  <span style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.42)', color: '#fff', fontSize: '0.58rem', fontWeight: 600, padding: '3px 7px', borderRadius: 3 }}>{d.country}</span>
                </div>

                {/* 텍스트 영역 */}
                <div style={{ padding: '14px 15px' }}>
                  <div style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
                    {DEST_EMOJI[d.name]} {d.name}
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                    {d.tags.map(t => (
                      <span key={t} style={{ fontSize: '0.6rem', background: 'var(--gray7)', color: 'var(--text3)', padding: '2px 6px', borderRadius: 3, fontWeight: 600, border: '1px solid var(--border-lt)' }}>{t}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-lt)', paddingTop: 10 }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text3)' }}>★ {d.rating} ({d.reviews})</span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary)' }}>{d.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          추천 여행 코스
      ══════════════════════════════════════════════ */}
      <section id="sec-courses" style={{ padding: '52px 0', background: 'var(--gray7)', borderTop: '1px solid var(--border-lt)', borderBottom: '1px solid var(--border-lt)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 48px' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.15em', marginBottom: 6, textTransform: 'uppercase' }}>Curated Courses</div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>추천 여행 코스</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text3)', marginTop: 4 }}>실제 여행자 후기를 기반으로 검증된 코스</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {SAMPLE_ITINERARIES.map(it => (
              <div key={it.id} onClick={() => setPreviewItinerary(it)}
                style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-lt)', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 22px rgba(0,0,0,0.1)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
              >
                {/* 이미지 */}
                <div style={{ height: 188, overflow: 'hidden', position: 'relative' }}>
                  <img src={it.imageUrl} alt={it.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.12)' }} />
                  <div style={{ position: 'absolute', top: 11, left: 11, display: 'flex', gap: 4 }}>
                    <span style={{ fontSize: '0.58rem', background: 'rgba(0,0,0,0.48)', color: '#fff', padding: '3px 7px', borderRadius: 3, fontWeight: 700 }}>
                      {it.countryCode === 'JP' ? '🇯🇵 일본' : it.countryCode === 'KR' ? '🇰🇷 국내' : '🌏 해외'}
                    </span>
                    <span style={{ fontSize: '0.58rem', background: 'rgba(0,0,0,0.48)', color: '#fff', padding: '3px 7px', borderRadius: 3, fontWeight: 700 }}>
                      {it.nights}박{it.days}일
                    </span>
                  </div>
                </div>

                {/* 내용 */}
                <div style={{ padding: '15px 16px' }}>
                  <div style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text)', marginBottom: 7, lineHeight: 1.35 }}>{it.title}</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                    {it.tags.map(t => (
                      <span key={t} style={{ fontSize: '0.6rem', background: 'var(--gray7)', color: 'var(--text2)', padding: '2px 6px', borderRadius: 3, fontWeight: 600, border: '1px solid var(--border-lt)' }}>{t}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text3)', lineHeight: 1.6, marginBottom: 12 }}>{it.highlight}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 11, borderTop: '1px solid var(--border-lt)' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text3)' }}>{it.transport}</span>
                    <span style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--primary)' }}>{it.estimatedCost}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          서비스 소개 (3×2 아이콘+텍스트 그리드)
      ══════════════════════════════════════════════ */}
      <section style={{ padding: '52px 0', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 48px' }}>

          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.15em', marginBottom: 6, textTransform: 'uppercase' }}>Features</div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>다갈래, 이런 점이 달라요</h2>
          </div>

          {/* 3×2 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--border-lt)', border: '1px solid var(--border-lt)', borderRadius: 12, overflow: 'hidden' }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ background: '#fff', padding: '24px 22px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, borderRadius: 9, background: 'var(--primary-bg)', border: '1px solid var(--primary-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text)', marginBottom: 5 }}>{f.title}</div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text3)', lineHeight: 1.65 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          CTA 배너 (흰 배경 스타일)
      ══════════════════════════════════════════════ */}
      <div style={{ background: 'var(--gray7)', borderTop: '1px solid var(--border-lt)', borderBottom: '1px solid var(--border-lt)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '44px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 7 }}>
              지금 바로 시작해보세요
            </h2>
            <p style={{ fontSize: '0.83rem', color: 'var(--text3)', lineHeight: 1.65 }}>
              무료 가입 후 무제한으로 여행 일정을 만들고 관리할 수 있어요 · 신용카드 불필요
            </p>
          </div>
          <button
            onClick={() => isLoggedIn ? navigate('/travels') : navigate('/register')}
            style={{ padding: '13px 34px', borderRadius: 8, fontSize: '0.92rem', fontWeight: 700, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', transition: 'background 0.15s', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-dk)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary)' }}
          >
            {isLoggedIn ? '내 여행 보기 →' : '무료로 시작하기 →'}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          푸터
      ══════════════════════════════════════════════ */}
      <footer style={{ background: '#1C1C1C', padding: '48px 48px 26px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 48, marginBottom: 32 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: 5, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="#fff" stroke="none"/></svg>
                </div>
                <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#fff' }}>다갈래</span>
              </div>
              <p style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.22)', lineHeight: 1.75, maxWidth: 240 }}>
                검증된 현지 코스로 만드는 나만의 맞춤 여행 일정 서비스
              </p>
            </div>
            <div style={{ display: 'flex', gap: 52 }}>
              {[
                { title: '서비스', links: ['여행지 안내', '추천 코스', '베스트 일정'] },
                { title: '고객지원', links: ['자주 묻는 질문', '이용약관', '개인정보처리방침'] },
              ].map(col => (
                <div key={col.title}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.35)', marginBottom: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{col.title}</div>
                  {col.links.map(l => (
                    <a key={l} href="#" style={{ display: 'block', fontSize: '0.76rem', color: 'rgba(255,255,255,0.22)', marginBottom: 8, textDecoration: 'none', transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.22)')}
                    >{l}</a>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.14)' }}>© 2026 다갈래. All rights reserved.</span>
            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.14)' }}>대한민국 서울</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
