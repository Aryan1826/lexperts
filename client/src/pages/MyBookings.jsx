// src/pages/MyBookings.jsx

import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Spinner from '../components/Spinner'
import { getMyBookings, cancelBooking } from '../services/booking.service'
import styles from './MyBookings.module.css'

const STATUS_COLORS = {
  pending: '#FF9800',
  confirmed: '#4CAF50',
  completed: '#2196F3',
  cancelled: '#F44336',
}

const STATUS_LABELS = {
  pending: 'Awaiting Confirmation',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [cancellingId, setCancellingId] = useState(null)

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getMyBookings()
      setBookings(data.bookings || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load bookings.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return
    }

    setCancellingId(bookingId)
    try {
      await cancelBooking(bookingId)
      setBookings((prev) => prev.map((b) => (b._id === bookingId ? { ...b, status: 'cancelled' } : b)))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking.')
    } finally {
      setCancellingId(null)
    }
  }

  const filteredBookings =
    filter === 'all'
      ? bookings
      : bookings.filter((b) => b.status === filter)

  const activeBookings = bookings.filter((b) => b.status !== 'completed' && b.status !== 'cancelled')
  const completedBookings = bookings.filter((b) => b.status === 'completed')
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled')

  return (
    <div className={styles.page}>
      <Navbar />
      <main>
        <div className={styles.pageHead}>
          <div className="container">
            <h1 className={styles.pageTitle}>My Bookings</h1>
            <p className={styles.pageSub}>Manage your consultation appointments with legal experts.</p>
          </div>
        </div>

        <div className="container">
          {/* Stats Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{activeBookings.length}</div>
              <div className={styles.statLabel}>Active</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{completedBookings.length}</div>
              <div className={styles.statLabel}>Completed</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{cancelledBookings.length}</div>
              <div className={styles.statLabel}>Cancelled</div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className={styles.filterTabs}>
            {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((tab) => (
              <button
                key={tab}
                className={`${styles.filterTab} ${filter === tab ? styles.active : ''}`}
                onClick={() => setFilter(tab)}
              >
                {tab === 'all' ? 'All Bookings' : STATUS_LABELS[tab]}
              </button>
            ))}
          </div>

          {/* Loading State */}
          {loading && <Spinner />}

          {/* Error State */}
          {error && !loading && (
            <div className={styles.errorBox}>
              <p>{error}</p>
              <button onClick={fetchBookings} className={styles.retryBtn}>
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredBookings.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📅</div>
              <h3>No bookings found</h3>
              <p>
                {filter === 'all'
                  ? "You don't have any bookings yet. Browse experts to book a consultation."
                  : `You don't have any ${filter} bookings.`}
              </p>
            </div>
          )}

          {/* Bookings List */}
          {!loading && !error && filteredBookings.length > 0 && (
            <div className={styles.bookingsList}>
              {filteredBookings.map((booking) => (
                <div key={booking._id} className={styles.bookingCard}>
                  <div className={styles.cardHeader}>
                    <div className={styles.expertInfo}>
                      <h3 className={styles.expertName}>{booking.expertId?.name || 'Expert'}</h3>
                      <p className={styles.expertSpecialization}>
                        {booking.expertId?.specializations?.join(', ') || 'Legal Expert'}
                      </p>
                    </div>
                    <div
                      className={styles.statusBadge}
                      style={{ backgroundColor: STATUS_COLORS[booking.status] }}
                    >
                      {STATUS_LABELS[booking.status]}
                    </div>
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.bookingDetail}>
                      <span className={styles.label}>📅 Date</span>
                      <span className={styles.value}>
                        {new Date(booking.slotDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className={styles.bookingDetail}>
                      <span className={styles.label}>⏰ Time</span>
                      <span className={styles.value}>{booking.slotTime}</span>
                    </div>

                    <div className={styles.bookingDetail}>
                      <span className={styles.label}>💰 Fee</span>
                      <span className={styles.value}>₹{booking.consultationFee}</span>
                    </div>

                    {booking.notes && (
                      <div className={styles.bookingDetail}>
                        <span className={styles.label}>📝 Notes</span>
                        <span className={styles.value}>{booking.notes}</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.cardFooter}>
                    {booking.status === 'pending' && (
                      <button
                        className={styles.cancelBtn}
                        onClick={() => handleCancelBooking(booking._id)}
                        disabled={cancellingId === booking._id}
                      >
                        {cancellingId === booking._id ? 'Cancelling...' : 'Cancel Booking'}
                      </button>
                    )}
                    {booking.status === 'confirmed' && (
                      <button
                        className={styles.cancelBtn}
                        onClick={() => handleCancelBooking(booking._id)}
                        disabled={cancellingId === booking._id}
                      >
                        {cancellingId === booking._id ? 'Cancelling...' : 'Cancel Booking'}
                      </button>
                    )}
                    {booking.status === 'completed' && (
                      <button className={styles.completeBtn} disabled>
                        ✓ Completed
                      </button>
                    )}
                    {booking.status === 'cancelled' && (
                      <button className={styles.cancelledBtn} disabled>
                        ✗ Cancelled
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
