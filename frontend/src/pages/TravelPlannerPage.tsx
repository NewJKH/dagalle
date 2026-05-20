import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

interface Route { id: number; sequence: number; fromPlaceName: string; toPlaceName: string; transport: string; departureTime: string; durationMinutes: number; estimatedCost: number }
interface Day { id: number; dayNumber: number; date: string; routes: Route[] }

const TRANSPORT_ICON: Record<string, string> = { CAR: '🚗', WALK: '🚶', SUBWAY: '🚇', BUS: '🚌', TRAIN: '🚂' }
const TRANSPORT_COLOR: Record<string, string> = { CAR: '#FF6B6B', WALK: '#10B981', SUBWAY: '#8B5CF6', BUS: '#F59E0B', TRAIN: '#0EA5E9' }
const TRANSPORT_BG: Record<string, string> = { CAR: '#FFF1F1', WALK: '#ECFDF5', SUBWAY: '#F5F3FF', BUS: '#FFFBEB', TRAIN: '#EFF6FF' }
const TRANSPORT_LABEL: Record<string, string> = { CAR: '자동차', WALK: '도보', SUBWAY: '지하철', BUS: '버스', TRAIN: '기차' }

const MOCK_DAYS: Day[] = [
  { id: 1, dayNumber: 1, date: '2026-05-01', routes: [
    { id: 1, sequence: 1, fromPlaceName: '서울역', toPlaceName: '부산역', transport: 'TRAIN', departureTime: '08:00', durationMinutes: 150, estimatedCost: 59800 },
    { id: 2, sequence: 2, fromPlaceName: '부산역', toPlaceName: '감천문화마을', transport: 'BUS', departureTime: '11:00', durationMinutes: 40, estimatedCost: 1500 },
    { id: 3, sequence: 3, fromPlaceName: '감천문화마을', toPlaceName: '해운대 호텔', transport: 'CAR', departureTime: '15:30', durationMinutes: 35, estimatedCost: 12000 },
  ]},
  { id: 2, dayNumber: 2, date: '2026-05-02', routes: [
    { id: 4, sequence: 1, fromPlaceName: '해운대 호텔', toPlaceName: '해운대 해수욕장', transport: 'WALK', departureTime: '09:00', durationMinutes: 10, estimatedCost: 0 },
    { id: 5, sequence: 2, fromPlaceName: '해운대', toPlaceName: '광안리', transport: 'BUS', departureTime: '16:00', durationMinutes: 25, estimatedCost: 1500 },
  ]},
  { id: 3, dayNumber: 3, date: '2026-05-03', routes: [
    { id: 6, sequence: 1, fromPlaceName: '해운대 호텔', toPlaceName: '부산 자갈치 시장', transport: 'SUBWAY', departureTime: '10:00', durationMinutes: 45, estimatedCost: 1800 },
  ]},
  { id: 4, dayNumber: 4, date: '2026-05-04', routes: [
    { id: 7, sequence: 1, fromPlaceName: '부산역', toPlaceName: '서울역', transport: 'TRAIN', departureTime: '16:00', durationMinutes: 150, estimatedCost: 59800 },
  ]},
]

export default function TravelPlannerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [days, setDays] = useState<Day[]>([])
  const [selectedDay, setSelectedDay] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showAddRoute, setShowAddRoute] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) { navigate('/login'); return }
    fetch(`/api/v1/travels/${id}/days`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setDays(d.data ?? MOCK_DAYS))
      .catch(() => setDays(MOCK_DAYS))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const currentDay = days.find(d => d.dayNumber === selectedDay)
  const totalCost = days.flatMap(d => d.routes).reduce((sum, r) => sum + r.estimatedCost, 0)

  const handleAiGenerate = async () => {
    setAiLoading(true)
    await new Promise(r => setTimeout(r, 2000))
    setAiLoading(false)
    alert('AI 일정이 생성되었습니다! (데모)')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* Planner layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', flex: 1, paddingTop: 64 }}>

        {/* Sidebar */}
        <aside style={{ background: '#fff', borderRight: '1px solid var(--border-lt)', position: 'sticky', top: 64, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {/* Trip header */}
          <div style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{
              background: 'linear-gradient(135deg, #0284C7, #38BDF8)',
              padding: '20px 20px 24px',
            }}>
              <button onClick={() => navigate('/travels')} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: 'rgba(255,255,255,0.9)', fontSize: '0.78rem', marginBottom: 14, cursor: 'pointer', padding: '5px 10px', fontFamily: 'inherit', fontWeight: 500 }}>← 목록으로</button>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>부산 봄 여행</h2>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📍 서울</span><span style={{ opacity: 0.5 }}>→</span><span>부산</span><span style={{ opacity: 0.5 }}>·</span><span>4박 5일</span>
              </div>
            </div>
          </div>

          <div style={{ padding: '16px 16px', flex: 1, overflowY: 'auto' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.07em', marginBottom: 10, paddingLeft: 4 }}>DAY 선택</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {days.map(day => {
                const isSelected = selectedDay === day.dayNumber
                const dayCost = day.routes.reduce((s, r) => s + r.estimatedCost, 0)
                return (
                  <button key={day.dayNumber} onClick={() => setSelectedDay(day.dayNumber)} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 12, border: isSelected ? '1.5px solid var(--sky-pale)' : '1.5px solid transparent',
                    background: isSelected ? 'var(--sky-bg)' : 'transparent',
                    cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                    width: '100%',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                      background: isSelected ? 'linear-gradient(135deg, var(--sky-lt), var(--sky-dk))' : 'var(--bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.68rem', fontWeight: 800,
                      color: isSelected ? '#fff' : 'var(--text3)',
                      boxShadow: isSelected ? '0 4px 12px rgba(14,165,233,0.3)' : 'none',
                    }}>D{day.dayNumber}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isSelected ? 'var(--sky-dk)' : 'var(--text)' }}>
                        {day.dayNumber}일차
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text3)', marginTop: 1 }}>{day.date}</div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text3)' }}>{day.routes.length}경로</div>
                      {dayCost > 0 && <div style={{ fontSize: '0.68rem', fontWeight: 700, color: isSelected ? 'var(--sky-dk)' : 'var(--text2)' }}>{dayCost.toLocaleString()}원</div>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ padding: '16px', borderTop: '1px solid var(--border-lt)' }}>
            <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', borderRadius: 14, padding: '16px 18px', border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--sky-dk)', fontWeight: 600, marginBottom: 4 }}>예상 총 비용</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--sky-dk)' }}>{totalCost.toLocaleString()}<span style={{ fontSize: '0.85rem', fontWeight: 600, marginLeft: 2 }}>원</span></div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main style={{ padding: '32px 40px', overflowY: 'auto' }}>
          {/* Day header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, background: 'var(--sky)', color: '#fff', padding: '3px 12px', borderRadius: 6 }}>DAY {selectedDay}</div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text)' }}>{currentDay?.date}</h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text3)' }}>경로 {currentDay?.routes.length ?? 0}개 · 예상 비용 {(currentDay?.routes.reduce((s, r) => s + r.estimatedCost, 0) ?? 0).toLocaleString()}원</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleAiGenerate} disabled={aiLoading} style={{
                padding: '10px 18px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, border: 'none',
                background: aiLoading ? 'var(--border)' : 'linear-gradient(135deg, #A78BFA, var(--purple))',
                color: '#fff', boxShadow: aiLoading ? 'none' : '0 4px 14px rgba(139,92,246,0.3)',
                display: 'flex', alignItems: 'center', gap: 6, cursor: aiLoading ? 'not-allowed' : 'pointer',
              }}>
                {aiLoading ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}/> AI 생성 중...</> : '✨ AI로 채우기'}
              </button>
              <button onClick={() => setShowAddRoute(true)} style={{
                padding: '10px 18px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, border: 'none',
                background: 'linear-gradient(135deg, var(--sky-lt), var(--sky-dk))',
                color: '#fff', boxShadow: '0 4px 14px rgba(14,165,233,0.3)',
              }}>+ 경로 추가</button>
            </div>
          </div>

          {/* Route timeline */}
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <span style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--sky)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}/>
            </div>
          ) : !currentDay || currentDay.routes.length === 0 ? (
            <EmptyDay onAdd={() => setShowAddRoute(true)} onAi={handleAiGenerate} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {currentDay.routes.map((route, i) => (
                <RouteCard key={route.id} route={route} isLast={i === currentDay.routes.length - 1} />
              ))}
              <AddRouteButton onClick={() => setShowAddRoute(true)} />
            </div>
          )}

          {/* Cost summary */}
          {(currentDay?.routes.length ?? 0) > 0 && (
            <div style={{ marginTop: 32, background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid var(--border-lt)', display: 'flex', gap: 24, alignItems: 'center' }}>
              <div style={{ flex: 1, display: 'flex', gap: 20 }}>
                {Object.entries(currentDay?.routes.reduce((acc, r) => { acc[r.transport] = (acc[r.transport] ?? 0) + r.estimatedCost; return acc }, {} as Record<string, number>) ?? {}).map(([t, cost]) => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '1rem' }}>{TRANSPORT_ICON[t] ?? '🚀'}</span>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text3)' }}>{t}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{cost.toLocaleString()}원</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{selectedDay}일차 소계</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--sky-dk)' }}>
                  {(currentDay?.routes.reduce((s, r) => s + r.estimatedCost, 0) ?? 0).toLocaleString()}원
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {showAddRoute && <AddRouteModal onClose={() => setShowAddRoute(false)} dayId={currentDay?.id ?? 0} travelId={id!} />}
    </div>
  )
}

function RouteCard({ route, isLast }: { route: Route; isLast: boolean }) {
  const icon = TRANSPORT_ICON[route.transport] ?? '🚀'
  const color = TRANSPORT_COLOR[route.transport] ?? '#0EA5E9'
  const bg = TRANSPORT_BG[route.transport] ?? '#EFF6FF'
  const label = TRANSPORT_LABEL[route.transport] ?? route.transport
  return (
    <div style={{ display: 'flex', gap: 16, animation: 'fadeUp 0.4s ease both' }}>
      {/* Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 48, flexShrink: 0 }}>
        <div style={{
          fontSize: '0.68rem', color: '#fff', marginBottom: 6, fontWeight: 700,
          background: color, padding: '2px 7px', borderRadius: 6, whiteSpace: 'nowrap',
        }}>{route.departureTime}</div>
        <div style={{
          width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0,
          boxShadow: `0 0 0 4px ${color}25`,
        }}/>
        {!isLast && <div style={{ width: 2, flex: 1, marginTop: 6, background: `linear-gradient(to bottom, ${color}40, var(--border-lt))`, borderRadius: 1 }}/>}
      </div>

      {/* Card */}
      <div style={{
        flex: 1, background: '#fff', borderRadius: 18, padding: '18px 22px',
        border: `1px solid ${color}22`, boxShadow: `0 2px 12px ${color}0D`,
        transition: 'all 0.2s', marginBottom: isLast ? 0 : 4,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 28px ${color}20`; (e.currentTarget as HTMLDivElement).style.borderColor = `${color}44`; (e.currentTarget as HTMLDivElement).style.transform = 'translateX(2px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 2px 12px ${color}0D`; (e.currentTarget as HTMLDivElement).style.borderColor = `${color}22`; (e.currentTarget as HTMLDivElement).style.transform = '' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{icon}</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{route.fromPlaceName}</span>
                  <span style={{ color, fontSize: '0.85rem', fontWeight: 600 }}>→</span>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{route.toPlaceName}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', padding: '4px 12px', borderRadius: 20, fontWeight: 700, background: bg, color }}>
                {icon} {label}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                ⏱ <strong style={{ color: 'var(--text2)' }}>{route.durationMinutes}분</strong>
              </span>
              {route.estimatedCost > 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  💰 <strong style={{ color: 'var(--text2)' }}>{route.estimatedCost.toLocaleString()}원</strong>
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
            <button style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--sky-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg)')}
            >✏️</button>
            <button style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.15s', color: 'var(--coral)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--coral-bg)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--coral-lt)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)' }}
            >✕</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AddRouteButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '14px', borderRadius: 14, border: '2px dashed var(--border)',
      background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: 8, color: 'var(--text3)', fontSize: '0.88rem', fontWeight: 500,
      transition: 'all 0.15s',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--sky)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--sky)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--sky-bg)' }}
    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
    >+ 경로 추가하기</button>
  )
}

function EmptyDay({ onAdd, onAi }: { onAdd: () => void; onAi: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 32px', background: '#fff', borderRadius: 20, border: '1px solid var(--border-lt)' }}>
      <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🗺️</div>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>아직 경로가 없어요</h3>
      <p style={{ color: 'var(--text3)', fontSize: '0.85rem', marginBottom: 24 }}>경로를 직접 추가하거나 AI가 채워드릴게요</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
        <button onClick={onAdd} style={{ padding: '11px 22px', borderRadius: 10, border: 'none', fontSize: '0.88rem', fontWeight: 700, background: 'linear-gradient(135deg, var(--sky-lt), var(--sky-dk))', color: '#fff', boxShadow: '0 4px 14px rgba(14,165,233,0.3)', cursor: 'pointer' }}>+ 직접 추가</button>
        <button onClick={onAi} style={{ padding: '11px 22px', borderRadius: 10, border: 'none', fontSize: '0.88rem', fontWeight: 700, background: 'linear-gradient(135deg, #A78BFA, var(--purple))', color: '#fff', boxShadow: '0 4px 14px rgba(139,92,246,0.3)', cursor: 'pointer' }}>✨ AI로 채우기</button>
      </div>
    </div>
  )
}

function AddRouteModal({ onClose, dayId, travelId }: { onClose: () => void; dayId: number; travelId: string }) {
  const [form, setForm] = useState({ fromPlaceName: '', toPlaceName: '', transport: 'CAR', departureTime: '', durationMinutes: 30, estimatedCost: 0 })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    setLoading(false); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 36, width: '100%', maxWidth: 440, boxShadow: '0 32px 80px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>경로 추가</h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg)', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--text3)' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: '출발지', key: 'fromPlaceName', type: 'text', placeholder: '예) 서울역' },
            { label: '도착지', key: 'toPlaceName', type: 'text', placeholder: '예) 부산역' },
            { label: '출발 시간', key: 'departureTime', type: 'time', placeholder: '' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>{label}</label>
              <input type={type} placeholder={placeholder} required
                value={form[key as keyof typeof form] as string}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--border)', outline: 'none', fontSize: '0.9rem', color: 'var(--text)' }}
                onFocus={e => (e.target.style.borderColor = 'var(--sky)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>이동 수단</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['CAR', 'WALK', 'SUBWAY', 'BUS', 'TRAIN'].map(t => (
                <button key={t} type="button" onClick={() => setForm(f => ({ ...f, transport: t }))} style={{
                  padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${form.transport === t ? 'var(--sky)' : 'var(--border)'}`,
                  background: form.transport === t ? 'var(--sky-bg)' : 'transparent',
                  color: form.transport === t ? 'var(--sky-dk)' : 'var(--text2)',
                  fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                }}>{TRANSPORT_ICON[t]} {t}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: '소요 시간 (분)', key: 'durationMinutes', type: 'number' },
              { label: '예상 비용 (원)', key: 'estimatedCost', type: 'number' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>{label}</label>
                <input type={type} min="0"
                  value={form[key as keyof typeof form] as number}
                  onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--border)', outline: 'none', fontSize: '0.9rem', color: 'var(--text)' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--sky)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            ))}
          </div>
          <button type="submit" disabled={loading} style={{ marginTop: 8, padding: '13px', borderRadius: 12, fontWeight: 700, fontSize: '0.92rem', background: 'linear-gradient(135deg, var(--sky-lt), var(--sky-dk))', color: '#fff', border: 'none', boxShadow: '0 6px 20px rgba(14,165,233,0.35)', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? '추가 중...' : '경로 추가하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
