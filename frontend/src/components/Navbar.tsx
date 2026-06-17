import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const navigate   = useNavigate()
  const location   = useLocation()
  const isLoggedIn = !!localStorage.getItem('accessToken')
  const isLanding  = location.pathname === '/'

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const solid = scrolled || !isLanding

  const NAV_LINKS = [
    { label: '일본',      href: '/#popular' },
    { label: '국내',      href: '/#popular' },
    { label: '추천 코스', href: '/#sample-itineraries' },
    { label: '가이드',    href: '/#sample-itineraries' },
  ]

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
      height: 64,
      background: solid ? '#fff' : 'transparent',
      borderBottom: solid ? '1px solid var(--border-lt)' : 'none',
      boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 40px',
      transition: 'all 0.2s',
    }}>
      {/* 로고 */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.5" fill="#fff" stroke="none"/>
          </svg>
        </div>
        <span style={{
          fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.03em',
          color: solid ? 'var(--black)' : '#fff',
        }}>
          다갈래
        </span>
      </Link>

      {/* 중앙 메뉴 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {NAV_LINKS.map(({ label, href }) => (
          <a key={label} href={href} style={{
            padding: '8px 16px', borderRadius: 6,
            fontSize: '0.875rem', fontWeight: 500,
            color: solid ? 'var(--text2)' : 'rgba(255,255,255,0.88)',
            transition: 'color 0.15s', textDecoration: 'none',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = solid ? 'var(--primary)' : '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = solid ? 'var(--text2)' : 'rgba(255,255,255,0.88)' }}
          >{label}</a>
        ))}
      </div>

      {/* 우측 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {isLoggedIn ? (
          <>
            <Link to="/travels" style={{
              padding: '7px 16px', borderRadius: 7,
              fontSize: '0.875rem', fontWeight: 500,
              color: solid ? 'var(--text2)' : 'rgba(255,255,255,0.88)',
              border: `1px solid ${solid ? 'var(--border)' : 'rgba(255,255,255,0.3)'}`,
              transition: 'all 0.15s', textDecoration: 'none',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = solid ? 'var(--border)' : 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLAnchorElement).style.color = solid ? 'var(--text2)' : 'rgba(255,255,255,0.88)' }}
            >내 여행</Link>
            <Link to="/profile" style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 700, color: '#fff', textDecoration: 'none',
            }}>MY</Link>
          </>
        ) : (
          <>
            <Link to="/login" style={{
              padding: '7px 16px', borderRadius: 7,
              fontSize: '0.875rem', fontWeight: 500,
              color: solid ? 'var(--text2)' : 'rgba(255,255,255,0.88)',
              transition: 'color 0.15s', textDecoration: 'none',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = solid ? 'var(--text2)' : 'rgba(255,255,255,0.88)' }}
            >로그인</Link>
            <Link to="/register" style={{
              padding: '8px 20px', borderRadius: 7,
              fontSize: '0.875rem', fontWeight: 600,
              background: 'var(--primary)', color: '#fff',
              transition: 'background 0.15s', textDecoration: 'none',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--primary-dk)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--primary)' }}
            >무료 시작하기</Link>
          </>
        )}
      </div>
    </nav>
  )
}
