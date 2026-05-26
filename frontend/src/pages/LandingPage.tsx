import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { DEST_EMOJI } from '../constants/locations'
import { SAMPLE_ITINERARIES } from '../constants/sampleItineraries'
import type { SampleItinerary, SampleRoute } from '../constants/sampleItineraries'

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

const FEATURES = [
  {
    icon: '🤖',
    title: 'AI가 짜주는 일정',
    desc: '목적지만 입력하면 Claude AI가 실제 장소·동선·시간까지 완성된 여행 일정을 70초 안에 만들어줘요',
    gradient: 'linear-gradient(135deg, #667EEA, #764BA2)',
  },
  {
    icon: '🗺️',
    title: '지도로 한눈에',
    desc: 'Day별 동선이 지도에 표시되고, 구글 스트리트뷰로 장소를 미리 살펴볼 수 있어요',
    gradient: 'linear-gradient(135deg, #11998E, #38EF7D)',
  },
  {
    icon: '✏️',
    title: '언제든 수정 가능',
    desc: "마음에 안 드는 하루? AI에게 '저녁 식당을 스시로 바꿔줘'라고 하면 바로 반영돼요",
    gradient: 'linear-gradient(135deg, #F7971E, #FFD200)',
  },
  {
    icon: '💰',
    title: '비용 자동 계산',
    desc: '항공료·렌트카·숙박·현지 교통비까지 1인/팀 전체 예상 비용을 자동으로 계산해줘요',
    gradient: 'linear-gradient(135deg, #F953C6, #B91D73)',
  },
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
  const navigate = useNavigate()
  const [activeDay, setActiveDay] = useState(1)
  const day = itinerary.schedule.find(d => d.dayNumber === activeDay)!
  const [importing, setImporting] = useState(false)
  const [importErr, setImportErr] = useState('')

  const handleImport = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      onClose()
      navigate('/login')
      return
    }
    setImporting(true)
    setImportErr('')
    try {
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + itinerary.nights * 86400000).toISOString().split('T')[0]

      const res = await fetch('/api/v1/travels/import/sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: itinerary.title,
          countryCode: itinerary.countryCode,
          destination: itinerary.destination,
          startDate,
          endDate,
          transport: itinerary.transport,
          schedule: itinerary.schedule,
        }),
      })
      const data = await res.json()
      if (res.ok && data.data?.id) {
        onClose()
        navigate(`/travels/${data.data.id}`)
      } else {
        setImportErr(data.message ?? '일정 저장 중 오류가 발생했어요.')
      }
    } catch {
      setImportErr('네트워크 오류가 발생했어요.')
    } finally {
      setImporting(false)
    }
  }

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

        {/* ── 내 일정에 추가 버튼 ── */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #F0F0F0', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleImport}
            disabled={importing}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 12, border: 'none',
              background: importing ? '#C7D2FE' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: '#fff', fontSize: '0.95rem', fontWeight: 800, cursor: importing ? 'not-allowed' : 'pointer',
              boxShadow: importing ? 'none' : '0 4px 16px rgba(99,102,241,0.35)',
              transition: 'all 0.2s', letterSpacing: '-0.01em',
            }}
          >
            {importing ? '⏳ 저장 중...' : '✈️ 내 일정에 추가하기'}
          </button>
          <button onClick={onClose} style={{
            padding: '13px 20px', borderRadius: 12, border: '1.5px solid #E5E7EB',
            background: '#fff', color: '#6B7280', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer',
          }}>닫기</button>
        </div>
        {importErr && (
          <div style={{ padding: '8px 20px 14px', color: '#EF4444', fontSize: '0.78rem', textAlign: 'center' }}>{importErr}</div>
        )}

        {/* ── 타임라인 ── */}
        <div style={{ overflowY: 'auto', padding: '4px 20px 24px', flex: 1 }}>
          {places.map((place, pi) => {
            const prevRoute: SampleRoute | undefined = day.routes[pi - 1]
            const nextRoute: SampleRoute | undefined = day.routes[pi]

            const arrivalTime = pi === 0 ? null : addMins(prevRoute.departureTime, prevRoute.durationMinutes)
            const departureTime = nextRoute?.departureTime ?? null
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

                {/* 이동 수단 화살표 */}
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

export default function LandingPage() {
  const navigate = useNavigate()
  const isLoggedIn = !!localStorage.getItem('accessToken')
  const [previewItinerary, setPreviewItinerary] = useState<SampleItinerary | null>(null)

  const handleMakeTravel = () => {
    if (isLoggedIn) navigate('/travels')
    else navigate('/register')
  }

  const handleScrollToSamples = () => {
    const el = document.getElementById('sample-itineraries')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
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
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.78)', marginBottom: 40, lineHeight: 1.7 }}>
            목적지와 날짜만 입력하면 AI가 맞춤 여행 일정을 70초 안에 완성해드려요
          </p>

          {/* ── CTA 버튼 ── */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={handleMakeTravel}
              style={{
                padding: '16px 36px', borderRadius: 50, fontSize: '1rem', fontWeight: 800,
                background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(255,86,64,0.45)',
                transition: 'all 0.2s', letterSpacing: '-0.01em',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 40px rgba(255,86,64,0.55)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(255,86,64,0.45)' }}
            >
              ✨ 여행 만들기
            </button>
            <button
              onClick={handleScrollToSamples}
              style={{
                padding: '16px 36px', borderRadius: 50, fontSize: '1rem', fontWeight: 800,
                background: 'rgba(255,255,255,0.15)', color: '#fff',
                border: '2px solid rgba(255,255,255,0.5)', cursor: 'pointer',
                backdropFilter: 'blur(8px)', transition: 'all 0.2s', letterSpacing: '-0.01em',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.25)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)'; (e.currentTarget as HTMLButtonElement).style.transform = '' }}
            >
              📋 추천 일정 보기
            </button>
          </div>
        </div>
      </section>

      {/* ── 다갈래를 써야 하는 이유 ── */}
      <section style={{ background: '#fff', padding: '72px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.08em', marginBottom: 10, textTransform: 'uppercase' }}>왜 다갈래인가요?</div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.03em', lineHeight: 1.25 }}>
              다갈래를 써야 하는 이유
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {FEATURES.map(f => (
              <div
                key={f.title}
                style={{
                  background: '#fff', borderRadius: 16, border: '1px solid #F0F0F0',
                  padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ''; el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)' }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: f.gradient, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '1.4rem', marginBottom: 16,
                }}>
                  {f.icon}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: '0.8rem', color: '#666', lineHeight: 1.65 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div style={{ background: '#fff', borderTop: '1px solid #F0F0F0', borderBottom: '1px solid #F0F0F0' }}>
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
      <section id="sample-itineraries" style={{ padding: '56px 32px', maxWidth: 1100, margin: '0 auto' }}>
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
                <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: '0.7rem', fontWeight: 700 }}>
                  🗓️ {it.nights}박{it.days}일
                </div>
                <div style={{ position: 'absolute', top: 12, right: 12, background: 'var(--primary)', color: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: '0.7rem', fontWeight: 700 }}>
                  {it.countryCode === 'JP' ? '🇯🇵 일본' : it.countryCode === 'KR' ? '🇰🇷 국내' : '🌏 해외'}
                </div>
                <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.3 }}>{it.title}</div>
                </div>
              </div>

              {/* 본문 */}
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                  {it.tags.map(t => (
                    <span key={t} style={{ fontSize: '0.65rem', background: '#F3F4F6', color: '#555', padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>{t}</span>
                  ))}
                </div>

                <div style={{ fontSize: '0.75rem', color: '#555', lineHeight: 1.55, marginBottom: 12 }}>
                  ✨ {it.highlight}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F5F5F5', paddingTop: 12 }}>
                  <div style={{ fontSize: '0.7rem', color: '#999' }}>
                    🚌 {it.transport} &nbsp;|&nbsp; {it.days}일 일정
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {it.estimatedCost}
                  </div>
                </div>

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
            <div key={i}
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

      {/* ── CTA ── */}
      <section style={{ background: 'var(--primary)', padding: '56px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40 }}>
          <div>
            <h2 style={{ fontSize: '1.7rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.3 }}>첫 AI 여행 일정, 무료로 시작하세요</h2>
            <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.9rem' }}>회원가입 없이도 미리 체험 가능해요</p>
          </div>
          <button onClick={handleMakeTravel} style={{ padding: '14px 36px', borderRadius: 10, fontSize: '0.95rem', fontWeight: 800, background: '#fff', color: 'var(--primary)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', flexShrink: 0 }}
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
