import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import MapView from '../components/MapView'
import type { MapRoute } from '../components/MapView'
import GroupChat from '../components/GroupChat'
import MemberPanel from '../components/MemberPanel'
import { useAuthFetch } from '../hooks/useAuthFetch'
import { useWebSocket } from '../hooks/useWebSocket'

// ── 타입 정의 ─────────────────────────────────────────
interface LocationInfo { id: number; name: string; lat: number; lng: number; description?: string | null; address?: string | null; type?: string | null; placeId?: string | null }
interface Route {
  id: number; sequence: number
  from: LocationInfo; to: LocationInfo
  transport: string; departureTime: string
  durationMinutes: number; distanceKm: number | null; estimatedCost: number
  placeCost?: number | null   // 장소 소비 비용 (Google priceLevel 기반)
  note?: string | null
}
interface Day { dayNumber: number; date: string; routes: Route[] }
interface TravelInfo {
  id: number; title: string; startLocation: string; endLocation: string
  startDate: string; endDate: string; totalDays: number
  countryCode: string; withCar: boolean; departureFlightTime?: string; returnFlightTime?: string
  status?: string
}
interface CarRental { id: number; carType: string; dailyRateKrw: number; rentalDays: number; estimatedFuelKrw: number; estimatedTollKrw: number }
interface Accommodation { id: number; hotelName: string; checkIn: string; checkOut: string; pricePerNightKrw: number }
interface CostSummary {
  totalKrw: number
  flightPerPersonKrw: number
  teamTotalKrw: number
  perPersonKrw: number
  memberCount: number
  breakdown: { transport: number; fuel: number; accommodation: number; rental: number; flight: number; food: number; etc: number }
}
interface ChatMsg {
  id: number
  senderId: number
  senderName: string
  content: string
  sentAt: string
}
interface MemberInfo {
  memberId: number
  userId: number
  username: string
  email: string
  role: 'OWNER' | 'MEMBER' | 'VIEWER'
  roleDisplay: string
}

// ── 교통수단 스타일 ───────────────────────────────────
const T_ICON:  Record<string, string> = { CAR:'🚗', WALK:'🚶', SUBWAY:'🚇', BUS:'🚌', TRAIN:'🚂' }
const T_COLOR: Record<string, string> = { CAR:'#EF4444', WALK:'#10B981', SUBWAY:'#8B5CF6', BUS:'#F59E0B', TRAIN:'#0EA5E9' }
const T_BG:    Record<string, string> = { CAR:'#FFF1F1', WALK:'#ECFDF5', SUBWAY:'#F5F3FF', BUS:'#FFFBEB', TRAIN:'#EFF6FF' }
const T_LABEL: Record<string, string> = { CAR:'자동차', WALK:'도보', SUBWAY:'지하철', BUS:'버스', TRAIN:'기차' }

const GOOGLE_MAPS_KEY = 'AIzaSyCcBLM2p25kdXeAjFJBxFfo12E7jh-p9tw'

// ── 상태 타입 ─────────────────────────────────────────
type DayStatus = 'pending' | 'generating' | 'done' | 'error'

// ── 상태 뱃지 ─────────────────────────────────────
const STATUS_LABEL: Record<string, string> = { DRAFT: '계획 중', CONFIRMED: '확정됨', COMPLETED: '완료' }
const STATUS_COLOR: Record<string, string> = { DRAFT: '#0984E3', CONFIRMED: '#00B894', COMPLETED: '#888' }
const STATUS_BG:    Record<string, string> = { DRAFT: '#EBF4FF', CONFIRMED: '#E8FAF5', COMPLETED: '#F5F5F5' }

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

  // 제목 인라인 편집
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft]     = useState('')
  const [statusUpdating, setStatusUpdating] = useState(false)

  // 실시간 협업
  const [myUserId, setMyUserId]         = useState<number>(0)
  const [myRole, setMyRole]             = useState<'OWNER' | 'MEMBER' | 'VIEWER'>('VIEWER')
  const [showChat, setShowChat]         = useState(false)
  const [showMembers, setShowMembers]   = useState(false)
  const [newChatMsg, setNewChatMsg]     = useState<ChatMsg | null>(null)
  const [unreadCount, setUnreadCount]   = useState(0)
  const showChatRef = useRef(false)

  // Day별 사용자 희망사항 프롬프트
  const [dayPrompts, setDayPrompts] = useState<Record<number, string>>({})

  const authFetch = useAuthFetch()

  // ── WebSocket 실시간 이벤트 ─────────────────────────
  const travelIdNum = id ? parseInt(id) : null

  useWebSocket({
    travelId: travelIdNum,
    onScheduleUpdate: (data: any) => {
      if (data?.type === 'DAY_UPDATED' && data?.day) {
        const updatedDay: Day = data.day
        setDays(prev => {
          const filtered = prev.filter(d => d.dayNumber !== updatedDay.dayNumber)
          return [...filtered, updatedDay].sort((a, b) => a.dayNumber - b.dayNumber)
        })
        // routes가 있을 때만 done, 없으면 pending
        const newStatus: DayStatus = updatedDay.routes?.length > 0 ? 'done' : 'pending'
        setDayStatus(s => ({ ...s, [updatedDay.dayNumber]: newStatus }))
      }
    },
    onMemberUpdate: (_data: any) => {
      // 멤버 변경 시 역할 새로고침
      authFetch(`/api/v1/travels/${id}/members`)
        .then(r => r.json())
        .then(d => {
          if (d.success && Array.isArray(d.data)) {
            const me = d.data.find((m: MemberInfo) => m.userId === myUserId)
            if (me) setMyRole(me.role)
          }
        })
        .catch(() => {})
    },
    onChatMessage: (msg: ChatMsg) => {
      setNewChatMsg(msg)
      if (!showChatRef.current) setUnreadCount(n => n + 1)
    },
  })

  // ── 초기 데이터 로딩 ──────────────────────────────
  useEffect(() => {
    if (!localStorage.getItem('accessToken')) { navigate('/login'); return }

    // authFetch 가 401 자동 갱신 + navigate('/login') 처리
    const safeJson  = (res: Response) => res.json().catch(() => null)
    // 렌트카는 없을 수도 있으므로 404 시 null 반환
    const rentalJson = (res: Response) => res.ok ? res.json().catch(() => null) : Promise.resolve(null)

    Promise.all([
      authFetch(`/api/v1/travels/${id}`).then(safeJson),
      authFetch(`/api/v1/travels/${id}/days`).then(safeJson),
      authFetch(`/api/v1/travels/${id}/rental`).then(rentalJson),
      authFetch(`/api/v1/travels/${id}/accommodations`).then(safeJson),
      authFetch(`/api/v1/travels/${id}/cost/summary`).then(safeJson),
      authFetch('/api/v1/users/me').then(safeJson),
      authFetch(`/api/v1/travels/${id}/members`).then(safeJson),
    ]).then(([tRes, dRes, rRes, aRes, cRes, meRes, mRes]) => {
      if (tRes?.data) setTravel(tRes.data)
      const loadedDays: Day[] = dRes?.data ?? []
      setDays(loadedDays)

      // routes가 1개 이상인 Day만 done, 스켈레톤(0개)은 pending
      const status: Record<number, DayStatus> = {}
      const total = tRes?.data?.totalDays ?? 1
      for (let d = 1; d <= total; d++) {
        const found = loadedDays.find(ld => ld.dayNumber === d)
        status[d] = (found && found.routes.length > 0) ? 'done' : 'pending'
      }
      setDayStatus(status)

      // routes가 있는 첫 번째 Day 선택, 없으면 1일차
      const firstDone = loadedDays.find(ld => ld.routes.length > 0)?.dayNumber ?? 1
      setSelectedDay(firstDone)

      if (rRes?.data) setCarRental(rRes.data)
      if (Array.isArray(aRes?.data)) setAccomm(aRes.data)
      if (cRes?.data) setCostSummary(cRes.data)

      // 현재 유저 ID 및 역할 설정
      const meId: number = meRes?.data?.id ?? meRes?.data?.userId ?? 0
      if (meId) setMyUserId(meId)
      if (Array.isArray(mRes?.data) && meId) {
        const me = mRes.data.find((m: MemberInfo) => m.userId === meId)
        if (me) setMyRole(me.role)
      }

      // 아직 어떤 day도 없으면 → 1일차 pending으로 두기 (사용자가 프롬프트 입력 후 생성)
      // 과거 자동 생성 로직 제거 — 이제 DayPendingCard에서 직접 생성
    }).catch(console.error)
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // ── 여행 상태 변경 ─────────────────────────────────
  const updateStatus = async (newStatus: string) => {
    setStatusUpdating(true)
    try {
      const res = await authFetch(`/api/v1/travels/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (res.ok && data.data) setTravel(t => t ? { ...t, status: data.data.status } : t)
      else if (!res.ok && data.message) alert(data.message)
    } catch { /* ignore */ }
    setStatusUpdating(false)
  }

  // ── 제목 인라인 저장 ────────────────────────────────
  const saveTitle = async () => {
    if (!titleDraft.trim()) { setEditingTitle(false); return }
    try {
      const res = await authFetch(`/api/v1/travels/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleDraft.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.data) setTravel(t => t ? { ...t, title: data.data.title } : t)
    } catch { /* ignore */ }
    setEditingTitle(false)
  }

  // ── Day 생성 ──────────────────────────────────────
  const [aiErrorMsg, setAiErrorMsg] = useState<string | null>(null)

  const generateDay = useCallback(async (dayNum: number, wish?: string) => {
    setDayStatus(s => ({ ...s, [dayNum]: 'generating' }))
    setSelectedDay(dayNum)
    setAiErrorMsg(null)
    try {
      const body = wish?.trim() ? JSON.stringify({ userWish: wish.trim() }) : undefined
      const res = await authFetch(`/api/v1/travels/${id}/ai/day/${dayNum}`, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body,
      })
      const data = await res.json()
      if (res.ok && data.data) {
        setDays(prev => {
          const filtered = prev.filter(d => d.dayNumber !== dayNum)
          return [...filtered, data.data].sort((a, b) => a.dayNumber - b.dayNumber)
        })
        setDayStatus(s => ({ ...s, [dayNum]: 'done' }))
        // 프롬프트 초기화
        setDayPrompts(p => { const n = { ...p }; delete n[dayNum]; return n })
        // 비용 요약 갱신
        authFetch(`/api/v1/travels/${id}/cost/summary`)
          .then(r => r.json()).then(d => { if (d.data) setCostSummary(d.data) })
      } else {
        setDayStatus(s => ({ ...s, [dayNum]: 'error' }))
        // AI 크레딧 소진 여부 구분
        if (data?.code === 'AI_CREDIT_EXHAUSTED') {
          setAiErrorMsg('AI 크레딧이 소진되었습니다. 관리자에게 문의하거나 잠시 후 다시 시도해주세요.')
        } else {
          setAiErrorMsg(data?.message ?? 'AI 일정 생성에 실패했습니다.')
        }
      }
    } catch {
      setDayStatus(s => ({ ...s, [dayNum]: 'error' }))
      setAiErrorMsg('네트워크 오류가 발생했습니다.')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, authFetch])

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
        <aside style={{ background: '#fff', borderRight: '1px solid var(--border-lt)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* 여행 헤더 */}
          <div style={{ background: 'linear-gradient(135deg, #0284C7, #38BDF8)', padding: '20px 20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <button onClick={() => navigate('/travels')} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: 'rgba(255,255,255,0.9)', fontSize: '0.78rem', cursor: 'pointer', padding: '5px 10px', fontFamily: 'inherit', fontWeight: 500 }}>← 목록으로</button>
              {/* 상태 뱃지 */}
              {travel?.status && (
                <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: STATUS_BG[travel.status] ?? '#F5F5F5', color: STATUS_COLOR[travel.status] ?? '#888' }}>
                  {STATUS_LABEL[travel.status] ?? travel.status}
                </span>
              )}
            </div>
            {/* 제목 (클릭하면 편집) */}
            {editingTitle ? (
              <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                  style={{ flex: 1, fontSize: '0.92rem', fontWeight: 700, borderRadius: 6, border: 'none', padding: '4px 8px', background: 'rgba(255,255,255,0.9)', color: '#1A1A1A', outline: 'none', fontFamily: 'inherit' }}
                />
                <button onClick={saveTitle} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, color: '#fff', padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>저장</button>
              </div>
            ) : (
              <h2 onClick={() => { setTitleDraft(travel?.title ?? ''); setEditingTitle(true) }}
                title="클릭하여 제목 편집"
                style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', marginBottom: 4, cursor: 'text', display: 'flex', alignItems: 'center', gap: 6 }}>
                {travel?.title ?? '여행 플래너'}
                <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>✏️</span>
              </h2>
            )}
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

          {/* ── 요약 패널 (상단) ── */}
          <div style={{ flexShrink: 0, borderBottom: '1px solid var(--border-lt)', background: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', maxHeight: 300, overflowY: 'auto' }}>

            {allDone && (
              <div style={{ padding: '8px 10px', background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', borderRadius: 10, border: '1px solid #A7F3D0' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#059669', marginBottom: 2 }}>✅ 전체 일정 완성!</div>
                <div style={{ fontSize: '0.67rem', color: '#6B7280' }}>마음에 안 드는 Day는 🔄로 재생성 가능해요.</div>
              </div>
            )}

            <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', borderRadius: 12, padding: '10px 12px', border: '1px solid #BFDBFE' }}>
              {/* 1인 / 팀 경비 토글 탭 */}
              {costSummary ? (
                <>
                  {/* 1인 경비 */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--sky-dk)', fontWeight: 600, marginBottom: 2 }}>
                      👤 1인 예상 경비
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--sky-dk)', lineHeight: 1 }}>
                      {costSummary.perPersonKrw.toLocaleString()}<span style={{ fontSize: '0.7rem', fontWeight: 600, marginLeft: 2 }}>원</span>
                    </div>
                    <div style={{ fontSize: '0.63rem', color: '#64748B', marginTop: 2 }}>
                      ✈️ 항공 {costSummary.flightPerPersonKrw.toLocaleString()}원 포함
                    </div>
                  </div>

                  {/* 구분선 */}
                  <div style={{ borderTop: '1px dashed #BFDBFE', margin: '6px 0' }} />

                  {/* 팀 경비 */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: '0.65rem', color: '#7C3AED', fontWeight: 600, marginBottom: 2 }}>
                      👥 팀 전체 ({costSummary.memberCount}명)
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#7C3AED' }}>
                      {costSummary.teamTotalKrw.toLocaleString()}<span style={{ fontSize: '0.7rem', fontWeight: 600, marginLeft: 2 }}>원</span>
                    </div>
                    <div style={{ fontSize: '0.63rem', color: '#64748B', marginTop: 1 }}>
                      1인 {costSummary.perPersonKrw.toLocaleString()}원 × {costSummary.memberCount}명
                    </div>
                  </div>

                  {/* 구분선 */}
                  <div style={{ borderTop: '1px solid #BFDBFE', margin: '6px 0' }} />

                  {/* 항목별 breakdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {([
                      ['✈️ 항공', costSummary.breakdown.flight],
                      ['🚌 교통', costSummary.breakdown.transport],
                      ['⛽ 연료·주차', costSummary.breakdown.fuel],
                      ['🏨 숙박', costSummary.breakdown.accommodation],
                      ['🚗 렌트카', costSummary.breakdown.rental],
                      ['🍽️ 식사', costSummary.breakdown.food],
                    ] as [string, number][])
                      .filter(([, v]) => v > 0)
                      .map(([label, val]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.67rem' }}>
                          <span style={{ color: 'var(--text3)' }}>{label}</span>
                          <span style={{ fontWeight: 600, color: 'var(--sky-dk)' }}>{val.toLocaleString()}원</span>
                        </div>
                      ))}
                  </div>
                </>
              ) : (
                /* costSummary 없을 때 간단 표시 */
                <>
                  <div style={{ fontSize: '0.67rem', color: 'var(--sky-dk)', fontWeight: 600, marginBottom: 4 }}>예상 총 비용</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--sky-dk)' }}>
                    {totalCost.toLocaleString()}<span style={{ fontSize: '0.72rem', marginLeft: 2 }}>원</span>
                  </div>
                </>
              )}
            </div>

            {carRental && (
              <div style={{ background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', borderRadius: 10, padding: '10px 12px', border: '1px solid #A7F3D0' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#059669', marginBottom: 6 }}>🚗 렌트카 추천</div>
                {/* 차종 이름 */}
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#064E3B', marginBottom: 4, wordBreak: 'keep-all' }}>
                  {carRental.carType}
                </div>
                {/* 요금 세부 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.63rem' }}>
                    <span style={{ color: '#6B7280' }}>렌탈료</span>
                    <span style={{ fontWeight: 600, color: '#374151' }}>{(carRental.dailyRateKrw ?? 0).toLocaleString()}원 × {carRental.rentalDays}일</span>
                  </div>
                  {(carRental.estimatedFuelKrw ?? 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.63rem' }}>
                      <span style={{ color: '#6B7280' }}>⛽ 연료비 (예상)</span>
                      <span style={{ fontWeight: 600, color: '#374151' }}>{(carRental.estimatedFuelKrw ?? 0).toLocaleString()}원</span>
                    </div>
                  )}
                  {(carRental.estimatedTollKrw ?? 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.63rem' }}>
                      <span style={{ color: '#6B7280' }}>🛣️ 통행료 (예상)</span>
                      <span style={{ fontWeight: 600, color: '#374151' }}>{(carRental.estimatedTollKrw ?? 0).toLocaleString()}원</span>
                    </div>
                  )}
                </div>
                {/* 합계 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #A7F3D0', paddingTop: 6 }}>
                  <span style={{ fontSize: '0.63rem', color: '#6B7280' }}>렌트카 총액</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#059669' }}>
                    {((carRental.dailyRateKrw ?? 0) * (carRental.rentalDays ?? 0) + (carRental.estimatedFuelKrw ?? 0) + (carRental.estimatedTollKrw ?? 0)).toLocaleString()}원
                  </span>
                </div>
              </div>
            )}

            {accommodations.length > 0 && (
              <div style={{ background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', borderRadius: 10, padding: '8px 12px', border: '1px solid #DDD6FE' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--purple)', marginBottom: 3 }}>🏨 숙박</div>
                {accommodations.map(acc => {
                  const nights = Math.round((new Date(acc.checkOut).getTime() - new Date(acc.checkIn).getTime()) / 86400000)
                  // "N박차 비즈니스 호텔" 형식에서 호텔명 추출 (숫자박차 패턴 제거)
                  const cleanName = acc.hotelName.replace(/\s*\d+박차\s*/, ' ').trim()
                  const checkInDate = new Date(acc.checkIn)
                  const label = checkInDate.toLocaleDateString('ko', { month: 'short', day: 'numeric', weekday: 'short' })
                  return (
                    <div key={acc.id} style={{ marginBottom: 5, paddingBottom: 5, borderBottom: '1px dashed #DDD6FE' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, flex: 1, marginRight: 6, color: '#4C1D95' }}>{cleanName}</div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--purple)', flexShrink: 0 }}>{((acc.pricePerNightKrw ?? 0) * nights).toLocaleString()}원</div>
                      </div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text3)', marginTop: 1 }}>📅 {label} · {nights}박</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Day 목록 */}
          <div style={{ padding: '14px 16px', flex: 1, overflowY: 'auto' }}>
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
                    onClick={() => setSelectedDay(dayNum)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 12,
                      border: isSel ? '1.5px solid var(--sky-pale)' : '1.5px solid transparent',
                      background: isSel ? 'var(--sky-bg)' : 'transparent',
                      cursor: 'pointer',
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

          </div>

          {/* ── 상태 변경 버튼 (사이드바 하단) ── */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-lt)', background: '#F8FAFC', flexShrink: 0 }}>
            {travel?.status === 'DRAFT' && (
              <button onClick={() => updateStatus('CONFIRMED')} disabled={statusUpdating} style={{
                width: '100%', padding: '10px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #00B894, #00CEC9)', color: '#fff',
                fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', opacity: statusUpdating ? 0.6 : 1,
              }}>
                {statusUpdating ? '변경 중...' : '✅ 여행 확정하기'}
              </button>
            )}
            {travel?.status === 'CONFIRMED' && (
              <button onClick={() => updateStatus('COMPLETED')} disabled={statusUpdating} style={{
                width: '100%', padding: '10px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #636E72, #B2BEC3)', color: '#fff',
                fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', opacity: statusUpdating ? 0.6 : 1,
              }}>
                {statusUpdating ? '변경 중...' : '🏁 여행 완료 처리'}
              </button>
            )}
            {travel?.status === 'COMPLETED' && (
              <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#888', padding: '6px 0' }}>🏅 완료된 여행이에요</div>
            )}
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
                  {currentDay?.date
                    ? new Date(currentDay.date).toLocaleDateString('ko', { month: 'long', day: 'numeric', weekday: 'short' })
                    : '—'}
                </h2>
              </div>
              {currentDay && (
                <p style={{ fontSize: '0.82rem', color: 'var(--text3)' }}>
                  경로 {currentDay.routes.length}개 ·
                  예상 {currentDay.routes.reduce((s, r) => s + r.estimatedCost, 0).toLocaleString()}원
                  {selectedDay < (travel?.totalDays ?? 1) ? ` · ${selectedDay}/${travel?.totalDays ?? 1}일차` : ' · 마지막 날 🏁'}
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
              <DayPendingCard
                dayNum={selectedDay}
                prevDone={selectedDay === 1 || dayStatus[selectedDay - 1] === 'done'}
                wish={dayPrompts[selectedDay] ?? ''}
                onWishChange={v => setDayPrompts(p => ({ ...p, [selectedDay]: v }))}
                onGenerate={wish => generateDay(selectedDay, wish)}
              />
            )}
            {dayStatus[selectedDay] === 'generating' && <DayGeneratingCard dayNum={selectedDay} />}
            {dayStatus[selectedDay] === 'error' && (
              <>
                {aiErrorMsg && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12,
                    padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                    <span style={{ color: '#B91C1C', fontSize: '0.9rem', fontWeight: 600 }}>{aiErrorMsg}</span>
                  </div>
                )}
                <DayPendingCard
                  dayNum={selectedDay}
                  prevDone={selectedDay === 1 || dayStatus[selectedDay - 1] === 'done'}
                  wish={dayPrompts[selectedDay] ?? ''}
                  onWishChange={v => setDayPrompts(p => ({ ...p, [selectedDay]: v }))}
                  onGenerate={wish => generateDay(selectedDay, wish)}
                  isError
                />
              </>
            )}

            {/* Day 완성 — 타임라인 */}
            {dayStatus[selectedDay] === 'done' && currentDay && (
              <div style={{ display: viewMode === 'timeline' ? 'block' : 'none' }}>
                <PlaceTimeline routes={currentDay.routes} />
                {/* 다음 Day 생성 유도 */}
                {selectedDay < totalDays && dayStatus[selectedDay + 1] === 'pending' && (
                  <NextDayBanner dayNum={selectedDay + 1} onGenerate={() => setSelectedDay(selectedDay + 1)} />
                )}
                {/* AI 수정 요청 입력창 */}
                <DayModifyBox
                  travelId={id!}
                  dayNum={selectedDay}
                  onModified={(newDay) => {
                    setDays(prev => [...prev.filter(d => d.dayNumber !== newDay.dayNumber), newDay].sort((a, b) => a.dayNumber - b.dayNumber))
                    setDayStatus(s => ({ ...s, [newDay.dayNumber]: 'done' }))
                  }}
                />
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

      {/* ── 실시간 협업 FAB 버튼들 ─────────────────────── */}
      <div style={{
        position: 'fixed', left: 24, bottom: 24,
        display: 'flex', flexDirection: 'column', gap: 10, zIndex: 999,
      }}>
        {/* 멤버 버튼 */}
        <button
          onClick={() => setShowMembers(v => !v)}
          title="그룹 멤버"
          style={{
            width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: showMembers
              ? 'linear-gradient(135deg, #F97316, #EA580C)'
              : 'linear-gradient(135deg, #fff, #f8fafc)',
            color: showMembers ? '#fff' : '#F97316',
            fontSize: '1.3rem', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
            border: showMembers ? 'none' : '2px solid #FED7AA',
          } as React.CSSProperties}
        >
          👥
        </button>

        {/* 채팅 버튼 */}
        <button
          onClick={() => {
            const next = !showChatRef.current
            showChatRef.current = next
            setShowChat(next)
            if (next) setUnreadCount(0)
          }}
          title="그룹 채팅"
          style={{
            width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: showChat
              ? 'linear-gradient(135deg, #0EA5E9, #0284C7)'
              : 'linear-gradient(135deg, #fff, #f8fafc)',
            color: showChat ? '#fff' : '#0EA5E9',
            fontSize: '1.3rem', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
            position: 'relative',
            border: showChat ? 'none' : '2px solid #BAE6FD',
          } as React.CSSProperties}
        >
          💬
          {unreadCount > 0 && !showChat && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              background: '#EF4444', color: '#fff', borderRadius: '50%',
              width: 18, height: 18, fontSize: '0.65rem', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(239,68,68,0.5)',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* 그룹 채팅 패널 */}
      {showChat && myUserId > 0 && (
        <GroupChat
          travelId={travelIdNum!}
          myUserId={myUserId}
          newMessage={newChatMsg}
          onClose={() => setShowChat(false)}
        />
      )}

      {/* 멤버 패널 */}
      {showMembers && myUserId > 0 && (
        <MemberPanel
          travelId={travelIdNum!}
          myUserId={myUserId}
          myRole={myRole}
          onClose={() => setShowMembers(false)}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
      `}</style>
    </div>
  )
}

// ── 서브 컴포넌트 ──────────────────────────────────────

const WISH_EXAMPLES = [
  '맛집 위주로 짜줘',
  '쇼핑 많이 넣어줘',
  '박물관·문화 중심으로',
  '자연 경관 위주로',
  '여유롭게 느긋한 일정',
  '야경 꼭 포함해줘',
  '카페 투어 넣어줘',
  '현지인 동네 탐방',
]

function DayPendingCard({
  dayNum, prevDone, wish, onWishChange, onGenerate, isError
}: {
  dayNum: number
  prevDone: boolean
  wish: string
  onWishChange: (v: string) => void
  onGenerate: (wish: string) => void
  isError?: boolean
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 20, border: isError ? '2px solid #FECACA' : '2px dashed var(--border)', overflow: 'hidden', animation: 'fadeUp 0.35s ease both' }}>
      {/* 헤더 */}
      <div style={{ background: isError ? 'linear-gradient(135deg, #FEF2F2, #FFF1F1)' : 'linear-gradient(135deg, #FFFBEB, #FEF3C7)', padding: '32px 32px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>{isError ? '⚠️' : '✨'}</div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 6, color: isError ? '#B91C1C' : '#1e293b' }}>
          {isError ? `${dayNum}일차 생성 중 오류가 발생했어요` : `${dayNum}일차 일정을 어떻게 만들어드릴까요?`}
        </h3>
        <p style={{ color: 'var(--text3)', fontSize: '0.82rem' }}>
          {isError
            ? '아래에 원하는 스타일을 입력하고 다시 시도해보세요.'
            : `원하는 스타일을 적어주시면 AI가 맞춤 일정을 만들어드려요. (~15초)`}
        </p>
      </div>

      {/* 프롬프트 입력 영역 */}
      <div style={{ padding: '20px 28px 28px' }}>
        {!prevDone ? (
          <div style={{ textAlign: 'center', padding: '20px', background: '#F8FAFC', borderRadius: 12, color: 'var(--text3)', fontSize: '0.85rem' }}>
            ⚠️ {dayNum - 1}일차를 먼저 완성해주세요.
          </div>
        ) : (
          <>
            {/* 예시 칩 */}
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: 8 }}>💡 이런 스타일 어때요?</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {WISH_EXAMPLES.map(ex => (
                <button key={ex} onClick={() => onWishChange(ex)}
                  style={{
                    padding: '4px 10px', borderRadius: 20, border: '1px solid #FDE68A',
                    background: wish === ex ? '#FEF3C7' : '#fff', color: '#92400E',
                    fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  }}>{ex}</button>
              ))}
            </div>

            {/* 텍스트 입력 */}
            <textarea
              value={wish}
              onChange={e => onWishChange(e.target.value)}
              placeholder={`예: "오전엔 카페 투어, 오후엔 박물관, 저녁은 야경 맛집 코스로 짜줘"`}
              rows={3}
              maxLength={300}
              style={{
                width: '100%', borderRadius: 12, border: '1.5px solid #FDE68A',
                padding: '12px 14px', fontSize: '0.85rem', lineHeight: 1.6,
                resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                color: '#1e293b', background: '#FFFBEB', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#F59E0B'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.15)' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#FDE68A'; e.currentTarget.style.boxShadow = 'none' }}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onGenerate(wish) }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <span style={{ fontSize: '0.63rem', color: '#9CA3AF' }}>비워두면 AI가 자유롭게 구성 · ⌘+Enter로 생성</span>
              <span style={{ fontSize: '0.63rem', color: '#9CA3AF' }}>{wish.length}/300</span>
            </div>

            {/* 생성 버튼 */}
            <button
              onClick={() => onGenerate(wish)}
              style={{
                width: '100%', marginTop: 16, padding: '14px', borderRadius: 14, border: 'none',
                fontSize: '1rem', fontWeight: 700,
                background: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
                color: '#fff', boxShadow: '0 6px 20px rgba(245,158,11,0.4)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(245,158,11,0.5)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(245,158,11,0.4)' }}
            >
              {isError ? `🔄 ${dayNum}일차 다시 생성하기` : `✨ ${dayNum}일차 일정 만들기`}
            </button>
          </>
        )}
      </div>
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
        → {dayNum}일차로 이동
      </button>
    </div>
  )
}

// ── 장소 타입별 아이콘/색상 ───────────────────────────
const LOC_ICON: Record<string, string>  = { RESTAURANT:'🍽️', CAFE:'☕', HOTEL:'🏨', STATION:'🚉', AIRPORT:'✈️', SHOPPING:'🛍️', MUSEUM:'🏛️', PARK:'🌳', ETC:'📍' }
const LOC_COLOR: Record<string, string> = { RESTAURANT:'#EF4444', CAFE:'#92400E', HOTEL:'#7C3AED', STATION:'#0284C7', AIRPORT:'#0369A1', SHOPPING:'#DB2777', MUSEUM:'#B45309', PARK:'#16A34A', ETC:'#6366F1' }
const LOC_BG: Record<string, string>    = { RESTAURANT:'#FFF1F1', CAFE:'#FEF3C7', HOTEL:'#F5F3FF', STATION:'#EFF6FF', AIRPORT:'#E0F2FE', SHOPPING:'#FDF2F8', MUSEUM:'#FFFBEB', PARK:'#F0FDF4', ETC:'#EEF2FF' }

// ── 시간 유틸 ──────────────────────────────────────
function toHHmm(dt: string): string {
  if (!dt) return ''
  return dt.includes('T') ? dt.split('T')[1].substring(0, 5) : dt.substring(0, 5)
}
function addMinutes(hhmm: string, mins: number): string {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
function diffMinutes(from: string, to: string): number {
  if (!from || !to) return 0
  const [fh, fm] = from.split(':').map(Number)
  const [th, tm] = to.split(':').map(Number)
  return (th * 60 + tm) - (fh * 60 + fm)
}
function bufferMinutes(type?: string | null): number {
  switch (type) {
    case 'RESTAURANT': return 20
    case 'MUSEUM':     return 30
    case 'CAFE':       return 15
    case 'PARK':       return 20
    case 'SHOPPING':   return 20
    case 'HOTEL':      return 10
    default:           return 15
  }
}

// 차량 이동 시 교통 정체 여유 (이동 시간 비례)
function trafficBuffer(durationMins: number): number {
  if (durationMins < 15) return 0   // 근거리 이동은 정체 미반영
  if (durationMins < 40) return 10
  if (durationMins < 90) return 15
  if (durationMins < 150) return 20
  return 30
}

// ── 장소 중심 타임라인 ─────────────────────────────
function PlaceTimeline({ routes }: { routes: Route[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (!routes || routes.length === 0) return null

  // 장소 목록 추출: routes[0].from, 이후 각 routes[i].to
  const places: Array<{ loc: LocationInfo; arrivalTime: string; stayMins: number; idx: number; placeCost: number }> = []

  // 첫 번째 장소 (출발지)
  const firstDepart = toHHmm(routes[0].departureTime)
  places.push({ loc: routes[0].from, arrivalTime: firstDepart, stayMins: 0, idx: -1, placeCost: 0 })

  for (let i = 0; i < routes.length; i++) {
    const r = routes[i]
    const departTime = toHHmm(r.departureTime)
    const arrivalTime = addMinutes(departTime, r.durationMinutes)
    const nextDepartTime = i + 1 < routes.length ? toHHmm(routes[i + 1].departureTime) : ''
    const stayMins = nextDepartTime ? diffMinutes(arrivalTime, nextDepartTime) : 0
    places.push({ loc: r.to, arrivalTime, stayMins, idx: i, placeCost: r.placeCost ?? 0 })
  }


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 28, animation: 'fadeUp 0.4s ease both' }}>
      {places.map((place, pi) => {
        const isLast = pi === places.length - 1
        const isFirst = pi === 0
        const locId = `${place.loc.id ?? pi}-${pi}`
        const expanded = expandedId === locId
        const type = place.loc.type ?? 'ETC'
        const locIcon  = LOC_ICON[type]  ?? '📍'
        const locColor = LOC_COLOR[type] ?? '#6366F1'
        const locBg    = LOC_BG[type]    ?? '#EEF2FF'
        const buf = bufferMinutes(type)
        const departRoute = pi > 0 ? routes[pi - 1] : null  // 이 장소로 오는 route
        const nextRoute   = pi < routes.length ? routes[pi] : null  // 이 장소에서 나가는 route
        const carBuf = (departRoute?.transport === 'CAR') ? trafficBuffer(departRoute.durationMinutes) : 0

        return (
          <div key={locId}>
            {/* ── 이동 구간 (첫 장소 제외) ── */}
            {!isFirst && departRoute && (
              <MovementArrow route={departRoute} />
            )}

            {/* ── 장소 카드 ── */}
            <div
              onClick={() => setExpandedId(expanded ? null : locId)}
              style={{
                display: 'flex', gap: 14, cursor: 'pointer',
                padding: '14px 18px',
                background: expanded ? locBg : '#fff',
                borderRadius: 16,
                border: `1.5px solid ${expanded ? locColor + '55' : 'var(--border-lt)'}`,
                boxShadow: expanded ? `0 4px 20px ${locColor}18` : '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.2s',
                position: 'relative',
              }}
              onMouseEnter={e => { if (!expanded) { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 6px 20px ${locColor}15`; (e.currentTarget as HTMLDivElement).style.borderColor = `${locColor}44` } }}
              onMouseLeave={e => { if (!expanded) { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-lt)' } }}
            >
              {/* 타입 아이콘 */}
              <div style={{ width: 44, height: 44, borderRadius: 12, background: expanded ? '#fff' : locBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0, border: `1.5px solid ${locColor}30`, boxShadow: expanded ? `0 2px 8px ${locColor}20` : 'none', transition: 'all 0.2s' }}>
                {locIcon}
              </div>

              {/* 정보 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: place.loc.name.startsWith('⚠️') ? '#B45309' : 'var(--text)', lineHeight: 1.35, wordBreak: 'keep-all' }}>
                    {place.loc.name}
                  </span>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: 20, background: locBg, color: locColor, fontWeight: 700, border: `1px solid ${locColor}30`, flexShrink: 0 }}>{type}</span>
                    {place.loc.name.startsWith('⚠️') && (
                      <span style={{ fontSize: '0.62rem', background: '#FEF3C7', color: '#92400E', padding: '2px 7px', borderRadius: 4, border: '1px solid #FDE68A', fontWeight: 700, flexShrink: 0 }}>
                        구글 미확인
                      </span>
                    )}
                  </div>
                </div>

                {/* 도착 시간 + 체류 */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', background: locColor, padding: '2px 8px', borderRadius: 6 }}>
                    {isFirst ? '🚀 ' : '📍 '}{place.arrivalTime} 도착
                  </span>
                  {place.placeCost > 0 && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: locColor, background: locBg, border: `1px solid ${locColor}40`, padding: '2px 8px', borderRadius: 6 }}>
                      💳 {place.placeCost.toLocaleString()}원~
                    </span>
                  )}
                  {/* 교통 정체 여유 (CAR 이동 후) */}
                  {carBuf > 0 && (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#B45309', background: '#FEF3C7', padding: '2px 7px', borderRadius: 6, border: '1px solid #FDE68A' }}>
                      🚗 정체 +{carBuf}분
                    </span>
                  )}
                  {place.stayMins > 0 && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>
                      체류 <strong style={{ color: 'var(--text2)' }}>{place.stayMins}분</strong>
                      <span style={{ color: locColor, marginLeft: 4, fontWeight: 600 }}>+ {buf}분 여유</span>
                    </span>
                  )}
                  {nextRoute && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text3)', marginLeft: 'auto' }}>
                      출발 <strong style={{ color: 'var(--text2)' }}>{toHHmm(nextRoute.departureTime)}</strong>
                    </span>
                  )}
                </div>

                {/* 확장: 설명 + 주소 */}
                {expanded && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${locColor}25` }}>
                    {place.loc.description && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text2)', lineHeight: 1.6, marginBottom: 8, background: `${locColor}08`, borderLeft: `3px solid ${locColor}60`, borderRadius: '0 8px 8px 0', padding: '8px 12px' }}>
                        {place.loc.description}
                      </p>
                    )}
                    {place.loc.address && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>📌</span><span>{place.loc.address}</span>
                      </div>
                    )}
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ fontSize: '0.7rem', color: locColor, fontWeight: 600 }}>
                        ⏳ 장소 여유 +{buf}분 ({type === 'RESTAURANT' ? '음식 대기·식사' : type === 'MUSEUM' ? '관람 여유' : type === 'CAFE' ? '커피 즐기기' : '예비 시간'})
                      </div>
                      {carBuf > 0 && (
                        <div style={{ fontSize: '0.7rem', color: '#92400E', fontWeight: 600 }}>
                          🚗 교통 정체 +{carBuf}분 대비 (이동 {departRoute?.durationMinutes}분 구간)
                        </div>
                      )}
                    </div>

                    {/* Street View 이미지 */}
                    <img
                      src={`https://maps.googleapis.com/maps/api/streetview?size=440x150&location=${place.loc.lat},${place.loc.lng}&fov=90&pitch=5&key=${GOOGLE_MAPS_KEY}`}
                      alt={`${place.loc.name} 거리뷰`}
                      style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginTop: 10, display: 'block' }}
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />

                    {/* 외부 링크 버튼들 */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      <a
                        href={place.loc.placeId?.startsWith('ChIJ')
                          ? `https://www.google.com/maps/place/?q=place_id:${place.loc.placeId}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.loc.name}${place.loc.address ? ' ' + place.loc.address : ''}`)}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#4285F4', color: '#fff', borderRadius: 7, fontSize: '0.7rem', fontWeight: 700, textDecoration: 'none' }}
                      >
                        🗺️ 구글 지도
                      </a>
                      {type === 'HOTEL' && (
                        <>
                          <a
                            href={`https://www.booking.com/search.html?ss=${encodeURIComponent(place.loc.name)}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#003580', color: '#fff', borderRadius: 7, fontSize: '0.7rem', fontWeight: 700, textDecoration: 'none' }}
                          >
                            🏨 Booking.com
                          </a>
                          <a
                            href={`https://www.agoda.com/search?city=${encodeURIComponent(place.loc.name)}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#5C2D91', color: '#fff', borderRadius: 7, fontSize: '0.7rem', fontWeight: 700, textDecoration: 'none' }}
                          >
                            🏮 Agoda
                          </a>
                        </>
                      )}
                      {/* 구글 리뷰 — place_id 있으면 직링크, 없으면 지도 검색 */}
                      {(() => {
                        const pid = place.loc.placeId
                        const isGooglePlaceId = pid && pid.startsWith('ChIJ')
                        const reviewUrl = isGooglePlaceId
                          ? `https://www.google.com/maps/place/?q=place_id:${pid}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.loc.name + (place.loc.address ? ' ' + place.loc.address : ''))}`
                        return (
                          <a
                            href={reviewUrl}
                            target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#EA4335', color: '#fff', borderRadius: 7, fontSize: '0.7rem', fontWeight: 700, textDecoration: 'none' }}
                          >
                            ⭐ 구글 리뷰
                          </a>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* 펼치기 화살표 */}
              <div style={{ fontSize: '0.75rem', color: 'var(--text3)', flexShrink: 0, alignSelf: 'center', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>▼</div>
            </div>

            {/* 마지막 장소 아래 여백 */}
            {isLast && <div style={{ height: 8 }} />}
          </div>
        )
      })}

    </div>
  )
}

// ── Day AI 수정 입력창 ──────────────────────────────
const EXAMPLE_PROMPTS = [
  '오후에 카페 한 곳 추가해줘',
  '저녁 식당을 더 고급스럽게 바꿔줘',
  '쇼핑 시간 늘려줘',
  '오전 일정 여유롭게 바꿔줘',
  '박물관 대신 공원으로 바꿔줘',
  '야경 명소 추가해줘',
]

function DayModifyBox({ travelId, dayNum, onModified }: {
  travelId: string
  dayNum: number
  onModified: (day: Day) => void
}) {
  const [prompt, setPrompt] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const authFetch = useAuthFetch()

  const submit = async () => {
    if (!prompt.trim() || status === 'loading') return
    setStatus('loading')
    setErrMsg('')
    try {
      const res = await authFetch(`/api/v1/travels/${travelId}/ai/day/${dayNum}/modify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.data) {
        onModified(data.data)
        setStatus('done')
        setPrompt('')
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        setErrMsg(data.message ?? '수정 중 오류가 발생했어요.')
        setStatus('error')
      }
    } catch {
      setErrMsg('네트워크 오류가 발생했어요.')
      setStatus('error')
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
  }

  return (
    <div style={{ marginTop: 20, borderRadius: 18, border: '1.5px solid #E0E7FF', background: 'linear-gradient(135deg, #F0F4FF, #FAF5FF)', padding: '18px 20px', animation: 'fadeUp 0.4s ease both' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>✏️</div>
        <div>
          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#312E81' }}>AI에게 {dayNum}일차 수정 요청</div>
          <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: 1 }}>원하는 변경사항을 자유롭게 입력하면 AI가 일정을 조정해줘요</div>
        </div>
      </div>

      {/* 예시 프롬프트 칩 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {EXAMPLE_PROMPTS.map(ex => (
          <button key={ex} onClick={() => { setPrompt(ex); textareaRef.current?.focus() }}
            style={{ padding: '4px 10px', borderRadius: 20, border: '1px solid #C7D2FE', background: '#fff', color: '#4338CA', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = '#EEF2FF'; b.style.borderColor = '#818CF8' }}
            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = '#fff'; b.style.borderColor = '#C7D2FE' }}
          >{ex}</button>
        ))}
      </div>

      {/* 입력창 */}
      <div style={{ position: 'relative' }}>
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={e => { setPrompt(e.target.value); setStatus('idle') }}
          onKeyDown={handleKey}
          placeholder={`예: "오후에 온천 추가해줘", "저녁 식당을 스시 오마카세로 바꿔줘", "3시 이후 일정을 더 여유롭게"`}
          rows={3}
          maxLength={500}
          style={{
            width: '100%', borderRadius: 12, border: '1.5px solid #C7D2FE', padding: '12px 14px',
            fontSize: '0.85rem', lineHeight: 1.6, resize: 'vertical', outline: 'none',
            fontFamily: 'inherit', color: '#1E1B4B', background: '#fff',
            boxSizing: 'border-box', transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)' }}
          onBlur={e => { e.currentTarget.style.borderColor = '#C7D2FE'; e.currentTarget.style.boxShadow = 'none' }}
        />
        <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: '0.63rem', color: '#9CA3AF' }}>{prompt.length}/500</div>
      </div>

      {/* 하단: 단축키 안내 + 버튼 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>⌘+Enter 또는 Ctrl+Enter로 전송</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {status === 'done' && (
            <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, animation: 'fadeUp 0.3s ease' }}>✅ 수정 완료!</span>
          )}
          {status === 'error' && (
            <span style={{ fontSize: '0.72rem', color: '#EF4444' }}>⚠️ {errMsg}</span>
          )}
          <button
            onClick={submit}
            disabled={!prompt.trim() || status === 'loading'}
            style={{
              padding: '9px 20px', borderRadius: 10, border: 'none', fontSize: '0.83rem', fontWeight: 700,
              background: !prompt.trim() || status === 'loading'
                ? '#E0E7FF' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: !prompt.trim() || status === 'loading' ? '#A5B4FC' : '#fff',
              cursor: !prompt.trim() || status === 'loading' ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
              boxShadow: prompt.trim() && status !== 'loading' ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
            }}
          >
            {status === 'loading'
              ? <><span style={{ width: 14, height: 14, border: '2px solid #A5B4FC', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}/> AI 수정 중...</>
              : '✨ 수정 요청'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 이동 화살표 ────────────────────────────────────
function MovementArrow({ route }: { route: Route }) {
  const icon  = T_ICON[route.transport]  ?? '🚀'
  const color = T_COLOR[route.transport] ?? '#0EA5E9'
  const bg    = T_BG[route.transport]    ?? '#EFF6FF'
  const label = T_LABEL[route.transport] ?? route.transport

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 18px', margin: '4px 0' }}>
      {/* 선 */}
      <div style={{ width: 2, height: 36, background: `linear-gradient(to bottom, ${color}80, ${color}20)`, borderRadius: 1, marginLeft: 21 }} />
      {/* 이동 배지 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: bg, border: `1px solid ${color}30`, borderRadius: 20, padding: '5px 12px', flexShrink: 0 }}>
        <span style={{ fontSize: '0.8rem' }}>{icon}</span>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color }}>{label}</span>
        <span style={{ fontSize: '0.68rem', color: 'var(--text3)' }}>{route.durationMinutes}분</span>
        {route.estimatedCost > 0 && <span style={{ fontSize: '0.68rem', color: 'var(--text3)' }}>· {route.estimatedCost.toLocaleString()}원</span>}
        {route.note && <span style={{ fontSize: '0.65rem', color: '#6366F1', marginLeft: 2 }}>🗒 {route.note}</span>}
      </div>
    </div>
  )
}
