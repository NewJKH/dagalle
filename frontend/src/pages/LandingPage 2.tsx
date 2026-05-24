import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import AutocompleteInput from '../components/AutocompleteInput'
import { DEPARTURE_OPTIONS, ALL_DEST, DEST_EMOJI } from '../constants/locations'

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
