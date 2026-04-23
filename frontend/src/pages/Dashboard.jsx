// src/pages/Dashboard.jsx

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { getUser } from '../services/auth.service'
import { getMyBookings, getExpertBookings } from '../services/booking.service'
import styles from './Dashboard.module.css'

const STATUS_LABEL = {
  pending:   { label: 'Pending',   cls: 'statusPending' },
  confirmed: { label: 'Confirmed', cls: 'statusConfirmed' },
  cancelled: { label: 'Cancelled', cls: 'statusCancelled' },
}

export default function Dashboard() {
  const user = getUser()
  const isExpert = user?.role === 'expert'

  const [bookings, setBookings] = useState([])
  const [stats, setStats] = useState({ total: null, confirmed: null, pending: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        if (isExpert) {
          // Expert: fetch their incoming client bookings + counts
          const [recent, confirmedRes, pendingRes] = await Promise.all([
            getExpertBookings({ limit: 5 }),
            getExpertBookings({ limit: 1, status: 'confirmed' }),
            getExpertBookings({ limit: 1, status: 'pending' }),
          ])
          setBookings(recent.bookings)
          setStats({
            total:     recent.pagination.total,
            confirmed: confirmedRes.pagination.total,
            pending:   pendingRes.pagination.total,
          })
        } else {
          // Client: fetch their own bookings + counts
          const [recent, confirmedRes, pendingRes] = await Promise.all([
            getMyBookings({ limit: 5 }),
            getMyBookings({ limit: 1, status: 'confirmed' }),
            getMyBookings({ limit: 1, status: 'pending' }),
          ])
          setBookings(recent.bookings)
          setStats({
            total:     recent.pagination.total,
            confirmed: confirmedRes.pagination.total,
            pending:   pendingRes.pagination.total,
          })
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        <div className="container">

          <section className={styles.hero}>
            <div>
              <p className={styles.greet}>{greeting}</p>
              <h1 className={styles.heroTitle}>{user?.name}</h1>
              <p className={styles.heroSub}>
                {user?.role === 'client'
                  ? 'Manage your consultations and connect with experts.'
                  : 'View your schedule and manage incoming bookings.'}
              </p>
            </div>
            <div className={styles.heroCta}>
              {isExpert
                ? <Link to="/expert-dashboard" className={styles.ctaBtn}>View Bookings</Link>
                : <Link to="/experts" className={styles.ctaBtn}>Browse Experts</Link>}
            </div>
          </section>

          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{loading ? '…' : (stats.total ?? 0)}</span>
              <span className={styles.statLabel}>{isExpert ? 'Total Clients' : 'Total Bookings'}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{loading ? '…' : (stats.confirmed ?? 0)}</span>
              <span className={styles.statLabel}>Confirmed</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{loading ? '…' : (stats.pending ?? 0)}</span>
              <span className={styles.statLabel}>Pending</span>
            </div>
          </div>

          {user?.role === 'client' && (
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Recent Bookings</h2>
                <Link to="/experts" className={styles.sectionLink}>+ New Booking</Link>
              </div>

              {loading && <DashboardSkeleton />}

              {error && (
                <div className={styles.errorBox}>{error}</div>
              )}

              {!loading && !error && bookings.length === 0 && (
                <div className={styles.empty}>
                  <p className={styles.emptyTitle}>No bookings yet</p>
                  <p className={styles.emptySub}>Find an expert and book your first consultation.</p>
                  <Link to="/experts" className={styles.ctaBtn} style={{ marginTop: '16px', display: 'inline-block' }}>
                    Find an Expert
                  </Link>
                </div>
              )}

              {!loading && bookings.length > 0 && (
                <div className={styles.bookingList}>
                  {bookings.map((b) => {
                    const st = STATUS_LABEL[b.status] || STATUS_LABEL.pending
                    const expertUser = b.expertId?.userId
                    return (
                      <div key={b._id} className={styles.bookingRow}>
                        <div className={styles.bookingLeft}>
                          <div className={styles.bookingAvatar}>
                            {expertUser?.name?.[0]?.toUpperCase() || 'E'}
                          </div>
                          <div>
                            <p className={styles.bookingName}>{expertUser?.name || 'Expert'}</p>
                            <p className={styles.bookingSpec}>
                              {b.expertId?.specialization?.join(', ')}
                            </p>
                          </div>
                        </div>
                        <div className={styles.bookingMeta}>
                          <span className={styles.bookingDate}>
                            {b.date ? new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                          </span>
                          <span className={styles.bookingSlot}>{b.slot?.start} – {b.slot?.end}</span>
                        </div>
                        <span className={`${styles.status} ${styles[st.cls]}`}>{st.label}</span>
                        <span className={styles.bookingFee}>₹{b.consultationFeeAtBooking}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {isExpert && (
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Recent Client Bookings</h2>
                <Link to="/expert-dashboard" className={styles.sectionLink}>View all →</Link>
              </div>

              {loading && <DashboardSkeleton />}

              {error && <div className={styles.errorBox}>{error}</div>}

              {!loading && !error && bookings.length === 0 && (
                <div className={styles.empty}>
                  <p className={styles.emptyTitle}>No bookings yet</p>
                  <p className={styles.emptySub}>Complete your profile so clients can find and book you.</p>
                  <Link to="/expert-profile" className={styles.ctaBtn} style={{ marginTop: '16px', display: 'inline-block' }}>
                    Complete Profile
                  </Link>
                </div>
              )}

              {!loading && !error && bookings.length > 0 && (
                <div className={styles.bookingList}>
                  {bookings.map((b) => {
                    const st = STATUS_LABEL[b.status] || STATUS_LABEL.pending
                    const clientUser = b.clientId
                    return (
                      <div key={b._id} className={styles.bookingRow}>
                        <div className={styles.bookingLeft}>
                          <div className={styles.bookingAvatar}>
                            {clientUser?.name?.[0]?.toUpperCase() || 'C'}
                          </div>
                          <div>
                            <p className={styles.bookingName}>{clientUser?.name || 'Client'}</p>
                            <p className={styles.bookingSpec}>{clientUser?.email || ''}</p>
                          </div>
                        </div>
                        <div className={styles.bookingMeta}>
                          <span className={styles.bookingDate}>
                            {b.date ? new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                          </span>
                          <span className={styles.bookingSlot}>{b.slot?.start} – {b.slot?.end}</span>
                        </div>
                        <span className={`${styles.status} ${styles[st.cls]}`}>{st.label}</span>
                        <span className={styles.bookingFee}>₹{b.consultationFeeAtBooking}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
                <Link to="/expert-dashboard" className={styles.ctaBtn}>Manage Bookings</Link>
                <Link to="/expert-profile" className={styles.ctaBtnOutline}>Edit Profile</Link>
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  )
}