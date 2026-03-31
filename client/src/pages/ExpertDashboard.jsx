// client/src/pages/ExpertDashboard.jsx

import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Spinner from '../components/Spinner'
import { getExpertBookings, confirmBooking, cancelBooking } from '../services/booking.service'
import styles from './ExpertDashboard.module.css'

const STATUS_COLORS = {
  pending: '#FF9800',
  confirmed: '#4CAF50',
  completed: '#2196F3',
  cancelled: '#F44336',
}

const STATUS_LABELS = {
  pending: 'Awaiting Your Confirmation',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export default function ExpertDashboard() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [actioningId, setActioningId] = useState(null)
  const [actionType, setActionType] = useState(null)

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getExpertBookings()
      setBookings(data.bookings || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load bookings.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmBooking = async (bookingId) => {
    setActioningId(bookingId)
    setActionType('confirm')
    try {
      await confirmBooking(bookingId)
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, status: 'confirmed' } : b))
      )
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to confirm booking.')
    } finally {
      setActioningId(null)
      setActionType(null)
    }
  }

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return
    }

    setActioningId(bookingId)
    setActionType('cancel')
    try {
      await cancelBooking(bookingId)
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, status: 'cancelled' } : b))
      )
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking.')
    } finally {
      setActioningId(null)
      setActionType(null)
    }
  }

  const filteredBookings =
    filter === 'all'
      ? bookings
      : bookings.filter((b) => b.status === filter)

  const pendingBookings = bookings.filter((b) => b.status === 'pending')
  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed')
  const completedBookings = bookings.filter((b) => b.status === 'completed')
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled')

  return (
    <div className={styles.page}>
      <Navbar />
      <main>
        <div className={styles.pageHead}>
          <div className="container">
            <h1 className={styles.pageTitle}>Expert Dashboard</h1>
            <p className={styles.pageSub}>
              Manage booking requests from clients and track your consultation schedule.
            </p>
          </div>
        </div>

        <div className="container">
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{pendingBookings.length}</div>
              <div className={styles.statLabel}>Pending Requests</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{confirmedBookings.length}</div>
              <div className={styles.statLabel}>Confirmed</div>
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

          {loading && <Spinner />}

          {error && !loading && (
            <div className={styles.errorBox}>
              <p>{error}</p>
              <button onClick={fetchBookings} className={styles.retryBtn}>
                Retry
              </button>
            </div>
          )}

          {!loading && !error && filteredBookings.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📋</div>
              <h3>No bookings found</h3>
              <p>
                {filter === 'all'
                  ? "You don't have any bookings yet. Once clients book with you, they will appear here."
                  : `You don't have any ${filter} bookings.`}
              </p>
            </div>
          )}

          {!loading && !error && filteredBookings.length > 0 && (
            <div className={styles.bookingsList}>
              {filteredBookings.map((booking) => (
                <div key={booking._id} className={styles.bookingCard}>
                  <div className={styles.cardHeader}>
                    <div className={styles.clientInfo}>
                      <h3 className={styles.clientName}>{booking.clientId?.name || 'Client'}</h3>
                      <p className={styles.clientEmail}>{booking.clientId?.email}</p>
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
                        {new Date(booking.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className={styles.bookingDetail}>
                      <span className={styles.label}>⏰ Time</span>
                      <span className={styles.value}>{booking.slot.start} - {booking.slot.end}</span>
                    </div>

                    <div className={styles.bookingDetail}>
                      <span className={styles.label}>💰 Fee</span>
                      <span className={styles.value}>₹{booking.consultationFeeAtBooking}</span>
                    </div>

                    {booking.notes && (
                      <div className={styles.bookingDetail}>
                        <span className={styles.label}>📝 Client Notes</span>
                        <span className={styles.value}>{booking.notes}</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.cardFooter}>
                    {booking.status === 'pending' && (
                      <>
                        <button
                          className={styles.confirmBtn}
                          onClick={() => handleConfirmBooking(booking._id)}
                          disabled={actioningId === booking._id}
                        >
                          {actioningId === booking._id && actionType === 'confirm'
                            ? 'Confirming...'
                            : '✓ Confirm Booking'}
                        </button>
                        <button
                          className={styles.cancelBtn}
                          onClick={() => handleCancelBooking(booking._id)}
                          disabled={actioningId === booking._id}
                        >
                          {actioningId === booking._id && actionType === 'cancel'
                            ? 'Cancelling...'
                            : '✗ Decline'}
                        </button>
                      </>
                    )}
                    {booking.status === 'confirmed' && (
                      <button
                        className={styles.cancelBtn}
                        onClick={() => handleCancelBooking(booking._id)}
                        disabled={actioningId === booking._id}
                      >
                        {actioningId === booking._id ? 'Cancelling...' : 'Cancel Booking'}
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
