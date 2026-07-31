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
  placeCost?: number | null
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
interface ChatMsg { id: number; senderId: number; senderName: string; content: string; sentAt: string }
interface MemberInfo { memberId: number; userId: number; username: string; email: string; role: 'OWNER' | 'MEMBER' | 'VIEWER'; roleDisplay: string }

// ── 교통수단 스타일 ───────────────────────────────────
const T_ICON:  Record<string, string> = { CAR:'🚗', WALK:'🚶', SUBWAY:'🚇', BUS:'🚌', TRAIN:'🚂' }
const T_COLOR: Record<string, string> = { CAR:'#EF4444', WALK:'#10B981', SUBWAY:'#8B5CF6', BUS:'#F59E0B', TRAIN:'#0EA5E9' }
const T_BG:    Record<string, string> = { CAR:'#FFF1F1', WALK:'#ECFDF5', SUBWAY:'#F5F3FF', BUS:'#FFFBEB', TRAIN:'#EFF6FF' }
const T_LABEL: Record<string, string> = { CAR:'자동차', WALK:'도보', SUBWAY:'지하철', BUS:'버스', TRAIN:'기차' }

const GOOGLE_MAPS_KEY = 'AIzaSyCcBLM2p25kdXeAjFJBxFfo12E7jh-p9tw'

type DayStatus = 'pending' | 'generating' | 'done' | 'error'

const STATUS_LABEL: Record<string, string> = { DRAFT: '계획 중', CONFIRMED: '확정됨', COMPLETED: '완료' }
const STATUS_COLOR: Record<string, string> = { DRAFT: 'var(--primary)', CONFIRMED: '#16A34A', COMPLETED: 'var(--text3)' }
const STATUS_BG:    Record<string, string> = { DRAFT: 'var(--primary-bg)', CONFIRMED: '#F0FDF4', COMPLETED: 'var(--gray6)' }

export default function TravelPlannerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [travel, setTravel]   = useState<TravelInfo | null>(null)
  const [days, setDays]       = useState<Day[]>([])
  const [dayStatus, setDayStatus] = useState<Record<number, DayStatus>>({})
  const [selectedDay, setSelectedDay] = useState(1)
  const [viewMode, setViewMode] = useState<'timeline' | 'map'>('timeline')

  const [carRental, setCarRental]     = useState<CarRental | null>(null)
  const [accommodations, setAccomm]   = useState<Accommodation[]>([])
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null)
  const [loading, setLoading]         = useState(true)
  const [mapEverShown, setMapEverShown] = useState(false)

  // 제목 인라인 편집
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft]     = useState('')
  const [statusUpdating, setStatusUpdating] = useState(false)

  // 패널 토글
  const [showCostPanel, setShowCostPanel] = useState(false)
  const [showChat, setShowChat]           = useState(false)
  const [showMembers, setShowMembers]     = useState(false)

  // 실시간 협업
  const [myUserId, setMyUserId]   = useState<number>(0)
  const [myRole, setMyRole]       = useState<'OWNER' | 'MEMBER' | 'VIEWER'>('VIEWER')
  const [newChatMsg, setNewChatMsg] = useState<ChatMsg | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const showChatRef = useRef(false)

  // Day별 사용자 희망사항 프롬프트
  const [dayPrompts, setDayPrompts] = useState<Record<number, string>>({})
  const [aiErrorMsg, setAiErrorMsg] = useState<string | null>(null)

  const authFetch = useAuthFetch()
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
        const newStatus: DayStatus = updatedDay.routes?.length > 0 ? 'done' : 'pending'
        setDayStatus(s => ({ ...s, [updatedDay.dayNumber]: newStatus }))
      }
    },
    onMemberUpdate: (_data: any) => {
      authFetch(`/api/v1/travels/${id}/members`)
        .then(r => r.json())
        .then(d => {
          if (d.success && Array.isArray(d.data)) {
            const me = d.data.find((m: MemberInfo) => m.userId === myUserId)
            if (me) setMyRole(me.role)
          }
        }).catch(() => {})
    },
    onChatMessage: (msg: ChatMsg) => {
      setNewChatMsg(msg)
      if (!showChatRef.current) setUnreadCount(n => n + 1)
    },
  })

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) { navigate('/login'); return }
    const safeJson   = (res: Response) => res.json().catch(() => null)
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

      const status: Record<number, DayStatus> = {}
      const total = tRes?.data?.totalDays ?? 1
      for (let d = 1; d <= total; d++) {
        const found = loadedDays.find(ld => ld.dayNumber === d)
        status[d] = (found && found.routes.length > 0) ? 'done' : 'pending'
      }
      setDayStatus(status)

      const firstDone = loadedDays.find(ld => ld.routes.length > 0)?.dayNumber ?? 1
      setSelectedDay(firstDone)

      if (rRes?.data) setCarRental(rRes.data)
      if (Array.isArray(aRes?.data)) setAccomm(aRes.data)
      if (cRes?.data) setCostSummary(cRes.data)

      const meId: number = meRes?.data?.id ?? meRes?.data?.userId ?? 0
      if (meId) setMyUserId(meId)
      if (Array.isArray(mRes?.data) && meId) {
        const me = mRes.data.find((m: MemberInfo) => m.userId === meId)
        if (me) setMyRole(me.role)
      }
    }).catch(console.error).finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

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
        setDayPrompts(p => { const n = { ...p }; delete n[dayNum]; return n })
        authFetch(`/api/v1/travels/${id}/cost/summary`)
          .then(r => r.json()).then(d => { if (d.data) setCostSummary(d.data) })
      } else {
        setDayStatus(s => ({ ...s, [dayNum]: 'error' }))
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

  const currentDay = days.find(d => d.dayNumber === selectedDay)
  const totalDays  = travel?.totalDays ?? days.length
  const totalCost  = days.flatMap(d => d.routes).reduce((s, r) => s + r.estimatedCost, 0)
  const allDone    = Object.values(dayStatus).length > 0 && Object.values(dayStatus).every(s => s === 'done')

  const mapRoutes: MapRoute[] = days.flatMap(day =>
    day.routes.map((r, i) => ({
      from: { name: r.from?.name ?? '', lat: r.from?.lat ?? 0, lng: r.from?.lng ?? 0, address: r.from?.address ?? undefined, description: i > 0 ? day.routes[i - 1].to?.description : null },
      to:   { name: r.to?.name ?? '',   lat: r.to?.lat ?? 0,   lng: r.to?.lng ?? 0,   address: r.to?.address ?? undefined,   description: r.to?.description },
      transport: r.transport, sequence: r.sequence, day: day.dayNumber,
      estimatedCost: r.estimatedCost, durationMinutes: r.durationMinutes, note: r.note,
    }))
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray7)' }}>
      <div style={{ textAlign: 'center' }}>
        <span style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}/>
        <p style={{ marginTop: 16, color: 'var(--text3)', fontSize: '0.9rem' }}>여행 정보를 불러오는 중...</p>
      </div>
    </div>
  )

  if (!travel) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--gray7)' }}>
      <div style={{ fontSize: '2.5rem' }}>⚠️</div>
      <p style={{ color: 'var(--text3)', fontSize: '0.95rem' }}>여행 정보를 불러올 수 없습니다.</p>
      <button onClick={() => navigate('/travels')} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>목록으로 돌아가기</button>
    </div>
  )

  // ── 날짜 헬퍼 ──────────────────────────────────────
  const getDayDate = (dayNum: number) => {
    if (!travel) return ''
    const d = new Date(new Date(travel.startDate).getTime() + (dayNum - 1) * 86400000)
    return d.toLocaleDateString('ko', { month: 'short', day: 'numeric', weekday: 'short' })
  }

  const selectedDayObj = days.find(d => d.dayNumber === selectedDay)
  const selectedDayDate = selectedDayObj?.date
    ? new Date(selectedDayObj.date).toLocaleDateString('ko', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
    : getDayDate(selectedDay)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray7)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* ── 여행 헤더 영역 ─────────────────────────── */}
      <div style={{ paddingTop: 64, background: '#fff', borderBottom: '1px solid var(--border-lt)', position: 'sticky', top: 64, zIndex: 100 }}>

        {/* 상단 바: 뒤로가기 + 액션 버튼 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', height: 48, borderBottom: '1px solid var(--border-lt)' }}>
          <button
            onClick={() => navigate('/travels')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '0.82rem', fontWeight: 500, padding: '4px 0', fontFamily: 'inherit' }}
          >
            ← 내 여행 목록
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* 비용 패널 */}
            <button
              onClick={() => setShowCostPanel(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', borderRadius: 6, border: `1px solid ${showCostPanel ? 'var(--primary)' : 'var(--border)'}`,
                background: showCostPanel ? 'var(--primary-bg)' : '#fff',
                color: showCostPanel ? 'var(--primary)' : 'var(--text2)',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              💰 {costSummary ? `${costSummary.perPersonKrw.toLocaleString()}원` : '비용'}
            </button>

            {/* 멤버 */}
            <button
              onClick={() => setShowMembers(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', borderRadius: 6, border: `1px solid ${showMembers ? 'var(--primary)' : 'var(--border)'}`,
                background: showMembers ? 'var(--primary-bg)' : '#fff',
                color: showMembers ? 'var(--primary)' : 'var(--text2)',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              👥 멤버
            </button>

            {/* 채팅 */}
            <button
              onClick={() => {
                const next = !showChatRef.current
                showChatRef.current = next
                setShowChat(next)
                if (next) setUnreadCount(0)
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, position: 'relative',
                padding: '6px 14px', borderRadius: 6, border: `1px solid ${showChat ? 'var(--blue)' : 'var(--border)'}`,
                background: showChat ? 'var(--sky-bg)' : '#fff',
                color: showChat ? 'var(--blue)' : 'var(--text2)',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              💬 채팅
              {unreadCount > 0 && !showChat && (
                <span style={{ position: 'absolute', top: -5, right: -5, background: '#EF4444', color: '#fff', borderRadius: '50%', width: 17, height: 17, fontSize: '0.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* 구분선 */}
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

            {/* 상태 변경 */}
            {travel.status === 'DRAFT' && (
              <button onClick={() => updateStatus('CONFIRMED')} disabled={statusUpdating} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: statusUpdating ? 0.6 : 1 }}>
                {statusUpdating ? '처리 중...' : '여행 확정하기'}
              </button>
            )}
            {travel.status === 'CONFIRMED' && (
              <button onClick={() => updateStatus('COMPLETED')} disabled={statusUpdating} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: 'var(--gray3)', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: statusUpdating ? 0.6 : 1 }}>
                {statusUpdating ? '처리 중...' : '여행 완료'}
              </button>
            )}
            {travel.status === 'COMPLETED' && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>완료된 여행 🏅</span>
            )}
          </div>
        </div>

        {/* 여행 정보 */}
        <div style={{ padding: '16px 40px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              {/* 제목 */}
              {editingTitle ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <input
                    autoFocus
                    value={titleDraft}
                    onChange={e => setTitleDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                    style={{ fontSize: '1.5rem', fontWeight: 800, border: 'none', borderBottom: '2px solid var(--primary)', outline: 'none', background: 'transparent', color: 'var(--text)', fontFamily: 'inherit', width: 400 }}
                  />
                  <button onClick={saveTitle} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>저장</button>
                  <button onClick={() => setEditingTitle(false)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', color: 'var(--text3)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
                </div>
              ) : (
                <h1
                  onClick={() => { setTitleDraft(travel.title ?? ''); setEditingTitle(true) }}
                  style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', marginBottom: 6, cursor: 'text', display: 'inline-flex', alignItems: 'center', gap: 8, letterSpacing: '-0.02em' }}
                >
                  {travel.title ?? '여행 플래너'}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 400 }}>✏️</span>
                </h1>
              )}

              {/* 여행 메타 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {travel.status && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: STATUS_BG[travel.status] ?? 'var(--gray6)', color: STATUS_COLOR[travel.status] ?? 'var(--text3)', border: `1px solid ${STATUS_COLOR[travel.status]}30` }}>
                    {STATUS_LABEL[travel.status] ?? travel.status}
                  </span>
                )}
                <span style={{ fontSize: '0.82rem', color: 'var(--text3)' }}>
                  {travel.startLocation} → {travel.endLocation}
                </span>
                <span style={{ color: 'var(--border)', fontSize: '0.75rem' }}>|</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text3)' }}>
                  {new Date(travel.startDate).toLocaleDateString('ko', { month: 'short', day: 'numeric' })} – {new Date(travel.endDate).toLocaleDateString('ko', { month: 'short', day: 'numeric' })} ({totalDays}일)
                </span>
                {travel.withCar && (
                  <>
                    <span style={{ color: 'var(--border)', fontSize: '0.75rem' }}>|</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>🚗 렌트카</span>
                  </>
                )}
                {(travel.departureFlightTime || travel.returnFlightTime) && (
                  <>
                    <span style={{ color: 'var(--border)', fontSize: '0.75rem' }}>|</span>
                    {travel.departureFlightTime && <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>✈️ 출발 {travel.departureFlightTime}</span>}
                    {travel.returnFlightTime && <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>↩️ 귀국 {travel.returnFlightTime}</span>}
                  </>
                )}
                {allDone && <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>✅ 전체 완성</span>}
              </div>
            </div>
          </div>

          {/* Day 탭 + 뷰 전환 */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 2, overflowX: 'auto', paddingBottom: 0 }}>
              {Array.from({ length: totalDays }, (_, i) => i + 1).map(dayNum => {
                const status = dayStatus[dayNum] ?? 'pending'
                const isSel  = selectedDay === dayNum
                const dayDate = getDayDate(dayNum)

                // 탭 색상
                let dotColor = 'var(--gray4)'
                if (status === 'done')       dotColor = 'var(--primary)'
                if (status === 'generating') dotColor = '#F59E0B'
                if (status === 'error')      dotColor = '#EF4444'

                return (
                  <button
                    key={dayNum}
                    onClick={() => setSelectedDay(dayNum)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                      padding: '10px 20px 12px',
                      border: 'none',
                      borderBottom: isSel ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                      background: 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontFamily: 'inherit',
                      flexShrink: 0,
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {/* 상태 닷 */}
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: status === 'generating' ? 'transparent' : dotColor,
                        border: status === 'generating' ? '2px solid #F59E0B' : 'none',
                        animation: status === 'generating' ? 'spin 0.8s linear infinite' : 'none',
                        flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: '0.82rem', fontWeight: isSel ? 700 : 500,
                        color: isSel ? 'var(--primary)' : 'var(--text2)',
                      }}>
                        {dayNum}일차
                      </span>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: isSel ? 'var(--primary)' : 'var(--text3)', fontWeight: isSel ? 600 : 400 }}>
                      {dayDate}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* 타임라인 / 지도 전환 */}
            {dayStatus[selectedDay] === 'done' && (
              <div style={{ display: 'flex', background: 'var(--gray7)', borderRadius: 8, padding: 3, gap: 2, marginBottom: 10, flexShrink: 0 }}>
                {([['timeline', '📋 타임라인'], ['map', '🗺️ 지도']] as const).map(([mode, label]) => (
                  <button key={mode} onClick={() => { if (mode === 'map') setMapEverShown(true); setViewMode(mode) }}
                    style={{
                      padding: '6px 14px', borderRadius: 6, border: 'none', fontSize: '0.78rem', fontWeight: 600,
                      background: viewMode === mode ? '#fff' : 'transparent',
                      color: viewMode === mode ? 'var(--primary)' : 'var(--text3)',
                      boxShadow: viewMode === mode ? 'var(--shadow-sm)' : 'none',
                      cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                    }}>{label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 메인 콘텐츠 ──────────────────────────────── */}
      <main style={{ flex: 1 }}>

        {/* 선택된 Day 날짜 헤더 */}
        <div style={{ background: 'var(--gray7)', borderBottom: '1px solid var(--border-lt)', padding: '14px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: dayStatus[selectedDay] === 'done' ? 'var(--primary)' : 'var(--gray5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: dayStatus[selectedDay] === 'done' ? '#fff' : 'var(--text3)', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>
              D{selectedDay}
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>{selectedDayDate}</div>
              {currentDay && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 1 }}>
                  장소 {currentDay.routes.length + 1}곳 · 예상 {currentDay.routes.reduce((s, r) => s + r.estimatedCost, 0).toLocaleString()}원
                  {selectedDay === totalDays ? ' · 마지막 날 🏁' : ''}
                </div>
              )}
            </div>
          </div>

          {/* 빠른 생성 버튼 (done 상태일 때 재생성) */}
          {dayStatus[selectedDay] === 'done' && (
            <button
              onClick={() => generateDay(selectedDay)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 7, border: '1px solid var(--border)', background: '#fff', color: 'var(--text3)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)' }}
            >
              🔄 재생성
            </button>
          )}
        </div>

        {/* 콘텐츠 본문 */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px 60px' }}>

          {/* AI 에러 배너 */}
          {aiErrorMsg && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.1rem' }}>⚠️</span>
              <span style={{ color: '#B91C1C', fontSize: '0.88rem', fontWeight: 600 }}>{aiErrorMsg}</span>
              <button onClick={() => setAiErrorMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#B91C1C', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, fontFamily: 'inherit' }}>✕</button>
            </div>
          )}

          {/* 생성 대기 */}
          {dayStatus[selectedDay] === 'pending' && (
            <DayPendingCard
              dayNum={selectedDay}
              prevDone={selectedDay === 1 || dayStatus[selectedDay - 1] === 'done'}
              wish={dayPrompts[selectedDay] ?? ''}
              onWishChange={v => setDayPrompts(p => ({ ...p, [selectedDay]: v }))}
              onGenerate={wish => generateDay(selectedDay, wish)}
            />
          )}

          {/* 생성 중 */}
          {dayStatus[selectedDay] === 'generating' && <DayGeneratingCard dayNum={selectedDay} />}

          {/* 에러 */}
          {dayStatus[selectedDay] === 'error' && (
            <DayPendingCard
              dayNum={selectedDay}
              prevDone={selectedDay === 1 || dayStatus[selectedDay - 1] === 'done'}
              wish={dayPrompts[selectedDay] ?? ''}
              onWishChange={v => setDayPrompts(p => ({ ...p, [selectedDay]: v }))}
              onGenerate={wish => generateDay(selectedDay, wish)}
              isError
            />
          )}

          {/* 타임라인 */}
          {dayStatus[selectedDay] === 'done' && currentDay && (
            <div style={{ display: viewMode === 'timeline' ? 'block' : 'none' }}>
              <PlaceTimeline routes={currentDay.routes} completed={travel.status === 'COMPLETED'} />
              {selectedDay < totalDays && dayStatus[selectedDay + 1] === 'pending' && (
                <NextDayBanner dayNum={selectedDay + 1} onGenerate={() => setSelectedDay(selectedDay + 1)} />
              )}
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

          {/* 지도 */}
          {mapEverShown && (
            <div style={{ display: viewMode === 'map' && mapRoutes.length > 0 ? 'block' : 'none', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-lt)', height: 'calc(100vh - 320px)' }}>
              <MapView routes={mapRoutes} apiKey={GOOGLE_MAPS_KEY} highlightDay={selectedDay} />
            </div>
          )}
        </div>
      </main>

      {/* ── 비용 슬라이드 패널 ──────────────────────── */}
      {showCostPanel && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 340,
          background: '#fff', borderLeft: '1px solid var(--border-lt)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.08)',
          zIndex: 200, display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 0.25s ease',
        }}>
          {/* 패널 헤더 */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-lt)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>💰 예상 비용</h3>
            <button onClick={() => setShowCostPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '1.1rem', lineHeight: 1, fontFamily: 'inherit' }}>✕</button>
          </div>

          {/* 패널 콘텐츠 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* 비용 요약 */}
            {costSummary ? (
              <div style={{ background: 'var(--primary-bg)', borderRadius: 12, padding: '18px 20px', border: '1px solid var(--primary-pale)' }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text3)', fontWeight: 500, marginBottom: 4 }}>👤 1인 예상 경비</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {costSummary.perPersonKrw.toLocaleString()}<span style={{ fontSize: '0.9rem', fontWeight: 600, marginLeft: 4 }}>원</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text3)', marginTop: 4 }}>항공 {costSummary.flightPerPersonKrw.toLocaleString()}원 포함</div>
                </div>
                <div style={{ borderTop: '1px solid var(--primary-pale)', paddingTop: 12 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text3)', fontWeight: 500, marginBottom: 4 }}>👥 팀 전체 ({costSummary.memberCount}명)</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>{costSummary.teamTotalKrw.toLocaleString()}<span style={{ fontSize: '0.7rem', fontWeight: 500, marginLeft: 3 }}>원</span></div>
                </div>
              </div>
            ) : (
              <div style={{ background: 'var(--primary-bg)', borderRadius: 12, padding: '18px 20px', border: '1px solid var(--primary-pale)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginBottom: 4 }}>예상 총 비용</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {totalCost.toLocaleString()}<span style={{ fontSize: '0.9rem', fontWeight: 600, marginLeft: 4 }}>원</span>
                </div>
              </div>
            )}

            {/* 항목별 내역 */}
            {costSummary && (
              <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--border-lt)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.04em', marginBottom: 12 }}>항목별 내역</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {([
                    ['✈️', '항공', costSummary.breakdown.flight],
                    ['🚌', '교통', costSummary.breakdown.transport],
                    ['⛽', '연료·주차', costSummary.breakdown.fuel],
                    ['🏨', '숙박', costSummary.breakdown.accommodation],
                    ['🚗', '렌트카', costSummary.breakdown.rental],
                    ['🍽️', '식사', costSummary.breakdown.food],
                  ] as [string, string, number][])
                    .filter(([,, v]) => v > 0)
                    .map(([icon, label, val]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '0.9rem', width: 20, textAlign: 'center' }}>{icon}</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text2)' }}>{label}</span>
                        </div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>{val.toLocaleString()}원</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* 렌트카 */}
            {carRental && (
              <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--border-lt)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.04em', marginBottom: 10 }}>🚗 렌트카</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>{carRental.carType}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text3)' }}>렌탈료</span>
                    <span style={{ fontWeight: 600, color: 'var(--text2)' }}>{(carRental.dailyRateKrw ?? 0).toLocaleString()}원 × {carRental.rentalDays}일</span>
                  </div>
                  {(carRental.estimatedFuelKrw ?? 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text3)' }}>연료비</span>
                      <span style={{ fontWeight: 600, color: 'var(--text2)' }}>{(carRental.estimatedFuelKrw ?? 0).toLocaleString()}원</span>
                    </div>
                  )}
                  {(carRental.estimatedTollKrw ?? 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text3)' }}>통행료</span>
                      <span style={{ fontWeight: 600, color: 'var(--text2)' }}>{(carRental.estimatedTollKrw ?? 0).toLocaleString()}원</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-lt)', paddingTop: 8, marginTop: 2 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>합계</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {((carRental.dailyRateKrw ?? 0) * (carRental.rentalDays ?? 0) + (carRental.estimatedFuelKrw ?? 0) + (carRental.estimatedTollKrw ?? 0)).toLocaleString()}원
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 숙박 */}
            {accommodations.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--border-lt)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.04em', marginBottom: 12 }}>🏨 숙박</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {accommodations.map(acc => {
                    const nights = Math.round((new Date(acc.checkOut).getTime() - new Date(acc.checkIn).getTime()) / 86400000)
                    const cleanName = acc.hotelName.replace(/\s*\d+박차\s*/, ' ').trim()
                    const label = new Date(acc.checkIn).toLocaleDateString('ko', { month: 'short', day: 'numeric', weekday: 'short' })
                    return (
                      <div key={acc.id} style={{ paddingBottom: 10, borderBottom: '1px solid var(--border-lt)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', flex: 1 }}>{cleanName}</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>{((acc.pricePerNightKrw ?? 0) * nights).toLocaleString()}원</span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text3)', marginTop: 3 }}>{label} · {nights}박</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 채팅 패널 */}
      {showChat && myUserId > 0 && (
        <GroupChat travelId={travelIdNum!} myUserId={myUserId} newMessage={newChatMsg} onClose={() => { showChatRef.current = false; setShowChat(false) }} />
      )}

      {/* 멤버 패널 */}
      {showMembers && myUserId > 0 && (
        <MemberPanel travelId={travelIdNum!} myUserId={myUserId} myRole={myRole} onClose={() => setShowMembers(false)} />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
        @keyframes slideInRight { from { transform: translateX(40px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
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
    <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${isError ? '#FECACA' : 'var(--border-lt)'}`, overflow: 'hidden', animation: 'fadeUp 0.3s ease both' }}>
      {/* 헤더 */}
      <div style={{ padding: '32px 36px 24px', borderBottom: `1px solid ${isError ? '#FECACA' : 'var(--border-lt)'}`, textAlign: 'center', background: isError ? '#FEF2F2' : 'var(--gray7)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{isError ? '⚠️' : '✏️'}</div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8, color: isError ? '#B91C1C' : 'var(--text)', letterSpacing: '-0.01em' }}>
          {isError ? `${dayNum}일차 생성 중 오류가 발생했어요` : `${dayNum}일차, 어떻게 보내고 싶으세요?`}
        </h3>
        <p style={{ color: 'var(--text3)', fontSize: '0.85rem', lineHeight: 1.6 }}>
          {isError
            ? '원하는 스타일을 입력하고 다시 시도해보세요.'
            : '원하는 스타일을 적어주시면 AI가 맞춤 일정을 만들어드려요. (약 15초)'}
        </p>
      </div>

      <div style={{ padding: '24px 32px 32px' }}>
        {!prevDone ? (
          <div style={{ textAlign: 'center', padding: '24px', background: 'var(--gray7)', borderRadius: 10, color: 'var(--text3)', fontSize: '0.88rem', border: '1px solid var(--border-lt)' }}>
            {dayNum - 1}일차를 먼저 완성해주세요.
          </div>
        ) : (
          <>
            {/* 예시 칩 */}
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text3)', marginBottom: 10 }}>이런 스타일 어때요?</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {WISH_EXAMPLES.map(ex => (
                <button key={ex} onClick={() => onWishChange(ex)}
                  style={{
                    padding: '5px 12px', borderRadius: 20,
                    border: `1px solid ${wish === ex ? 'var(--primary)' : 'var(--border)'}`,
                    background: wish === ex ? 'var(--primary-bg)' : '#fff',
                    color: wish === ex ? 'var(--primary)' : 'var(--text2)',
                    fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                  }}>{ex}</button>
              ))}
            </div>

            <textarea
              value={wish}
              onChange={e => onWishChange(e.target.value)}
              placeholder={`예: "오전엔 카페 투어, 오후엔 박물관, 저녁은 야경 맛집 코스로 짜줘"`}
              rows={3}
              maxLength={300}
              style={{
                width: '100%', borderRadius: 10, border: '1.5px solid var(--border)',
                padding: '12px 16px', fontSize: '0.88rem', lineHeight: 1.6,
                resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                color: 'var(--text)', background: '#fff', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-pale)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onGenerate(wish) }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 16 }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text3)' }}>비워두면 AI가 자유롭게 구성 · ⌘+Enter로 생성</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text3)' }}>{wish.length}/300</span>
            </div>

            <button
              onClick={() => onGenerate(wish)}
              style={{
                width: '100%', padding: '14px', borderRadius: 10, border: 'none',
                fontSize: '0.95rem', fontWeight: 700,
                background: 'var(--primary)', color: '#fff',
                cursor: 'pointer', transition: 'background 0.15s', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-dk)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary)' }}
            >
              {isError ? `${dayNum}일차 다시 생성하기` : `${dayNum}일차 일정 만들기`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function DayGeneratingCard({ dayNum }: { dayNum: number }) {
  return (
    <div style={{ textAlign: 'center', padding: '72px 32px', background: '#fff', borderRadius: 16, border: '1px solid var(--border-lt)' }}>
      <div style={{ width: 44, height: 44, border: '3px solid var(--primary-pale)', borderTopColor: 'var(--primary)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite', marginBottom: 24 }}/>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8, letterSpacing: '-0.01em' }}>AI가 {dayNum}일차를 구성하는 중...</h3>
      <p style={{ color: 'var(--text3)', fontSize: '0.85rem' }}>맛집·관광지·동선을 최적화하고 있어요. 약 15초 소요.</p>
    </div>
  )
}

function NextDayBanner({ dayNum, onGenerate }: { dayNum: number; onGenerate: () => void }) {
  return (
    <div style={{ background: 'var(--primary-bg)', borderRadius: 12, padding: '20px 24px', border: '1px solid var(--primary-pale)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
      <div>
        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{dayNum - 1}일차 완성!</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text3)' }}>{dayNum}일차 일정도 만들어 볼까요?</div>
      </div>
      <button onClick={onGenerate} style={{ padding: '10px 22px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: '0.88rem', background: 'var(--primary)', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
        {dayNum}일차로 이동 →
      </button>
    </div>
  )
}

// ── 장소 타입별 아이콘/색상 ───────────────────────────
const LOC_ICON:  Record<string, string> = { RESTAURANT:'🍽️', CAFE:'☕', HOTEL:'🏨', STATION:'🚉', AIRPORT:'✈️', SHOPPING:'🛍️', MUSEUM:'🏛️', PARK:'🌳', ETC:'📍' }
const LOC_COLOR: Record<string, string> = { RESTAURANT:'#EF4444', CAFE:'#92400E', HOTEL:'#7C3AED', STATION:'#0284C7', AIRPORT:'#0369A1', SHOPPING:'#DB2777', MUSEUM:'#B45309', PARK:'#16A34A', ETC:'#6366F1' }
const LOC_BG:    Record<string, string> = { RESTAURANT:'#FFF1F1', CAFE:'#FEF3C7', HOTEL:'#F5F3FF', STATION:'#EFF6FF', AIRPORT:'#E0F2FE', SHOPPING:'#FDF2F8', MUSEUM:'#FFFBEB', PARK:'#F0FDF4', ETC:'#EEF2FF' }

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
function trafficBuffer(durationMins: number): number {
  if (durationMins < 15)  return 0
  if (durationMins < 40)  return 10
  if (durationMins < 90)  return 15
  if (durationMins < 150) return 20
  return 30
}

// 여행 완료 후 식당 별점 — 클릭 시 해당 식당 추천 점수만 즉시 갱신(이벤트 기반)
function StarRating({ locationId, color }: { locationId: number; color: string }) {
  const authFetch = useAuthFetch()
  const [rating, setRating]   = useState(0)
  const [hover, setHover]     = useState(0)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState(false)

  const submit = async (value: number) => {
    setRating(value); setSaving(true); setSaved(false); setError(false)
    try {
      const res = await authFetch(`/api/v1/restaurants/${locationId}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: value }),
      })
      if (res.ok) setSaved(true)
      else setError(true)
    } catch { setError(true) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${color}20` }}>
      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>
        이 식당, 다시 갈 만했나요?
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n}
            onClick={e => { e.stopPropagation(); if (!saving) submit(n) }}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            style={{ fontSize: '1.4rem', cursor: saving ? 'wait' : 'pointer', lineHeight: 1, color: (hover || rating) >= n ? '#F59E0B' : 'var(--border)', transition: 'color 0.12s', filter: (hover || rating) >= n ? 'none' : 'grayscale(1)' }}
          >★</span>
        ))}
        {saved  && <span style={{ marginLeft: 8, fontSize: '0.72rem', color: '#16A34A', fontWeight: 700 }}>등록됐어요! 추천 점수에 반영됩니다</span>}
        {error  && <span style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--coral)', fontWeight: 700 }}>잠시 후 다시 시도해주세요</span>}
        {saving && <span style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--text3)' }}>저장 중…</span>}
      </div>
    </div>
  )
}

// 이 장소 근처 맛집 추천 — 배치/별점으로 쌓인 recommendScore를 실제로 보여주는 화면
interface NearbyRestaurant {
  locationId: number
  name: string
  address?: string | null
  rating?: number | null
  recommendScore?: number | null
  isOpenNow?: boolean | null
  distanceKm?: number | null
}

function NearbyRestaurants({ lat, lng, color }: { lat: number; lng: number; color: string }) {
  const authFetch = useAuthFetch()
  const [items, setItems]     = useState<NearbyRestaurant[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(false)

  const load = async () => {
    setLoading(true); setError(false)
    try {
      const res = await authFetch(`/api/v1/restaurants/recommend?lat=${lat}&lng=${lng}&radiusKm=3`)
      const data = await res.json()
      setItems(res.ok && Array.isArray(data?.data) ? data.data : [])
    } catch { setError(true) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [lat, lng])

  if (loading) return <div style={{ marginTop: 12, fontSize: '0.72rem', color: 'var(--text3)' }}>근처 맛집 찾는 중…</div>
  if (error)   return <div style={{ marginTop: 12, fontSize: '0.72rem', color: 'var(--coral)' }}>맛집 정보를 불러오지 못했어요</div>
  if (!items || items.length === 0) {
    return (
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${color}20` }}>
        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>🍽️ 이 근처 맛집</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text3)', lineHeight: 1.6 }}>
          아직 평가된 맛집이 없어요. 여행을 마치고 별점을 남기면 여기에 쌓입니다.
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${color}20` }}>
      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text2)', marginBottom: 8 }}>
        🍽️ 이 근처 맛집 <span style={{ color: 'var(--text3)', fontWeight: 500 }}>· 반경 3km</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.slice(0, 5).map(r => (
          <div key={r.locationId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#fff', border: '1px solid var(--border-lt)', borderRadius: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.name}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                {r.rating != null && r.rating > 0 && (
                  <span style={{ fontSize: '0.66rem', color: '#F59E0B', fontWeight: 700 }}>★ {r.rating.toFixed(1)}</span>
                )}
                {r.distanceKm != null && (
                  <span style={{ fontSize: '0.66rem', color: 'var(--text3)' }}>{r.distanceKm}km</span>
                )}
                {r.isOpenNow === true && (
                  <span style={{ fontSize: '0.62rem', color: '#16A34A', fontWeight: 700 }}>영업중</span>
                )}
              </div>
            </div>
            {r.recommendScore != null && (
              <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 42 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 900, color, lineHeight: 1 }}>{r.recommendScore}</div>
                <div style={{ fontSize: '0.58rem', color: 'var(--text3)', marginTop: 1 }}>추천점수</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function PlaceTimeline({ routes, completed = false }: { routes: Route[]; completed?: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  if (!routes || routes.length === 0) return null

  const places: Array<{ loc: LocationInfo; arrivalTime: string; stayMins: number; idx: number; placeCost: number }> = []
  const firstDepart = toHHmm(routes[0].departureTime)
  places.push({ loc: routes[0].from, arrivalTime: firstDepart, stayMins: 0, idx: -1, placeCost: 0 })

  for (let i = 0; i < routes.length; i++) {
    const r = routes[i]
    const departTime    = toHHmm(r.departureTime)
    const arrivalTime   = addMinutes(departTime, r.durationMinutes)
    const nextDepartTime = i + 1 < routes.length ? toHHmm(routes[i + 1].departureTime) : ''
    const stayMins = nextDepartTime ? diffMinutes(arrivalTime, nextDepartTime) : 0
    places.push({ loc: r.to, arrivalTime, stayMins, idx: i, placeCost: r.placeCost ?? 0 })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 28, animation: 'fadeUp 0.4s ease both' }}>
      {places.map((place, pi) => {
        const isLast  = pi === places.length - 1
        const isFirst = pi === 0
        const locId   = `${place.loc.id ?? pi}-${pi}`
        const expanded = expandedId === locId
        const type    = place.loc.type ?? 'ETC'
        const locIcon  = LOC_ICON[type]  ?? '📍'
        const locColor = LOC_COLOR[type] ?? '#6366F1'
        const locBg    = LOC_BG[type]    ?? '#EEF2FF'
        const buf = bufferMinutes(type)
        const departRoute: Route | null = pi > 0 ? routes[pi - 1] : null
        const nextRoute: Route | null   = pi < routes.length ? routes[pi] : null
        const carBuf = (departRoute?.transport === 'CAR') ? trafficBuffer(departRoute.durationMinutes) : 0

        return (
          <div key={locId}>
            {!isFirst && departRoute && <MovementArrow route={departRoute} />}

            <div
              onClick={() => setExpandedId(expanded ? null : locId)}
              style={{
                display: 'flex', gap: 14, cursor: 'pointer',
                padding: '16px 20px',
                background: expanded ? locBg : '#fff',
                borderRadius: 14,
                border: `1px solid ${expanded ? locColor + '55' : 'var(--border-lt)'}`,
                boxShadow: expanded ? `0 4px 20px ${locColor}15` : '0 1px 6px rgba(0,0,0,0.04)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!expanded) { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 16px ${locColor}12`; (e.currentTarget as HTMLDivElement).style.borderColor = `${locColor}35` } }}
              onMouseLeave={e => { if (!expanded) { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 6px rgba(0,0,0,0.04)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-lt)' } }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: expanded ? '#fff' : locBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0, border: `1px solid ${locColor}25`, transition: 'all 0.2s' }}>
                {locIcon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: place.loc.name.startsWith('⚠️') ? '#B45309' : 'var(--text)', lineHeight: 1.35, wordBreak: 'keep-all' }}>
                    {place.loc.name}
                  </span>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.63rem', padding: '2px 7px', borderRadius: 20, background: locBg, color: locColor, fontWeight: 700, border: `1px solid ${locColor}25`, flexShrink: 0 }}>{type}</span>
                    {place.loc.name.startsWith('⚠️') && (
                      <span style={{ fontSize: '0.6rem', background: '#FEF3C7', color: '#92400E', padding: '2px 7px', borderRadius: 4, border: '1px solid #FDE68A', fontWeight: 700, flexShrink: 0 }}>구글 미확인</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.73rem', fontWeight: 700, color: '#fff', background: locColor, padding: '2px 8px', borderRadius: 5 }}>
                    {isFirst ? '🚀 ' : '📍 '}{place.arrivalTime} 도착
                  </span>
                  {place.placeCost > 0 && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: locColor, background: locBg, border: `1px solid ${locColor}35`, padding: '2px 8px', borderRadius: 5 }}>
                      💳 {place.placeCost.toLocaleString()}원~
                    </span>
                  )}
                  {carBuf > 0 && (
                    <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#B45309', background: '#FEF3C7', padding: '2px 7px', borderRadius: 5, border: '1px solid #FDE68A' }}>
                      🚗 정체 +{carBuf}분
                    </span>
                  )}
                  {place.stayMins > 0 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>
                      체류 <strong style={{ color: 'var(--text2)' }}>{place.stayMins}분</strong>
                      <span style={{ color: locColor, marginLeft: 4, fontWeight: 600 }}>+{buf}분 여유</span>
                    </span>
                  )}
                  {nextRoute && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text3)', marginLeft: 'auto' }}>
                      출발 <strong style={{ color: 'var(--text2)' }}>{toHHmm(nextRoute.departureTime)}</strong>
                    </span>
                  )}
                </div>

                {expanded && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${locColor}20` }}>
                    {place.loc.description && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: 10, background: `${locColor}08`, borderLeft: `3px solid ${locColor}50`, borderRadius: '0 8px 8px 0', padding: '8px 12px' }}>
                        {place.loc.description}
                      </p>
                    )}
                    {place.loc.address && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                        <span>📌</span><span>{place.loc.address}</span>
                      </div>
                    )}
                    <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: '0.7rem', color: locColor, fontWeight: 600 }}>
                        ⏳ 장소 여유 +{buf}분 ({type === 'RESTAURANT' ? '음식 대기·식사' : type === 'MUSEUM' ? '관람 여유' : type === 'CAFE' ? '커피 즐기기' : '예비 시간'})
                      </div>
                      {carBuf > 0 && (
                        <div style={{ fontSize: '0.7rem', color: '#92400E', fontWeight: 600 }}>
                          🚗 교통 정체 +{carBuf}분 대비 (이동 {departRoute?.durationMinutes}분 구간)
                        </div>
                      )}
                    </div>

                    <img
                      src={`https://maps.googleapis.com/maps/api/streetview?size=440x150&location=${place.loc.lat},${place.loc.lng}&fov=90&pitch=5&key=${GOOGLE_MAPS_KEY}`}
                      alt={`${place.loc.name} 거리뷰`}
                      style={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: 8, marginBottom: 10, display: 'block' }}
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <a href={place.loc.placeId?.startsWith('ChIJ') ? `https://www.google.com/maps/place/?q=place_id:${place.loc.placeId}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.loc.name}${place.loc.address ? ' ' + place.loc.address : ''}`)}`} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#4285F4', color: '#fff', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, textDecoration: 'none' }}>
                        🗺️ 구글 지도
                      </a>
                      {type === 'HOTEL' && (
                        <>
                          <a href={`https://www.booking.com/search.html?ss=${encodeURIComponent(place.loc.name)}`} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#003580', color: '#fff', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, textDecoration: 'none' }}>
                            🏨 Booking.com
                          </a>
                          <a href={`https://www.agoda.com/search?city=${encodeURIComponent(place.loc.name)}`} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#5C2D91', color: '#fff', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, textDecoration: 'none' }}>
                            🏮 Agoda
                          </a>
                        </>
                      )}
                      {(() => {
                        const pid = place.loc.placeId
                        const isGooglePlaceId = pid && pid.startsWith('ChIJ')
                        const reviewUrl = isGooglePlaceId
                          ? `https://www.google.com/maps/place/?q=place_id:${pid}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.loc.name + (place.loc.address ? ' ' + place.loc.address : ''))}`
                        return (
                          <a href={reviewUrl} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#EA4335', color: '#fff', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, textDecoration: 'none' }}>
                            ⭐ 구글 리뷰
                          </a>
                        )
                      })()}
                    </div>

                    {completed && type === 'RESTAURANT' && place.loc.id != null && (
                      <StarRating locationId={place.loc.id} color={locColor} />
                    )}

                    <NearbyRestaurants lat={place.loc.lat} lng={place.loc.lng} color={locColor} />
                  </div>
                )}
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text3)', flexShrink: 0, alignSelf: 'center', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>▼</div>
            </div>

            {isLast && <div style={{ height: 8 }} />}
          </div>
        )
      })}
    </div>
  )
}

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

  return (
    <div style={{ marginTop: 20, borderRadius: 14, border: '1px solid var(--border-lt)', background: '#fff', padding: '20px 24px', animation: 'fadeUp 0.3s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-bg)', border: '1px solid var(--primary-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>✏️</div>
        <div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>AI에게 {dayNum}일차 수정 요청</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginTop: 1 }}>원하는 변경사항을 입력하면 AI가 일정을 조정해줘요</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {EXAMPLE_PROMPTS.map(ex => (
          <button key={ex} onClick={() => { setPrompt(ex); textareaRef.current?.focus() }}
            style={{ padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)', background: '#fff', color: 'var(--text2)', fontSize: '0.7rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--primary)'; b.style.color = 'var(--primary)' }}
            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--border)'; b.style.color = 'var(--text2)' }}
          >{ex}</button>
        ))}
      </div>

      <div style={{ position: 'relative' }}>
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={e => { setPrompt(e.target.value); setStatus('idle') }}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
          placeholder={`예: "오후에 온천 추가해줘", "저녁 식당을 스시 오마카세로 바꿔줘", "3시 이후 일정을 더 여유롭게"`}
          rows={3}
          maxLength={500}
          style={{
            width: '100%', borderRadius: 10, border: '1.5px solid var(--border)', padding: '12px 14px',
            fontSize: '0.85rem', lineHeight: 1.6, resize: 'vertical', outline: 'none',
            fontFamily: 'inherit', color: 'var(--text)', background: '#fff',
            boxSizing: 'border-box', transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-pale)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
        />
        <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: '0.62rem', color: 'var(--text3)' }}>{prompt.length}/500</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <span style={{ fontSize: '0.66rem', color: 'var(--text3)' }}>⌘+Enter로 전송</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {status === 'done' && <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, animation: 'fadeUp 0.3s ease' }}>수정 완료!</span>}
          {status === 'error' && <span style={{ fontSize: '0.72rem', color: 'var(--red)' }}>{errMsg}</span>}
          <button
            onClick={submit}
            disabled={!prompt.trim() || status === 'loading'}
            style={{
              padding: '9px 18px', borderRadius: 8, border: 'none', fontSize: '0.83rem', fontWeight: 600,
              background: !prompt.trim() || status === 'loading' ? 'var(--gray6)' : 'var(--primary)',
              color: !prompt.trim() || status === 'loading' ? 'var(--text3)' : '#fff',
              cursor: !prompt.trim() || status === 'loading' ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.15s', fontFamily: 'inherit',
            }}
          >
            {status === 'loading'
              ? <><span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}/> 수정 중...</>
              : '수정 요청'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MovementArrow({ route }: { route: Route }) {
  const icon  = T_ICON[route.transport]  ?? '🚀'
  const color = T_COLOR[route.transport] ?? '#0EA5E9'
  const bg    = T_BG[route.transport]    ?? '#EFF6FF'
  const label = T_LABEL[route.transport] ?? route.transport

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 20px', margin: '2px 0' }}>
      <div style={{ width: 2, height: 32, background: `${color}35`, borderRadius: 1, marginLeft: 21 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: bg, border: `1px solid ${color}25`, borderRadius: 20, padding: '4px 12px', flexShrink: 0 }}>
        <span style={{ fontSize: '0.78rem' }}>{icon}</span>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color }}>{label}</span>
        <span style={{ fontSize: '0.68rem', color: 'var(--text3)' }}>{route.durationMinutes}분</span>
        {route.estimatedCost > 0 && <span style={{ fontSize: '0.68rem', color: 'var(--text3)' }}>· {route.estimatedCost.toLocaleString()}원</span>}
        {route.note && <span style={{ fontSize: '0.65rem', color: '#6366F1', marginLeft: 2 }}>🗒 {route.note}</span>}
      </div>
    </div>
  )
}
