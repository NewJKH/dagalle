import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

const DESTINATIONS = [
  { img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=500&q=80', flag: '🇯🇵', country: '일본', name: '도쿄 · 시부야', rating: '4.8', reviews: '2,841', price: '90만원~', tags: ['미식', '쇼핑', '4박5일'], badge: 'AI 추천 1위', badgeColor: 'var(--coral)' },
  { img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&q=80', flag: '🇰🇷', country: '국내', name: '제주도', rating: '4.7', reviews: '5,120', price: '35만원~', tags: ['힐링', '자연', '2박3일'], badge: '혼행 추천', badgeColor: 'var(--mint)' },
  { img: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=500&q=80', flag: '🇻🇳', country: '베트남', name: '다낭 · 호이안', rating: '4.6', reviews: '3,405', price: '70만원~', tags: ['리조트', '해변', '4박5일'], badge: '가성비 최고', badgeColor: 'var(--amber)' },
  { img: 'https://images.unsplash.com/photo-1583400212045-a2bde5b5efba?w=500&q=80', flag: '🇰🇷', country: '국내', name: '부산', rating: '4.6', reviews: '4,892', price: '20만원~', tags: ['바다', '미식', '2박3일'], badge: '주말 추천', badgeColor: 'var(--purple)' },
  { img: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=500&q=80', flag: '🇹🇭', country: '태국', name: '방콕 · 파타야', rating: '4.5', reviews: '2,104', price: '75만원~', tags: ['사원', '야시장', '5박6일'], badge: undefined, badgeColor: '' },
]

const FEATURES = [
  { icon: '🗺️', title: '이동 동선 최적화', desc: '실제 이동 시간·거리를 계산해 낭비 없는 최적 동선을 짜드려요', color: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', accent: 'var(--sky)', border: '#BFDBFE' },
  { icon: '🍽️', title: '리뷰 감성 분석 맛집', desc: '평점만이 아닌 최근 리뷰 트렌드까지 분석해 진짜 맛집만 추려요', color: 'linear-gradient(135deg, #FFF1F1, #FFE4E4)', accent: 'var(--coral)', border: '#FECACA' },
  { icon: '💰', title: '비용 자동 계산', desc: '교통·숙소·식비·유류비까지 정확하게 계산해 예산을 맞춰요', color: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', accent: 'var(--mint)', border: '#A7F3D0' },
  { icon: '👥', title: '팀 여행 의견 조율', desc: '링크 공유로 팀원과 함께 실시간으로 일정을 편집해요', color: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', accent: 'var(--purple)', border: '#DDD6FE' },
]

const STEP_COLORS = [
  { from: '#38BDF8', to: '#0EA5E9', bg: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', num: '#0EA5E9' },
  { from: '#34D399', to: '#10B981', bg: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', num: '#10B981' },
  { from: '#A78BFA', to: '#8B5CF6', bg: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', num: '#8B5CF6' },
  { from: '#FCD34D', to: '#F59E0B', bg: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)', num: '#F59E0B' },
]

const STEPS = [
  { num: '01', icon: '📍', title: '출발지 · 도착지 입력', desc: '어디서 출발하고 어디로 가는지만 알려주세요' },
  { num: '02', icon: '🧭', title: '여행 스타일 선택', desc: '여유롭게 / 균형 / 빡빡하게 세 가지 중 선택해요' },
  { num: '03', icon: '✨', title: 'AI 일정 자동 생성', desc: '맛집·이동·숙소·비용까지 70초 안에 완성돼요' },
  { num: '04', icon: '✈️', title: '수정하고 떠나기', desc: '마음에 드는 일정만 골라 팀원과 공유 후 출발이에요' },
]

export default function LandingPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [dates, setDates] = useState('')
  const [style, setStyle] = useState('여유롭게')
  const navigate = useNavigate()

  return (
    <div style={{ background: '#fff' }}>
      <Navbar />

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh',
        background: 'linear-gradient(145deg, #0284C7 0%, #0EA5E9 40%, #38BDF8 70%, #7DD3FC 100%)',
        display: 'flex', alignItems: 'center',
        position: 'relative', overflow: 'hidden',
        paddingTop: 64,
      }}>
        {/* decorative circles */}
        {[
          { w:500, h:500, top:-100, right:-100, bg:'rgba(255,255,255,0.06)' },
          { w:300, h:300, bottom:-50, left:100, bg:'rgba(255,255,255,0.04)' },
          { w:200, h:200, top:'30%', left:'40%', bg:'rgba(255,255,255,0.03)' },
        ].map((c, i) => (
          <div key={i} style={{
            position:'absolute', width:c.w, height:c.h,
            top:c.top, right:c.right, bottom:c.bottom, left:c.left,
            borderRadius:'50%', background:c.bg, pointerEvents:'none',
          }}/>
        ))}

        <div style={{
          maxWidth: 1280, margin: '0 auto', padding: '64px 64px',
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 64, alignItems: 'center', width: '100%',
        }}>
          {/* LEFT */}
          <div style={{ animation: 'fadeUp 0.7s ease forwards' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 999, padding: '6px 16px', marginBottom: 28,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: '#A7F3D0',
                animation: 'pulse 2s ease infinite',
              }}/>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#E0F2FE', letterSpacing: '0.05em' }}>
                AI 여행 설계 · 베타 오픈
              </span>
            </div>

            <h1 style={{
              fontSize: 'clamp(2.4rem, 4.5vw, 3.8rem)', fontWeight: 800,
              color: '#fff', lineHeight: 1.18, letterSpacing: '-0.03em',
              marginBottom: 20,
            }}>
              다음 여행,<br />
              <span style={{ color: '#FDE68A' }}>AI가 다 짜드릴게요</span>
            </h1>
            <p style={{
              fontSize: '1.05rem', color: 'rgba(255,255,255,0.8)',
              lineHeight: 1.8, marginBottom: 40, fontWeight: 300,
            }}>
              출발지·목적지·스타일만 알려주세요<br />
              일정부터 맛집, 비용까지 한번에 완성돼요
            </p>

            {/* Search card */}
            <div style={{
              background: '#fff', borderRadius: 20,
              boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 8px 20px rgba(0,0,0,0.08)',
              overflow: 'hidden', marginBottom: 20,
            }}>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-lt)' }}>
                {[
                  { label: '📍 어디서', value: from, setter: setFrom, placeholder: '서울, 부산...' },
                  { label: '✈️ 어디로', value: to, setter: setTo, placeholder: '도쿄, 제주, 다낭...' },
                  { label: '📅 날짜', value: dates, setter: setDates, placeholder: '5.1 — 5.4' },
                ].map(({ label, value, setter, placeholder }, i) => (
                  <div key={i} style={{
                    flex: 1, padding: '16px 20px',
                    borderRight: i < 2 ? '1px solid var(--border-lt)' : 'none',
                  }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.06em', marginBottom: 5 }}>{label}</div>
                    <input
                      value={value}
                      onChange={e => setter(e.target.value)}
                      placeholder={placeholder}
                      style={{
                        width: '100%', background: 'transparent', border: 'none', outline: 'none',
                        fontSize: '0.92rem', fontWeight: 500, color: 'var(--text)',
                      }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['여유롭게', '균형있게', '빡빡하게'].map(s => (
                    <button key={s} onClick={() => setStyle(s)} style={{
                      padding: '6px 16px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600,
                      border: `1.5px solid ${style === s ? 'var(--sky)' : 'var(--border)'}`,
                      background: style === s ? 'var(--sky-bg)' : 'transparent',
                      color: style === s ? 'var(--sky-dk)' : 'var(--text3)',
                      transition: 'all 0.15s',
                    }}>{s}</button>
                  ))}
                </div>
                <button onClick={() => navigate('/register')} style={{
                  padding: '11px 24px', borderRadius: 12, fontSize: '0.88rem', fontWeight: 700,
                  background: 'linear-gradient(135deg, var(--sky-lt), var(--sky-dk))',
                  color: '#fff', boxShadow: '0 6px 20px rgba(14,165,233,0.4)',
                  display: 'flex', alignItems: 'center', gap: 7, transition: 'all 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 10px 28px rgba(14,165,233,0.5)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(14,165,233,0.4)' }}
                >✨ AI 일정 만들기</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {['#부산 바다', '#도쿄 미식', '#제주 힐링', '#오사카 3박', '#강원도 당일치기'].map(tag => (
                <span key={tag} style={{
                  fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)',
                  cursor: 'pointer', transition: 'color 0.15s',
                  background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: 999,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                >{tag}</span>
              ))}
            </div>
          </div>

          {/* RIGHT — plan card */}
          <div style={{ position: 'relative', animation: 'fadeUp 0.9s 0.2s ease both' }}>
            <div style={{
              fontFamily: "'Caveat', cursive", fontSize: '1.05rem', color: 'rgba(255,255,255,0.7)',
              marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ width: 28, height: 1.5, background: 'rgba(255,255,255,0.4)', display: 'inline-block' }}/>
              AI가 방금 만든 일정이에요
            </div>
            <PlanPreviewCard />

            {/* floating chips */}
            <FloatChip style={{ bottom: 80, right: -20, animationDelay: '0.5s' }}>
              <span style={{ fontSize: '1.1rem' }}>🍽️</span>
              <div><div style={{ fontSize: '0.82rem', fontWeight: 600 }}>AI 맛집 추천 완료</div><div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>리뷰 892개 분석</div></div>
            </FloatChip>
            <FloatChip style={{ top: 60, right: -10, animationDelay: '1s', animation: 'floatB 5s ease-in-out infinite' }}>
              <span style={{ fontSize: '1.1rem' }}>☀️</span>
              <div><div style={{ fontSize: '0.82rem', fontWeight: 600 }}>5월 부산 날씨</div><div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>평균 19°C · 맑음</div></div>
            </FloatChip>
            <FloatChip style={{ top: '42%', left: -28, animationDelay: '1.5s' }}>
              <span style={{ fontSize: '1.1rem' }}>✅</span>
              <div><div style={{ fontSize: '0.82rem', fontWeight: 600 }}>일정 생성 완료</div><div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>58초 소요</div></div>
            </FloatChip>
          </div>
        </div>
      </section>

      {/* ── DESTINATIONS ── */}
      <section style={{ padding: '80px 64px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36 }}>
          <div>
            <p style={{ fontFamily: "'Caveat', cursive", fontSize: '1.1rem', color: 'var(--sky)', marginBottom: 6 }}>지금 뜨는 여행지</p>
            <h2 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2rem)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              이번 달 인기 여행지
            </h2>
          </div>
          <a href="#" style={{ fontSize: '0.85rem', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--sky)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
          >전체 보기 →</a>
        </div>
        <div style={{ display: 'flex', gap: 18, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
          {DESTINATIONS.map((d, i) => (
            <DestCard key={i} {...d} />
          ))}
        </div>
      </section>

      {/* ── AI FEATURES ── */}
      <section style={{
        background: 'linear-gradient(160deg, #EFF6FF 0%, #F0FDF4 45%, #FFF7ED 100%)',
        padding: '96px 64px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -80, left: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', bottom: -60, right: -60, width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', pointerEvents: 'none' }}/>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ fontFamily: "'Caveat', cursive", fontSize: '1.15rem', color: 'var(--sky)', marginBottom: 12 }}>Claude AI 기반 여행 설계</p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 800, color: 'var(--text)', lineHeight: 1.3, letterSpacing: '-0.02em', marginBottom: 16 }}>
              단순 추천이 아니라<br />진짜 여행 설계예요
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: '0.95rem', lineHeight: 1.9, maxWidth: 520, margin: '0 auto', fontWeight: 300 }}>
              도착지에 늦지 않도록 역산하고, 동선을 최적화하고<br />리뷰 수백 개를 분석해 맛집을 골라드려요
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 60 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{
                background: '#fff', borderRadius: 24, padding: '32px',
                border: `1px solid ${f.border}`,
                boxShadow: '0 4px 20px rgba(14,165,233,0.05)',
                display: 'flex', alignItems: 'flex-start', gap: 20,
                transition: 'all 0.25s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 16px 40px rgba(14,165,233,0.12)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(14,165,233,0.05)' }}
              >
                <div style={{
                  width: 58, height: 58, borderRadius: 16, flexShrink: 0,
                  background: f.color, border: `1px solid ${f.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{f.title}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text2)', lineHeight: 1.75 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <FullPlanCard />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '80px 64px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ fontFamily: "'Caveat', cursive", fontSize: '1.1rem', color: 'var(--sky)', marginBottom: 8 }}>사용 방법</p>
          <h2 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2rem)', fontWeight: 800, letterSpacing: '-0.02em' }}>3분이면 충분해요</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
          {STEPS.map((s, i) => {
            const sc = STEP_COLORS[i]
            return (
              <div key={i} style={{ position: 'relative' }}>
                {i < STEPS.length - 1 && (
                  <div style={{
                    position: 'absolute', top: 44, right: -12, zIndex: 1,
                    fontSize: '1.1rem', color: 'var(--border)',
                  }}>→</div>
                )}
                <div style={{
                  background: '#fff', borderRadius: 22, padding: '30px 24px',
                  border: '1px solid var(--border-lt)',
                  boxShadow: '0 2px 12px rgba(14,165,233,0.06)',
                  transition: 'all 0.25s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-5px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 16px 40px rgba(14,165,233,0.12)` }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(14,165,233,0.06)' }}
                >
                  <div style={{
                    fontFamily: "'Caveat', cursive", fontSize: '2.4rem', fontWeight: 700, marginBottom: 12,
                    background: `linear-gradient(135deg, ${sc.from}, ${sc.to})`,
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  }}>{s.num}</div>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14, marginBottom: 16,
                    background: sc.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
                  }}>{s.icon}</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{s.title}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text3)', lineHeight: 1.75, fontWeight: 400 }}>{s.desc}</div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '0 64px 80px' }}>
        <div style={{
          borderRadius: 24,
          background: 'linear-gradient(135deg, var(--sky-lt) 0%, var(--sky-dk) 100%)',
          padding: '56px 64px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40,
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(14,165,233,0.3)',
        }}>
          <div style={{ position: 'absolute', right: 160, fontSize: '9rem', color: 'rgba(255,255,255,0.06)', transform: 'rotate(-10deg)', userSelect: 'none' }}>✈</div>
          <div>
            <p style={{ fontFamily: "'Caveat', cursive", fontSize: '1.05rem', color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>지금 바로 시작해보세요</p>
            <h2 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2rem)', fontWeight: 800, color: '#fff', lineHeight: 1.3, letterSpacing: '-0.02em' }}>
              첫 AI 일정,<br />무료로 만들어드릴게요
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 14, flexShrink: 0 }}>
            <button onClick={() => window.location.href = '/register'} style={{
              padding: '14px 32px', borderRadius: 12, fontSize: '0.92rem', fontWeight: 700,
              background: '#fff', color: 'var(--sky-dk)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
            >✨ 무료 일정 만들기</button>
            <button style={{
              padding: '14px 28px', borderRadius: 12, fontSize: '0.92rem', fontWeight: 500,
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              border: '1.5px solid rgba(255,255,255,0.4)', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.22)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)' }}
            >서비스 더 알아보기</button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        background: '#0F172A', padding: '36px 64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
          다갈래<span style={{ color: 'var(--coral)' }}>.</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['서비스 소개', '이용약관', '개인정보처리방침', '공지사항'].map(l => (
            <a key={l} href="#" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
            >{l}</a>
          ))}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.2)' }}>© 2026 다갈래. AI 기반 여행 설계 플랫폼.</div>
      </footer>
    </div>
  )
}

/* ── Sub components ── */

function FloatChip({ children, style }: { children: React.ReactNode; style: React.CSSProperties }) {
  return (
    <div style={{
      position: 'absolute',
      background: '#fff', borderRadius: 14, padding: '10px 16px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      display: 'flex', alignItems: 'center', gap: 10,
      whiteSpace: 'nowrap', animation: 'float 5s ease-in-out infinite',
      ...style,
    }}>{children}</div>
  )
}

function PlanPreviewCard() {
  const tl = [
    { time: '08:00', type: 'move', dot: '#38BDF8', chip: '🚂 KTX', chipColor: '#EFF6FF', chipText: '#0284C7', name: '서울역 → 부산역', detail: '2시간 30분 · 59,800원' },
    { time: '11:00', type: 'food', dot: '#10B981', chip: '🍜 점심', chipColor: '#ECFDF5', chipText: '#059669', name: '부산 밀면 본점', detail: '⭐ 4.6 · 리뷰 91% 긍정' },
    { time: '13:30', type: 'spot', dot: '#F59E0B', chip: '📍 관광', chipColor: '#FFFBEB', chipText: '#B45309', name: '감천문화마을', detail: '약 2시간 소요' },
    { time: '18:00', type: 'stay', dot: '#8B5CF6', chip: '🏨 숙소', chipColor: '#F5F3FF', chipText: '#7C3AED', name: '해운대 오션뷰 호텔', detail: '1박 98,000원' },
  ]
  return (
    <div style={{
      background: '#fff', borderRadius: 20, overflow: 'hidden',
      boxShadow: '0 4px 0 rgba(14,165,233,0.15), 0 20px 60px rgba(0,0,0,0.15)',
      animation: 'float 6s ease-in-out infinite',
    }}>
      <div style={{ background: 'linear-gradient(135deg, #0F172A, #1E3A5F)', padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(14,165,233,0.15)' }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontWeight: 700, color: '#fff', fontSize: '1.3rem' }}>서울</span>
          <span style={{ color: 'var(--sky-lt)', fontSize: '1rem' }}>→</span>
          <span style={{ fontWeight: 700, color: '#fff', fontSize: '1.3rem' }}>부산</span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[['📅', '5월 1~4일'], ['👤', '2인'], ['🧭', '여유롭게']].map(([icon, text]) => (
            <span key={text} style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>{icon} <strong style={{ color: 'rgba(255,255,255,0.88)', fontWeight: 500 }}>{text}</strong></span>
          ))}
        </div>
        <div style={{ position: 'absolute', top: 20, right: 24, background: 'rgba(14,165,233,0.8)', borderRadius: 7, padding: '4px 10px', fontSize: '0.68rem', fontWeight: 600, color: '#fff' }}>✨ AI 생성</div>
      </div>
      <div style={{ padding: '16px 24px 4px' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sky)', letterSpacing: '0.04em', marginBottom: 12 }}>DAY 1 · 5월 1일 목요일</div>
        {tl.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: i < tl.length - 1 ? 12 : 0, position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text3)', marginBottom: 4 }}>{item.time}</span>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.dot, flexShrink: 0 }}/>
              {i < tl.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--border-lt)', marginTop: 2 }}/>}
            </div>
            <div style={{ flex: 1, paddingBottom: 4 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>{item.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 5, background: item.chipColor, color: item.chipText, fontWeight: 600 }}>{item.chip}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{item.detail}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ margin: '12px 16px', background: 'var(--sky-bg)', borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          {[['교통', '119,600'], ['숙소', '294,000'], ['식비', '90,000']].map(([type, val]) => (
            <div key={type} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text3)', marginBottom: 2 }}>{type}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>{val}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text3)' }}>총합</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--sky-dk)' }}>503,600원</div>
        </div>
      </div>
    </div>
  )
}

function FullPlanCard() {
  const days = [
    { num: 'DAY 1', title: '이동일 · 아라시야마', cost: '128,000원', items: [
      { time: '06:20', icon: '✈️', name: '인천 → 간사이 공항', sub: '2시간 10분' },
      { time: '11:00', icon: '🌿', name: '아라시야마 대나무숲', sub: '약 1시간 30분' },
      { time: '13:30', icon: '🍱', name: '카이세키 정식', sub: '⭐ 4.7 · 예약 완료' },
      { time: '18:00', icon: '🏨', name: '교토 기온 료칸', sub: '1박 85,000원' },
    ]},
    { num: 'DAY 2', title: '후시미이나리 · 니시키 시장', cost: '54,000원', items: [
      { time: '07:30', icon: '⛩️', name: '후시미이나리 타이샤', sub: '이른 아침 추천 · 약 2시간' },
      { time: '11:00', icon: '🛒', name: '니시키 시장 탐방', sub: '교토의 부엌 · 약 1시간' },
      { time: '14:00', icon: '🍣', name: '스시 오마카세', sub: '⭐ 4.9 · 예약 필수' },
    ]},
    { num: 'DAY 3', title: '킨카쿠지 · 철학의 길', cost: '42,000원', items: [
      { time: '09:00', icon: '🥇', name: '킨카쿠지 금각사', sub: '오전 방문 추천' },
      { time: '14:00', icon: '🌸', name: '철학의 길 산책', sub: '약 2km · 카페 다수' },
    ]},
  ]
  return (
    <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}>
      <div style={{ padding: '18px 24px', background: 'var(--sky-bg)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>서울 → 교토 4박 5일</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text3)', display: 'flex', gap: 12 }}>
            <span>✈️ 2026.06.10 — 06.14</span><span>👤 혼자</span><span>🧭 빡빡하게</span>
          </div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, var(--sky-lt), var(--sky-dk))', color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '6px 14px', borderRadius: 8 }}>✨ AI 생성됨</div>
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {days.map(day => (
          <div key={day.num} style={{ borderBottom: '1px solid var(--border-lt)' }}>
            <div style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 10, background: '#fff', position: 'sticky', top: 0 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'var(--sky)', color: '#fff', padding: '3px 10px', borderRadius: 5 }}>{day.num}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{day.title}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--sky)', fontWeight: 600 }}>{day.cost}</span>
            </div>
            <div style={{ padding: '4px 24px 14px' }}>
              {day.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '5px 0' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text3)', width: 40, flexShrink: 0, paddingTop: 2 }}>{item.time}</span>
                  <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '16px 24px', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>5일 예상 총 비용</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>892,000원</div>
        </div>
        <button style={{
          background: 'linear-gradient(135deg, var(--sky-lt), var(--sky-dk))',
          color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 10,
          fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
        }}>이 일정으로 시작하기 →</button>
      </div>
    </div>
  )
}

function DestCard({ img, flag, country, name, rating, reviews, price, tags, badge, badgeColor }: {
  img: string; flag: string; country: string; name: string;
  rating: string; reviews: string; price: string; tags: string[];
  badge?: string; badgeColor: string;
}) {
  return (
    <div style={{
      flexShrink: 0, width: 230, background: '#fff', borderRadius: 18, overflow: 'hidden',
      border: '1px solid var(--border-lt)', cursor: 'pointer', transition: 'all 0.25s',
      boxShadow: '0 2px 12px rgba(14,165,233,0.06)',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-5px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 16px 40px rgba(14,165,233,0.15)' }}
    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(14,165,233,0.06)' }}
    >
      <div style={{ height: 155, overflow: 'hidden', position: 'relative' }}>
        <img src={img} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
          onMouseLeave={e => (e.currentTarget.style.transform = '')}
        />
        <span style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(255,255,255,0.95)', borderRadius: 7, padding: '3px 9px', fontSize: '0.72rem', fontWeight: 700 }}>{flag} {country}</span>
        {badge && <span style={{ position: 'absolute', bottom: 12, right: 12, background: badgeColor, borderRadius: 6, padding: '3px 10px', fontSize: '0.65rem', fontWeight: 700, color: '#fff' }}>{badge}</span>}
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>{name}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>⭐ {rating} · {reviews}개</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--sky-dk)' }}>{price}</span>
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {tags.map(t => (
            <span key={t} style={{ fontSize: '0.67rem', background: 'var(--sky-bg)', color: 'var(--sky-dk)', padding: '3px 9px', borderRadius: 5, fontWeight: 500 }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
