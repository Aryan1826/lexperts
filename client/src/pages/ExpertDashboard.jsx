// client/src/pages/ExpertDashboard.jsx

import { useState, useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'
import ErrorBoundary from '../components/ErrorBoundary'
import ConfirmModal from '../components/ConfirmModal'
import { BookingsPageSkeleton } from '../components/LoadingSkeleton'
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
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, bookingId: null })
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshLabel, setRefreshLabel] = useState('')
  const pollRef = useRef(null)

  const fetchBookings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    if (!silent) setError('')
    try {
      const data = await getExpertBookings()
      setBookings(data.bookings || [])
      setLastUpdated(new Date())
    } catch (err) {
      if (!silent) setError(err.response?.data?.message || 'Failed to load bookings.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // Initial load + poll every 30 seconds
  useEffect(() => {
    fetchBookings(false)
    pollRef.current = setInterval(() => fetchBookings(true), 30000)
    return () => clearInterval(pollRef.current)
  }, [fetchBookings])

  // Update "Updated X ago" label every 15 seconds
  useEffect(() => {
    if (!lastUpdated) return
    const updateLabel = () => {
      const seconds = Math.floor((new Date() - lastUpdated) / 1000)
      if (seconds < 10) setRefreshLabel('Updated just now')
      else if (seconds < 60) setRefreshLabel(`Updated ${seconds}s ago`)
      else setRefreshLabel(`Updated ${Math.floor(seconds / 60)}m ago`)
    }
    updateLabel()
    const t = setInterval(updateLabel, 15000)
    return () => clearInterval(t)
  }, [lastUpdated])

  const handleConfirmBooking = async (bookingId) => {
    setActioningId(bookingId)
    setActionType('confirm')
    try {
      await confirmBooking(bookingId)
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, status: 'confirmed' } : b))
      )
      toast.success('Booking confirmed! The client has been notified.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm booking.')
    } finally {
      setActioningId(null)
      setActionType(null)
    }
  }

  // Step 1: open confirm modal
  const handleCancelClick = (bookingId) => {
    setConfirmModal({ isOpen: true, bookingId })
  }

  // Step 2: user confirmed → proceed
  const handleCancelConfirm = async () => {
    const bookingId = confirmModal.bookingId
    setConfirmModal({ isOpen: false, bookingId: null })

    setActioningId(bookingId)
    setActionType('cancel')
    try {
      await cancelBooking(bookingId)
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, status: 'cancelled' } : b))
      )
      toast.success('Booking declined successfully.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel booking.')
    } finally {
      setActioningId(null)
      setActionType(null)
    }
  }

  // Step 2 (alt): user dismissed
  const handleCancelDismiss = () => {
    setConfirmModal({ isOpen: false, bookingId: null })
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
    <ErrorBoundary>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Decline Booking"
        message="Are you sure you want to decline this booking request? The client will be notified."
        confirmLabel="Yes, Decline"
        cancelLabel="Keep It"
        confirmVariant="danger"
        onConfirm={handleCancelConfirm}
        onCancel={handleCancelDismiss}
      />

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
            {/* Stats Cards */}
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

            {/* Refresh indicator */}
            {refreshLabel && !loading && (
              <p className={styles.refreshLabel}>{refreshLabel} · auto-refreshes every 30s</p>
            )}

            {/* Loading State */}
            {loading && <BookingsPageSkeleton cardCount={3} statsCount={4} />}

            {/* Error State */}
            {error && !loading && (
              <div className={styles.errorBox}>
                <p>{error}</p>
                <button onClick={() => fetchBookings(false)} className={styles.retryBtn}>
                  Retry
                </button>
              </div>
            )}

            {/* Empty State */}
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

            {/* Bookings List */}
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
                          {booking.date ? new Date(booking.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          }) : 'N/A'}
                        </span>
                      </div>

                      <div className={styles.bookingDetail}>
                        <span className={styles.label}>⏰ Time</span>
                        <span className={styles.value}>
                          {booking.slot?.start ? `${booking.slot.start} - ${booking.slot.end}` : 'N/A'}
                        </span>
                      </div>

                      <div className={styles.bookingDetail}>
                        <span className={styles.label}>💰 Fee</span>
                        <span className={styles.value}>₹{booking.consultationFeeAtBooking || 'N/A'}</span>
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
                            onClick={() => handleCancelClick(booking._id)}
                            disabled={actioningId === booking._id}
                          >
                            ✗ Decline
                          </button>
                        </>
                      )}
                      {booking.status === 'confirmed' && (
                        <button
                          className={styles.cancelBtn}
                          onClick={() => handleCancelClick(booking._id)}
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
    </ErrorBoundary>
  )
}
