import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useWindowSize } from '../hooks/useWindowSize'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const isLoggedIn = !!localStorage.getItem('accessToken')
  const { isMobile } = useWindowSize()
  const isLanding = location.pathname === '/'
  const onDark = isLanding && !scrolled

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/')
  }

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '0 20px' : '0 48px',
        background: scrolled || !isLanding ? 'rgba(255,255,255,0.96)' : 'transparent',
        backdropFilter: scrolled || !isLanding ? 'blur(20px)' : 'none',
        borderBottom: scrolled || !isLanding ? '1px solid var(--border-lt)' : 'none',
        transition: 'all 0.3s ease',
        boxShadow: scrolled ? '0 2px 20px rgba(14,165,233,0.08)' : 'none',
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: onDark ? 'rgba(255,255,255,0.2)' : 'linear-gradient(135deg, var(--sky-lt), var(--sky-dk))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, flexShrink: 0,
            boxShadow: onDark ? 'none' : '0 4px 12px rgba(14,165,233,0.3)',
          }}>✈️</div>
          <span style={{
            fontSize: '1.15rem', fontWeight: 800,
            color: onDark ? '#fff' : 'var(--text)',
            letterSpacing: '-0.02em', whiteSpace: 'nowrap',
          }}>
            다갈래<span style={{ color: onDark ? '#FDE68A' : 'var(--coral)' }}>.</span>
          </span>
        </Link>

        {/* Desktop nav */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {['국내여행', '해외여행', 'AI 일정', '팀 여행'].map(label => (
              <a key={label} href="#" style={{
                padding: '7px 14px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500,
                color: onDark ? 'rgba(255,255,255,0.85)' : 'var(--text2)',
                transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = onDark ? '#fff' : 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = onDark ? 'rgba(255,255,255,0.85)' : 'var(--text2)')}
              >{label}</a>
            ))}

            {isLoggedIn ? (
              <>
                <Link to="/travels" style={{
                  padding: '7px 14px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500,
                  color: onDark ? 'rgba(255,255,255,0.85)' : 'var(--text2)', whiteSpace: 'nowrap',
                }}>내 여행</Link>
                <button onClick={handleLogout} style={{
                  marginLeft: 4, padding: '8px 18px', borderRadius: 10, fontSize: '0.875rem', fontWeight: 700,
                  background: 'var(--coral)', color: '#fff',
                  boxShadow: '0 4px 12px rgba(255,107,107,0.3)', transition: 'all 0.2s', whiteSpace: 'nowrap',
                }}>로그아웃</button>
              </>
            ) : (
              <>
                <Link to="/login" style={{
                  padding: '8px 16px', borderRadius: 10, fontSize: '0.875rem', fontWeight: 500,
                  color: onDark ? 'rgba(255,255,255,0.9)' : 'var(--text2)', whiteSpace: 'nowrap',
                }}>로그인</Link>
                <Link to="/register" style={{
                  marginLeft: 4, padding: '8px 18px', borderRadius: 10, fontSize: '0.875rem', fontWeight: 700,
                  background: onDark
                    ? 'rgba(255,255,255,0.18)'
                    : 'linear-gradient(135deg, var(--sky-lt), var(--sky-dk))',
                  color: '#fff',
                  border: onDark ? '1px solid rgba(255,255,255,0.3)' : 'none',
                  boxShadow: onDark ? 'none' : '0 4px 14px rgba(14,165,233,0.35)',
                  transition: 'all 0.2s', whiteSpace: 'nowrap',
                }}>시작하기 →</Link>
              </>
            )}
          </div>
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <button onClick={() => setMenuOpen(v => !v)} style={{
            width: 36, height: 36, borderRadius: 8, background: 'none', border: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer',
          }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{ width: 22, height: 2, borderRadius: 1, background: onDark ? '#fff' : 'var(--text)', display: 'block', transition: 'all 0.2s' }}/>
            ))}
          </button>
        )}
      </nav>

      {/* Mobile menu dropdown */}
      {isMobile && menuOpen && (
        <div style={{
          position: 'fixed', top: 60, left: 0, right: 0, zIndex: 199,
          background: '#fff', borderBottom: '1px solid var(--border-lt)',
          padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4,
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
        }}>
          {['국내여행', '해외여행', 'AI 일정', '팀 여행'].map(label => (
            <a key={label} href="#" onClick={() => setMenuOpen(false)} style={{ padding: '12px 16px', borderRadius: 10, fontSize: '0.95rem', fontWeight: 500, color: 'var(--text2)', display: 'block' }}>{label}</a>
          ))}
          <div style={{ height: 1, background: 'var(--border-lt)', margin: '8px 0' }}/>
          {isLoggedIn ? (
            <>
              <Link to="/travels" onClick={() => setMenuOpen(false)} style={{ padding: '12px 16px', borderRadius: 10, fontSize: '0.95rem', fontWeight: 500, color: 'var(--text2)', display: 'block' }}>내 여행</Link>
              <button onClick={handleLogout} style={{ padding: '12px 16px', borderRadius: 10, fontSize: '0.95rem', fontWeight: 700, background: 'var(--coral)', color: '#fff', border: 'none', textAlign: 'left' }}>로그아웃</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)} style={{ padding: '12px 16px', borderRadius: 10, fontSize: '0.95rem', fontWeight: 500, color: 'var(--text2)', display: 'block' }}>로그인</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} style={{ padding: '12px 16px', borderRadius: 10, fontSize: '0.95rem', fontWeight: 700, background: 'linear-gradient(135deg, var(--sky-lt), var(--sky-dk))', color: '#fff', display: 'block', textAlign: 'center', borderRadius: 10 }}>시작하기 →</Link>
            </>
          )}
        </div>
      )}
    </>
  )
}
