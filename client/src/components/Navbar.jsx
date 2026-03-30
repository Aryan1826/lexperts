// src/components/Navbar.jsx

import { Link, useNavigate, useLocation } from 'react-router-dom'
import { getUser, logout } from '../services/auth.service'
import styles from './Navbar.module.css'

export default function Navbar() {
  const user = getUser()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const handleLogout = async () => {
    await logout()
  }

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
          <Link to="/experts" className={`${styles.link} ${pathname === '/experts' ? styles.active : ''}`}>
            Find Experts
          </Link>
        </div>
        <div className={styles.right}>
          <span className={styles.userName}>{user?.name}</span>
          <button className={styles.logoutBtn} onClick={handleLogout}>Sign out</button>
        </div>
      </div>
    </nav>
  )
}