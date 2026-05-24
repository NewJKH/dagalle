import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import MapView from '../components/MapView'
import type { MapRoute } from '../components/MapView'

// ── 타입 정의 ─────────────────────────────────────────
interface LocationInfo { id: number; name: string; lat: number; lng: number; description?: string | null; address?: string | null }
interface Route {
  id: number; sequence: number
  from: LocationInfo; to: LocationInfo
  transport: string; departureTime: string
  durationMinutes: number; distanceKm: number | null; estimatedCost: number
  note?: string | null
}
interface Day { dayNumber: number; date: string; routes: Route[] }
interface TravelInfo {
  id: number; title: string; startLocation: string; endLocation: string
  startDate: string; endDate: string; totalDays: number
  countryCode: string; withCar: boolean; departureFlightTime?: string; returnFlightTime?: string
}
interface CarRental { id: number; carType: string; dailyRateKrw: number; rentalDays: number; estimatedFuelKrw: number; estimatedTollKrw: number }
interface Accommodation { id: number; hotelName: string; checkIn: string; checkOut: string; pricePerNightKrw: number }
interface CostSummary { totalKrw: number; breakdown: { transport: number; fuel: number; accommodation: number; rental: number; food: number; etc: number } }

// ── 교통수단 스타일 ───────────────────────────────────
const T_ICON:  Record<string, string> = { CAR:'🚗', WALK:'🚶', SUBWAY:'🚇', BUS:'🚌', TRAIN:'🚂' }
const T_COLOR: Record<string, string> = { CAR:'#EF4444', WALK:'#10B981', SUBWAY:'#8B5CF6', BUS:'#F59E0B', TRAIN:'#0EA5E9' }
const T_BG:    Record<string, string> = { CAR:'#FFF1F1', WALK:'#ECFDF5', SUBWAY:'#F5F3FF', BUS:'#FFFBEB', TRAIN:'#EFF6FF' }
const T_LABEL: Record<string, string> = { CAR:'자동차', WALK:'도보', SUBWAY:'지하철', BUS:'버스', TRAIN:'기차' }

const GOOGLE_MAPS_KEY = 'AIzaSyCcBLM2p25kdXeAjFJBxFfo12E7jh-p9tw'

// ── 상태 타입 ─────────────────────────────────────────
type DayStatus = 'pending' | 'generating' | 'done' | 'error'

export default function TravelPlannerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [travel, setTravel]   = useState<TravelInfo | null>(null)
  const [days, setDays]       = useState<Day[]>([])
  const [dayStatus, setDayStatus] = useState<Record<number, DayStatus>>({})
  const [selectedDay, setSelectedDay] = useState(1)
  const [viewMode, setViewMode] = useState<'timeline' | 'map'>('timeline')

  const [carRental, setCarRental]       = useState<CarRental | null>(null)
  const [accommodations, setAccomm]     = useState<Accommodation[]>([])
  const [costSummary, setCostSummary]   = useState<CostSummary | null>(null)
  const [loading, setLoading]           = useState(true)
  // 지도 탭을 처음 열었을 때만 MapView 마운트 (display:none 상태에서 Google Maps 초기화 방지)
  const [mapEverShown, setMapEverShown] = useState(false)

  const token = () => localStorage.getItem('accessToken') || ''
  const h = () => ({ Authorization: `Bearer ${token()}` })

  // ── 초기 데이터 로딩 ──────────────────────────────
  useEffect(() => {
    if (!token()) { navigate('/login'); return }

    // 401 감지 헬퍼 — 만료된 토큰 → 로그인 페이지 이동
    const safeJson = (res: Response) => {
      if (res.status === 401) { navigate('/login'); return Promise.resolve(null) }
      return res.json().catch(() => null)
    }
    // 렌트카는 없을 수도 있으므로 404 시 null 반환
    const rentalJson = (res: Response) => {
      if (res.status === 401) { navigate('/login'); return Promise.resolve(null) }
      if (!res.ok) return Promise.resolve(null)
      return res.json().catch(() => null)
    }

    Promise.all([
      fetch(`/api/v1/travels/${id}`,               { headers: h() }).then(safeJson),
      fetch(`/api/v1/travels/${id}/days`,           { headers: h() }).then(safeJson),
      fetch(`/api/v1/travels/${id}/rental`,         { headers: h() }).then(rentalJson),
      fetch(`/api/v1/travels/${id}/accommodations`, { headers: h() }).then(safeJson),
      fetch(`/api/v1/travels/${id}/cost/summary`,   { headers: h() }).then(safeJson),
    ]).then(([tRes, dRes, rRes, aRes, cRes]) => {
      if (tRes?.data) setTravel(tRes.data)
      const loadedDays: Day[] = dRes?.data ?? []
      setDays(loadedDays)

      // 이미 생성된 Day 상태를 done으로 표시
      const status: Record<number, DayStatus> = {}
      const total = tRes?.data?.totalDays ?? 1
      for (let d = 1; d <= total; d++) {
        status[d] = loadedDays.find(ld => ld.dayNumber === d) ? 'done' : 'pending'
      }
      setDayStatus(status)

      // 생성된 Day 중 첫 번째 선택
      const firstDone = loadedDays[0]?.dayNumber ?? 1
      setSelectedDay(firstDone)

      if (rRes?.data) setCarRental(rRes.data)
      if (Array.isArray(aRes?.data)) setAccomm(aRes.data)
      if (cRes?.data) setCostSummary(cRes.data)
    }).catch(console.error)
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // ── Day 생성 ──────────────────────────────────────
  const generateDay = useCallback(async (dayNum: number) => {
    setDayStatus(s => ({ ...s, [dayNum]: 'generating' }))
    try {
      const res = await fetch(`/api/v1/travels/${id}/ai/day/${dayNum}`, {
        method: 'POST', headers: h(),
      })
      if (res.status === 401) { navigate('/login'); return }
      const data = await res.json()
      if (res.ok && data.data) {
        setDays(prev => {
          const filtered = prev.filter(d => d.dayNumber !== dayNum)
          return [...filtered, data.data].sort((a, b) => a.dayNumber - b.dayNumber)
        })
        setDayStatus(s => ({ ...s, [dayNum]: 'done' }))
        setSelectedDay(dayNum)
        // 비용 요약 갱신
        fetch(`/api/v1/travels/${id}/cost/summary`, { headers: h() })
          .then(r => r.json()).then(d => { if (d.data) setCostSummary(d.data) })
      } else {
        setDayStatus(s => ({ ...s, [dayNum]: 'error' }))
      }
    } catch {
      setDayStatus(s => ({ ...s, [dayNum]: 'error' }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const currentDay   = days.find(d => d.dayNumber === selectedDay)
  const totalDays    = travel?.totalDays ?? days.length
  const totalCost    = days.flatMap(d => d.routes).reduce((s, r) => s + r.estimatedCost, 0)
  const allDone      = Object.values(dayStatus).every(s => s === 'done')

  // 전체 Day의 MapRoute 변환 (지도에서 전 일정 동시 표시, day별 색상 구분)
  const mapRoutes: MapRoute[] = days.flatMap(day =>
    day.routes.map((r, i) => ({
      from: {
        name: r.from?.name ?? '', lat: r.from?.lat ?? 0, lng: r.from?.lng ?? 0,
        address: r.from?.address ?? undefined,
        // from 설명 = 이전 구간의 to 설명 (같은 장소)
        description: i > 0 ? day.routes[i - 1].to?.description : null,
      },
      to: {
        name: r.to?.name ?? '', lat: r.to?.lat ?? 0, lng: r.to?.lng ?? 0,
        address: r.to?.address ?? undefined,
        description: r.to?.description,
      },
      transport:       r.transport,
      sequence:        r.sequence,
      day:             day.dayNumber,
      estimatedCost:   r.estimatedCost,
      durationMinutes: r.durationMinutes,
      note:            r.note,
    }))
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ width: 40, height: 40, border: '4px solid var(--border)', borderTopColor: 'var(--sky)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}/>
    </div>
  )

  if (!travel) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontSize: '2.5rem' }}>⚠️</div>
      <p style={{ color: 'var(--text3)', fontSize: '0.95rem' }}>여행 정보를 불러올 수 없습니다.</p>
      <button onClick={() => navigate('/travels')} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: 'var(--sky)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>목록으로 돌아가기</button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', flex: 1, paddingTop: 64, height: 'calc(100vh - 64px)' }}>

        {/* ── 사이드바 ─────────────────────────────── */}
        <aside style={{ background: '#fff', borderRight: '1px solid var(--border-lt)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* 여행 헤더 */}
          <div style={{ background: 'linear-gradient(135deg, #0284C7, #38BDF8)', padding: '20px 20px 24px' }}>
            <button onClick={() => navigate('/travels')} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: 'rgba(255,255,255,0.9)', fontSize: '0.78rem', marginBottom: 14, cursor: 'pointer', padding: '5px 10px', fontFamily: 'inherit', fontWeight: 500 }}>← 목록으로</button>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>{travel?.title ?? '여행 플래너'}</h2>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span>📍 {travel?.startLocation} → {travel?.endLocation}</span>
              <span>·</span>
              <span>{totalDays}일</span>
              {travel?.withCar && <span>· 🚗 렌트카</span>}
            </div>
            {/* 항공편 시간 */}
            {(travel?.departureFlightTime || travel?.returnFlightTime) && (
              <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                {travel?.departureFlightTime && (
                  <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '5px 10px', fontSize: '0.7rem', color: '#fff' }}>
                    ✈️ 출발 {travel.departureFlightTime}
                  </div>
                )}
                {travel?.returnFlightTime && (
                  <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '5px 10px', fontSize: '0.7rem', color: '#fff' }}>
                    🔙 귀국 {travel.returnFlightTime}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Day 목록 */}
          <div style={{ padding: '16px', flex: 1 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.07em', marginBottom: 8 }}>DAY 선택</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Array.from({ length: totalDays }, (_, i) => i + 1).map(dayNum => {
                const status = dayStatus[dayNum] ?? 'pending'
                const day    = days.find(d => d.dayNumber === dayNum)
                const isSel  = selectedDay === dayNum
                const actualDate = travel
                  ? new Date(new Date(travel.startDate).getTime() + (dayNum - 1) * 86400000)
                      .toLocaleDateString('ko', { month: 'short', day: 'numeric', weekday: 'short' })
                  : ''

                return (
                  <div key={dayNum}
                    onClick={() => status === 'done' && setSelectedDay(dayNum)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 12,
                      border: isSel ? '1.5px solid var(--sky-pale)' : '1.5px solid transparent',
                      background: isSel ? 'var(--sky-bg)' : 'transparent',
                      cursor: status === 'done' ? 'pointer' : 'default',
                      transition: 'all 0.15s',
                    }}
                  >
                    {/* 상태 뱃지 */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: status === 'generating' ? '0.6rem' : '0.68rem',
                      fontWeight: 800,
                      background: isSel ? 'linear-gradient(135deg, var(--sky-lt), var(--sky-dk))'
                        : status === 'done' ? 'var(--mint-bg)'
                        : status === 'generating' ? '#FEF3C7'
                        : 'var(--bg)',
                      color: isSel ? '#fff'
                        : status === 'done' ? 'var(--mint)'
                        : status === 'generating' ? '#D97706'
                        : 'var(--text3)',
                      boxShadow: isSel ? '0 4px 12px rgba(14,165,233,0.3)' : 'none',
                    }}>
                      {status === 'generating' ? (
                        <span style={{ width: 14, height: 14, border: '2px solid #D97706', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}/>
                      ) : status === 'done' ? `D${dayNum}`
                        : status === 'error' ? '⚠'
                        : `D${dayNum}`}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isSel ? 'var(--sky-dk)' : 'var(--text)' }}>
                        {dayNum}일차
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text3)', marginTop: 1 }}>{actualDate}</div>
                    </div>

                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      {status === 'done' && day && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--text3)' }}>{day.routes.length}경로</div>
                      )}
                      {/* 생성/재생성 버튼 */}
                      {status === 'pending' || status === 'error' ? (
                        <button onClick={e => { e.stopPropagation(); generateDay(dayNum) }}
                          disabled={dayNum > 1 && dayStatus[dayNum - 1] !== 'done'}
                          style={{
                            padding: '4px 10px', borderRadius: 8, border: 'none', fontSize: '0.7rem', fontWeight: 700,
                            background: dayNum > 1 && dayStatus[dayNum - 1] !== 'done' ? 'var(--border)' : 'linear-gradient(135deg, #FBBF24, #F59E0B)',
                            color: '#fff', cursor: dayNum > 1 && dayStatus[dayNum - 1] !== 'done' ? 'not-allowed' : 'pointer',
                          }}>
                          {status === 'error' ? '재시도' : '생성'}
                        </button>
                      ) : status === 'done' ? (
                        <button onClick={e => { e.stopPropagation(); generateDay(dayNum) }}
                          style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.65rem', background: '#fff', color: 'var(--text3)', cursor: 'pointer' }}>
                          🔄
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 완료 안내 */}
            {allDone && (
              <div style={{ marginTop: 16, padding: '12px 14px', background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', borderRadius: 12, border: '1px solid #A7F3D0' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#059669', marginBottom: 4 }}>✅ 전체 일정 완성!</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>마음에 안 드는 Day는 🔄로 재생성 가능해요.</div>
              </div>
            )}
          </div>

          {/* 렌트카 */}
          {carRental && (
            <div style={{ padding: '0 16px 12px' }}>
              <div style={{ background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', borderRadius: 12, padding: '12px 14px', border: '1px solid #A7F3D0' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#059669', marginBottom: 5 }}>🚗 렌트카</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{carRental.carType}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginTop: 2 }}>
                  {carRental.dailyRateKrw?.toLocaleString()}원/일 × {carRental.rentalDays}일
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#059669', marginTop: 4 }}>
                  {((carRental.dailyRateKrw ?? 0) * (carRental.rentalDays ?? 0) + (carRental.estimatedFuelKrw ?? 0) + (carRental.estimatedTollKrw ?? 0)).toLocaleString()}원
                </div>
              </div>
            </div>
          )}

          {/* 숙박 */}
          {accommodations.length > 0 && (
            <div style={{ padding: '0 16px 12px' }}>
              <div style={{ background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', borderRadius: 12, padding: '12px 14px', border: '1px solid #DDD6FE' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--purple)', marginBottom: 5 }}>🏨 숙박</div>
                {accommodations.map(acc => {
                  const nights = Math.round((new Date(acc.checkOut).getTime() - new Date(acc.checkIn).getTime()) / 86400000)
                  return (
                    <div key={acc.id} style={{ marginBottom: 5 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{acc.hotelName}</div>
                      <div style={{ fontSize: '0.67rem', color: 'var(--text3)' }}>{acc.checkIn} ~ {acc.checkOut} ({nights}박)</div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--purple)' }}>{((acc.pricePerNightKrw ?? 0) * nights).toLocaleString()}원</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 총 비용 */}
          <div style={{ padding: '16px', borderTop: '1px solid var(--border-lt)' }}>
            <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', borderRadius: 14, padding: '16px 18px', border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--sky-dk)', fontWeight: 600, marginBottom: 4 }}>예상 총 비용</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--sky-dk)' }}>
                {(costSummary?.totalKrw ?? totalCost).toLocaleString()}<span style={{ fontSize: '0.85rem', fontWeight: 600, marginLeft: 2 }}>원</span>
              </div>
              {costSummary && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {([['교통', costSummary.breakdown.transport], ['연료', costSummary.breakdown.fuel], ['숙박', costSummary.breakdown.accommodation], ['렌트카', costSummary.breakdown.rental], ['식사', costSummary.breakdown.food], ['기타', costSummary.breakdown.etc]] as [string, number][])
                    .filter(([, v]) => v > 0)
                    .map(([label, val]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                        <span style={{ color: 'var(--text3)' }}>{label}</span>
                        <span style={{ fontWeight: 600, color: 'var(--sky-dk)' }}>{val.toLocaleString()}원</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── 메인 콘텐츠 ──────────────────────────── */}
        <main style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Day 헤더 + 뷰 전환 */}
          <div style={{ padding: '20px 32px 16px', background: '#fff', borderBottom: '1px solid var(--border-lt)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, background: 'var(--sky)', color: '#fff', padding: '3px 10px', borderRadius: 6 }}>DAY {selectedDay}</div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>
                  {currentDay?.date ?? '—'}
                </h2>
              </div>
              {currentDay && (
                <p style={{ fontSize: '0.82rem', color: 'var(--text3)' }}>
                  경로 {currentDay.routes.length}개 ·
                  예상 {currentDay.routes.reduce((s, r) => s + r.estimatedCost, 0).toLocaleString()}원
                </p>
              )}
            </div>

            {/* 타임라인 / 지도 전환 */}
            {currentDay && (
              <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 10, padding: 3, gap: 2 }}>
                {([['timeline', '📋 타임라인'], ['map', '🗺️ 지도']] as const).map(([mode, label]) => (
                  <button key={mode} onClick={() => { if (mode === 'map') setMapEverShown(true); setViewMode(mode) }}
                    style={{
                      padding: '8px 16px', borderRadius: 8, border: 'none', fontSize: '0.82rem', fontWeight: 700,
                      background: viewMode === mode ? '#fff' : 'transparent',
                      color: viewMode === mode ? 'var(--sky-dk)' : 'var(--text3)',
                      boxShadow: viewMode === mode ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>{label}</button>
                ))}
              </div>
            )}
          </div>

          {/* 콘텐츠 영역 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>

            {/* 생성 대기 상태 */}
            {dayStatus[selectedDay] === 'pending' && (
              <DayPendingCard dayNum={selectedDay} prevDone={selectedDay === 1 || dayStatus[selectedDay - 1] === 'done'} onGenerate={() => generateDay(selectedDay)} />
            )}
            {dayStatus[selectedDay] === 'generating' && <DayGeneratingCard dayNum={selectedDay} />}
            {dayStatus[selectedDay] === 'error' && (
              <div style={{ textAlign: 'center', padding: '60px 32px', background: '#fff', borderRadius: 20, border: '1px solid var(--border-lt)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚠️</div>
                <p style={{ color: 'var(--text3)', marginBottom: 20 }}>생성 중 오류가 발생했어요.</p>
                <button onClick={() => generateDay(selectedDay)} style={{ padding: '12px 24px', borderRadius: 12, border: 'none', fontWeight: 700, background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', color: '#fff', cursor: 'pointer' }}>다시 시도</button>
              </div>
            )}

            {/* Day 완성 — 타임라인 */}
            {dayStatus[selectedDay] === 'done' && currentDay && (
              <div style={{ display: viewMode === 'timeline' ? 'block' : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
                  {currentDay.routes.map((route, i) => (
                    <RouteCard key={route.id} route={route} isLast={i === currentDay.routes.length - 1} />
                  ))}
                </div>
                {/* 다음 Day 생성 유도 */}
                {selectedDay < totalDays && dayStatus[selectedDay + 1] === 'pending' && (
                  <NextDayBanner dayNum={selectedDay + 1} onGenerate={() => generateDay(selectedDay + 1)} />
                )}
              </div>
            )}

            {/* 지도 — 처음 지도 탭 클릭 시에만 마운트 (display:none 상태에서 Google Maps 초기화 방지) */}
            {mapEverShown && (
              <div style={{ display: viewMode === 'map' && mapRoutes.length > 0 ? 'block' : 'none', height: 'calc(100vh - 260px)' }}>
                <MapView routes={mapRoutes} apiKey={GOOGLE_MAPS_KEY} highlightDay={selectedDay} />
              </div>
            )}
          </div>
        </main>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
      `}</style>
    </div>
  )
}

// ── 서브 컴포넌트 ──────────────────────────────────────

function DayPendingCard({ dayNum, prevDone, onGenerate }: { dayNum: number; prevDone: boolean; onGenerate: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '72px 32px', background: '#fff', borderRadius: 20, border: '2px dashed var(--border)' }}>
      <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>✨</div>
      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 8 }}>{dayNum}일차 일정을 만들어볼까요?</h3>
      {!prevDone ? (
        <p style={{ color: 'var(--text3)', fontSize: '0.85rem' }}>{dayNum - 1}일차를 먼저 완성해주세요.</p>
      ) : (
        <>
          <p style={{ color: 'var(--text3)', fontSize: '0.85rem', marginBottom: 24 }}>Claude AI가 {dayNum}일차 동선을 생성합니다. (~15초)</p>
          <button onClick={onGenerate} style={{ padding: '14px 32px', borderRadius: 14, border: 'none', fontSize: '1rem', fontWeight: 700, background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', color: '#fff', boxShadow: '0 6px 20px rgba(245,158,11,0.4)', cursor: 'pointer' }}>
            ✨ {dayNum}일차 생성하기
          </button>
        </>
      )}
    </div>
  )
}

function DayGeneratingCard({ dayNum }: { dayNum: number }) {
  return (
    <div style={{ textAlign: 'center', padding: '72px 32px', background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)', borderRadius: 20, border: '1px solid #FDE68A' }}>
      <div style={{ width: 48, height: 48, border: '4px solid #FDE68A', borderTopColor: '#F59E0B', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite', marginBottom: 20 }}/>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#92400E', marginBottom: 8 }}>Claude AI가 {dayNum}일차를 구성 중...</h3>
      <p style={{ color: '#B45309', fontSize: '0.85rem', animation: 'pulse 2s infinite' }}>맛집·관광지·동선을 최적화하고 있어요. 약 15초 소요.</p>
    </div>
  )
}

function NextDayBanner({ dayNum, onGenerate }: { dayNum: number; onGenerate: () => void }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', borderRadius: 16, padding: '20px 24px', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--sky-dk)', marginBottom: 4 }}>👍 {dayNum - 1}일차 완성!</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text3)' }}>{dayNum}일차 일정도 만들어 볼까요?</div>
      </div>
      <button onClick={onGenerate} style={{ padding: '12px 22px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: '0.9rem', background: 'linear-gradient(135deg, var(--sky-lt), var(--sky-dk))', color: '#fff', boxShadow: '0 4px 14px rgba(14,165,233,0.3)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
        ✨ {dayNum}일차 생성
      </button>
    </div>
  )
}

function RouteCard({ route, isLast }: { route: Route; isLast: boolean }) {
  const icon  = T_ICON[route.transport]  ?? '🚀'
  const color = T_COLOR[route.transport] ?? '#0EA5E9'
  const bg    = T_BG[route.transport]    ?? '#EFF6FF'
  const label = T_LABEL[route.transport] ?? route.transport
  const timeStr = route.departureTime?.includes('T')
    ? route.departureTime.split('T')[1].substring(0, 5)
    : route.departureTime ?? ''

  return (
    <div style={{ display: 'flex', gap: 16, animation: 'fadeUp 0.4s ease both' }}>
      {/* 타임라인 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 52, flexShrink: 0 }}>
        <div style={{ fontSize: '0.66rem', color: '#fff', marginBottom: 6, fontWeight: 700, background: color, padding: '2px 7px', borderRadius: 6, whiteSpace: 'nowrap' }}>{timeStr}</div>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 0 4px ${color}25` }}/>
        {!isLast && <div style={{ width: 2, flex: 1, marginTop: 6, background: `linear-gradient(to bottom, ${color}60, var(--border-lt))`, borderRadius: 1 }}/>}
      </div>

      {/* 카드 */}
      <div style={{ flex: 1, background: '#fff', borderRadius: 18, padding: '16px 20px', border: `1px solid ${color}22`, boxShadow: `0 2px 12px ${color}0D`, marginBottom: isLast ? 0 : 4, transition: 'all 0.2s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 28px ${color}20`; (e.currentTarget as HTMLDivElement).style.transform = 'translateX(2px)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 2px 12px ${color}0D`; (e.currentTarget as HTMLDivElement).style.transform = '' }}
      >
        {/* 장소명 + 화살표 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', flexShrink: 0, marginTop: 2 }}>{icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>{route.from?.name ?? '출발지'}</span>
              <span style={{ color, fontSize: '0.85rem', fontWeight: 600 }}>→</span>
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>{route.to?.name ?? '도착지'}</span>
            </div>
            {/* 도착지 음식/장소 설명 */}
            {route.to?.description && (
              <div style={{
                fontSize: '0.78rem', color: 'var(--text2)', lineHeight: 1.55,
                background: `${color}08`, borderLeft: `3px solid ${color}40`,
                borderRadius: '0 6px 6px 0', padding: '5px 10px', marginBottom: 6,
              }}>
                {route.to.description}
              </div>
            )}
            {/* 이동수단 상세 note (공항 버스 등) */}
            {route.note && (
              <div style={{
                fontSize: '0.72rem', color: '#6366F1', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2,
              }}>
                <span>🗒</span><span>{route.note}</span>
              </div>
            )}
          </div>
        </div>
        {/* 이동 메타 정보 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: bg, color }}>{icon} {label}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>⏱ <strong style={{ color: 'var(--text2)' }}>{route.durationMinutes}분</strong></span>
          {route.distanceKm != null && <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>📏 <strong style={{ color: 'var(--text2)' }}>{route.distanceKm}km</strong></span>}
          {route.estimatedCost > 0 && <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>💰 <strong style={{ color: 'var(--text2)' }}>{route.estimatedCost.toLocaleString()}원</strong></span>}
        </div>
      </div>
    </div>
  )
}
