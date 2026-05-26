import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const navigate  = useNavigate()
  const location  = useLocation()
  const isLoggedIn = !!localStorage.getItem('accessToken')
  const isLanding  = location.pathname === '/'

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/')
  }

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
      borderBottom: solid ? '1px solid #EBEBEB' : 'none',
      boxShadow: scrolled ? '0 2px 16px rgba(0,0,0,0.07)' : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 40px',
      transition: 'all 0.25s',
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
          fontSize: '1.15rem', fontWeight: 900, letterSpacing: '-0.03em',
          color: solid ? '#1A1A1A' : '#fff',
        }}>
          다갈래
        </span>
      </Link>

      {/* 중앙 메뉴 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {NAV_LINKS.map(({ label, href }) => (
          <a key={label} href={href} style={{
            padding: '8px 16px', borderRadius: 6,
            fontSize: '0.875rem', fontWeight: 600,
            color: solid ? '#444' : 'rgba(255,255,255,0.9)',
            transition: 'all 0.15s', textDecoration: 'none',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = solid ? '#F5F5F5' : 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLAnchorElement).style.color = solid ? '#1A1A1A' : '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = solid ? '#444' : 'rgba(255,255,255,0.9)' }}
          >{label}</a>
        ))}
      </div>

      {/* 우측 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {isLoggedIn ? (
          <>
            <Link to="/travels" style={{
              padding: '8px 18px', borderRadius: 8,
              fontSize: '0.875rem', fontWeight: 600,
              color: solid ? '#444' : 'rgba(255,255,255,0.9)',
              border: `1.5px solid ${solid ? '#E0E0E0' : 'rgba(255,255,255,0.35)'}`,
              transition: 'all 0.15s', textDecoration: 'none',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = solid ? '#E0E0E0' : 'rgba(255,255,255,0.35)'; (e.currentTarget as HTMLAnchorElement).style.color = solid ? '#444' : 'rgba(255,255,255,0.9)' }}
            >내 여행</Link>
            <Link to="/profile" style={{
              width: 36, height: 36, borderRadius: '50%',
              background: solid ? 'var(--primary)' : 'rgba(255,255,255,0.2)',
              border: solid ? 'none' : '1.5px solid rgba(255,255,255,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 800, color: '#fff', textDecoration: 'none',
              transition: 'all 0.15s',
            }}>MY</Link>
          </>
        ) : (
          <>
            <Link to="/login" style={{
              padding: '8px 18px', borderRadius: 8,
              fontSize: '0.875rem', fontWeight: 600,
              color: solid ? '#444' : 'rgba(255,255,255,0.9)',
              transition: 'color 0.15s', textDecoration: 'none',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = solid ? '#444' : 'rgba(255,255,255,0.9)' }}
            >로그인</Link>
            <Link to="/register" style={{
              padding: '9px 22px', borderRadius: 8,
              fontSize: '0.875rem', fontWeight: 700,
              background: 'var(--primary)', color: '#fff',
              boxShadow: '0 2px 10px rgba(255,92,0,0.35)',
              transition: 'all 0.15s', textDecoration: 'none',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--primary-dk)'; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--primary)'; (e.currentTarget as HTMLAnchorElement).style.transform = '' }}
            >무료 시작하기</Link>
          </>
        )}
      </div>
    </nav>
  )
}
