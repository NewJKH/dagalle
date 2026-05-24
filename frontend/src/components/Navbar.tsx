import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'

export default function Navbar() {
  const [scrolled,  setScrolled]  = useState(false)
  const [menuOpen,  setMenuOpen]  = useState(false)
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

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
        height: 60,
        background: solid ? '#fff' : 'transparent',
        borderBottom: solid ? '1px solid #EBEBEB' : 'none',
        boxShadow: scrolled ? '0 2px 12px rgba(0,0,0,0.06)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px',
        transition: 'all 0.25s',
      }}>
        {/* 로고 */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'var(--primary)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 14,
          }}>✈️</div>
          <span style={{
            fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-0.03em',
            color: solid ? 'var(--black)' : '#fff',
          }}>
            다갈래<span style={{ color: 'var(--primary)' }}>.</span>
          </span>
        </Link>

        {/* 중앙 메뉴 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {[['국내여행', '#'], ['해외여행', '#'], ['AI 일정', '#'], ['팀 여행', '#']].map(([label, href]) => (
            <a key={label} href={href} style={{
              padding: '6px 14px', borderRadius: 6, fontSize: '0.875rem', fontWeight: 500,
              color: solid ? '#444' : 'rgba(255,255,255,0.88)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = solid ? '#F5F5F5' : 'rgba(255,255,255,0.12)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}
            >{label}</a>
          ))}
        </div>

        {/* 우측 버튼 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isLoggedIn ? (
            <>
              <Link to="/travels" style={{
                padding: '7px 16px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600,
                color: solid ? '#333' : 'rgba(255,255,255,0.9)',
                border: `1.5px solid ${solid ? '#E0E0E0' : 'rgba(255,255,255,0.3)'}`,
                transition: 'all 0.15s',
              }}>내 여행</Link>
              <button onClick={logout} style={{
                padding: '7px 16px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600,
                background: 'var(--primary)', color: '#fff',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-dk)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary)' }}
              >로그아웃</button>
            </>
          ) : (
            <>
              <Link to="/login" style={{
                padding: '7px 16px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600,
                color: solid ? '#333' : 'rgba(255,255,255,0.9)',
                transition: 'color 0.15s',
              }}>로그인</Link>
              <Link to="/register" style={{
                padding: '8px 20px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 700,
                background: 'var(--primary)', color: '#fff',
                boxShadow: '0 2px 8px rgba(255,86,64,0.35)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--primary-dk)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--primary)' }}
              >무료로 시작하기</Link>
            </>
          )}
        </div>
      </nav>
    </>
  )
}
