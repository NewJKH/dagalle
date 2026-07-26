import { useState } from 'react'
import MapView from '../components/MapView'
import type { MapRoute } from '../components/MapView'

// ⚠️ 개발용 데모 페이지 — 로그인/백엔드 없이 지도 렌더링만 빠르게 확인한다.
//    일본 도쿄 2일 일정(대중교통·도보·기차 혼합)으로 폴백 동작까지 눈으로 검증할 수 있다.

const GOOGLE_MAPS_KEY = 'AIzaSyCcBLM2p25kdXeAjFJBxFfo12E7jh-p9tw'

// 실제 좌표 기반 가짜 경로
const DEMO_ROUTES: MapRoute[] = [
  // ── Day 1 ──
  {
    day: 1, sequence: 1, transport: 'WALK', durationMinutes: 15, estimatedCost: 0,
    from: { name: '신주쿠역 (新宿駅)',   lat: 35.6896, lng: 139.7006, address: 'Shinjuku, Tokyo', description: '도쿄 최대 환승역' },
    to:   { name: '신주쿠 교엔 (新宿御苑)', lat: 35.6852, lng: 139.7100, address: 'Naitomachi, Shinjuku', description: '도심 대형 정원' },
    note: '남쪽 출구에서 도보 15분',
  },
  {
    day: 1, sequence: 2, transport: 'SUBWAY', durationMinutes: 20, estimatedCost: 1890,
    from: { name: '신주쿠 교엔 (新宿御苑)', lat: 35.6852, lng: 139.7100, address: 'Naitomachi, Shinjuku' },
    to:   { name: '시부야 스크램블 교차로', lat: 35.6595, lng: 139.7004, address: 'Dogenzaka, Shibuya', description: '세계 최대 교차로' },
    note: '도쿄메트로 후쿠토신선',
  },
  {
    day: 1, sequence: 3, transport: 'TRAIN', durationMinutes: 10, estimatedCost: 1440,
    from: { name: '시부야 스크램블 교차로', lat: 35.6595, lng: 139.7004, address: 'Dogenzaka, Shibuya' },
    to:   { name: '하라주쿠 타케시타 거리', lat: 35.6716, lng: 139.7031, address: 'Jingumae, Shibuya', description: '패션·먹거리 명소' },
    note: 'JR 야마노테선',
  },
  {
    day: 1, sequence: 4, transport: 'WALK', durationMinutes: 18, estimatedCost: 0,
    from: { name: '하라주쿠 타케시타 거리', lat: 35.6716, lng: 139.7031, address: 'Jingumae, Shibuya' },
    to:   { name: '신주쿠 워싱턴 호텔',     lat: 35.6906, lng: 139.6948, address: 'Nishi-Shinjuku', description: '숙소 체크인' },
    note: '저녁 산책 겸 도보',
  },
  // ── Day 2 ──
  {
    day: 2, sequence: 1, transport: 'SUBWAY', durationMinutes: 40, estimatedCost: 2160,
    from: { name: '신주쿠 워싱턴 호텔',   lat: 35.6906, lng: 139.6948, address: 'Nishi-Shinjuku' },
    to:   { name: '아사쿠사 센소지 (浅草寺)', lat: 35.7148, lng: 139.7967, address: 'Asakusa, Taito', description: '도쿄 최고(最古) 사원' },
    note: '지하철 긴자선',
  },
  {
    day: 2, sequence: 2, transport: 'WALK', durationMinutes: 20, estimatedCost: 0,
    from: { name: '아사쿠사 센소지 (浅草寺)', lat: 35.7148, lng: 139.7967, address: 'Asakusa, Taito' },
    to:   { name: '도쿄 스카이트리',        lat: 35.7101, lng: 139.8107, address: 'Oshiage, Sumida', description: '634m 전망 타워' },
    note: '스미다강 건너 도보',
  },
  {
    day: 2, sequence: 3, transport: 'TRAIN', durationMinutes: 25, estimatedCost: 1800,
    from: { name: '도쿄 스카이트리',   lat: 35.7101, lng: 139.8107, address: 'Oshiage, Sumida' },
    to:   { name: '우에노 공원 (上野公園)', lat: 35.7156, lng: 139.7745, address: 'Uenokoen, Taito', description: '박물관·동물원 밀집' },
    note: '도부 스카이트리라인',
  },
]

export default function MapDemoPage() {
  const days = Array.from(new Set(DEMO_ROUTES.map(r => r.day))).sort()
  const [highlightDay, setHighlightDay] = useState<number | undefined>(undefined)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gray7)' }}>
      {/* 데모 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--border-lt)', background: '#fff', flexShrink: 0 }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text)' }}>🗺️ 지도 데모</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>로그인·백엔드 없이 렌더링 확인 · 도쿄 2일 (대중교통·도보 혼합)</span>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          <button onClick={() => setHighlightDay(undefined)}
            style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 700,
              background: highlightDay === undefined ? 'var(--primary)' : '#fff', color: highlightDay === undefined ? '#fff' : 'var(--text2)' }}>
            전체
          </button>
          {days.map(d => (
            <button key={d} onClick={() => setHighlightDay(d)}
              style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 700,
                background: highlightDay === d ? 'var(--primary)' : '#fff', color: highlightDay === d ? '#fff' : 'var(--text2)' }}>
              {d}일차
            </button>
          ))}
        </div>
      </div>

      {/* 지도 */}
      <div style={{ flex: 1, minHeight: 0, padding: 12 }}>
        <MapView routes={DEMO_ROUTES} apiKey={GOOGLE_MAPS_KEY} highlightDay={highlightDay} />
      </div>
    </div>
  )
}
