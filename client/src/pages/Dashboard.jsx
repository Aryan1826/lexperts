// src/pages/Dashboard.jsx

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Spinner from '../components/Spinner'
import { getUser } from '../services/auth.service'
import { getMyBookings } from '../services/booking.service'
import styles from './Dashboard.module.css'

const STATUS_LABEL = {
  pending: { label: 'Pending', cls: 'statusPending' },
  confirmed: { label: 'Confirmed', cls: 'statusConfirmed' },
  cancelled: { label: 'Cancelled', cls: 'statusCancelled' },
}

export default function Dashboard() {
  const user = getUser()
  const [bookings, setBookings] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true)
      try {
        const data = await getMyBookings({ limit: 5 })
        setBookings(data.bookings)
        setPagination(data.pagination)
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load bookings.')
      } finally {
        setLoading(false)
      }
    }

    if (user?.role === 'client') fetchBookings()
    else setLoading(false)
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
              <Link to="/experts" className={styles.ctaBtn}>Browse Experts</Link>
            </div>
          </section>

          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{pagination?.total ?? '—'}</span>
              <span className={styles.statLabel}>Total Bookings</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {bookings.filter(b => b.status === 'confirmed').length}
              </span>
              <span className={styles.statLabel}>Confirmed</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {bookings.filter(b => b.status === 'pending').length}
              </span>
              <span className={styles.statLabel}>Pending</span>
            </div>
          </div>

          {user?.role === 'client' && (
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Recent Bookings</h2>
                <Link to="/experts" className={styles.sectionLink}>+ New Booking</Link>
              </div>

              {loading && (
                <div className={styles.center}><Spinner /></div>
              )}

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
                          <span className={styles.bookingDate}>{b.date}</span>
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

          {user?.role === 'expert' && (
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Expert Dashboard</h2>
              </div>
              <div className={styles.expertNote}>
                <p>Manage your profile and view incoming bookings from clients.</p>
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  )
}