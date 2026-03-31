// src/components/Navbar.jsx

import { Link, useLocation } from 'react-router-dom'
import { getUser, logout } from '../services/auth.service'
import styles from './Navbar.module.css'

export default function Navbar() {
  const user = getUser()
  const { pathname } = useLocation()
  const isExpert = user?.role === 'expert'

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <Link to="/dashboard" className={styles.brand}>
          <span className={styles.brandL}>L</span>Experts
        </Link>
        <div className={styles.links}>
          <Link to="/dashboard" className={`${styles.link} ${pathname === '/dashboard' ? styles.active : ''}`}>
            Dashboard
          </Link>

          {isExpert ? (
            <>
              <Link to="/expert-dashboard" className={`${styles.link} ${pathname === '/expert-dashboard' ? styles.active : ''}`}>
                My Bookings
              </Link>
              <Link to="/expert-profile" className={`${styles.link} ${pathname === '/expert-profile' ? styles.active : ''}`}>
                Profile
              </Link>
            </>
          ) : (
            <>
              <Link to="/experts" className={`${styles.link} ${pathname === '/experts' ? styles.active : ''}`}>
                Find Experts
              </Link>
              <Link to="/my-bookings" className={`${styles.link} ${pathname === '/my-bookings' ? styles.active : ''}`}>
                My Bookings
              </Link>
            </>
          )}
        </div>
        <div className={styles.right}>
          <span className={styles.userName}>{user?.name}</span>
          <button className={styles.logoutBtn} onClick={logout}>Sign out</button>
        </div>
      </div>
    </nav>
  )
}
