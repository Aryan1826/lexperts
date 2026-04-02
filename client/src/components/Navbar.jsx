// src/components/Navbar.jsx

import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getUser, logout } from '../services/auth.service'
import styles from './Navbar.module.css'

export default function Navbar() {
  const user = getUser()
  const { pathname } = useLocation()
  const isExpert = user?.role === 'expert'
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Close menu when route changes
  useEffect(() => { setMenuOpen(false) }, [pathname])

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const navLinks = isExpert
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/expert-dashboard', label: 'My Bookings' },
        { to: '/expert-profile', label: 'Profile' },
      ]
    : [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/experts', label: 'Find Experts' },
        { to: '/my-bookings', label: 'My Bookings' },
      ]

  return (
    <nav className={styles.nav} ref={menuRef}>
      <div className={styles.inner}>
        {/* Brand */}
        <Link to="/dashboard" className={styles.brand}>
          <span className={styles.brandL}>L</span>Experts
        </Link>

        {/* Desktop links */}
        <div className={styles.links}>
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`${styles.link} ${pathname === to ? styles.active : ''}`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Desktop right side */}
        <div className={styles.right}>
          <span className={styles.userName}>{user?.name}</span>
          <button className={styles.logoutBtn} onClick={logout}>Sign out</button>
        </div>

        {/* Hamburger button — mobile only */}
        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <span className={`${styles.bar} ${menuOpen ? styles.barTopOpen : ''}`} />
          <span className={`${styles.bar} ${menuOpen ? styles.barMidOpen : ''}`} />
          <span className={`${styles.bar} ${menuOpen ? styles.barBotOpen : ''}`} />
        </button>
      </div>

      {/* Mobile drawer */}
      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ''}`}>
        <div className={styles.mobileLinks}>
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`${styles.mobileLink} ${pathname === to ? styles.mobileLinkActive : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
        </div>
        <div className={styles.mobileDivider} />
        <div className={styles.mobileUser}>
          <span className={styles.mobileUserName}>{user?.name}</span>
          <span className={styles.mobileUserRole}>{isExpert ? 'Expert' : 'Client'}</span>
        </div>
        <button
          className={styles.mobileLogout}
          onClick={() => { setMenuOpen(false); logout() }}
        >
          Sign out
        </button>
      </div>

      {/* Backdrop */}
      {menuOpen && <div className={styles.backdrop} onClick={() => setMenuOpen(false)} />}
    </nav>
  )
}
