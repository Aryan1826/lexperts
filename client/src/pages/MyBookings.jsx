// src/pages/MyBookings.jsx

import { useState, useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'
import ErrorBoundary from '../components/ErrorBoundary'
import ConfirmModal from '../components/ConfirmModal'
import { BookingsPageSkeleton } from '../components/LoadingSkeleton'
import { getMyBookings, cancelBooking } from '../services/booking.service'
import { SERVER_URL } from '../config'
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
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, bookingId: null })
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshLabel, setRefreshLabel] = useState('')
  const pollRef = useRef(null)

  const fetchBookings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    if (!silent) setError('')
    try {
      const data = await getMyBookings()
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

  // Step 1: open confirm modal
  const handleCancelClick = (bookingId) => {
    setConfirmModal({ isOpen: true, bookingId })
  }

  // Step 2: user confirmed → proceed
  const handleCancelConfirm = async () => {
    const bookingId = confirmModal.bookingId
    setConfirmModal({ isOpen: false, bookingId: null })

    setCancellingId(bookingId)
    try {
      await cancelBooking(bookingId)
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, status: 'cancelled' } : b))
      )
      toast.success('Booking cancelled successfully.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel booking.')
    } finally {
      setCancellingId(null)
    }
  }

  // Step 2 (alt): user dismissed → close modal
  const handleCancelDismiss = () => {
    setConfirmModal({ isOpen: false, bookingId: null })
  }

  const filteredBookings =
    filter === 'all'
      ? bookings
      : bookings.filter((b) => b.status === filter)

  const activeBookings = bookings.filter((b) => b.status !== 'completed' && b.status !== 'cancelled')
  const completedBookings = bookings.filter((b) => b.status === 'completed')
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled')

  return (
    <ErrorBoundary>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Cancel Booking"
        message="Are you sure you want to cancel this booking? This action cannot be undone."
        confirmLabel="Yes, Cancel It"
        cancelLabel="Keep Booking"
        confirmVariant="danger"
        onConfirm={handleCancelConfirm}
        onCancel={handleCancelDismiss}
      />

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

            {/* Refresh indicator */}
            {refreshLabel && !loading && (
              <p className={styles.refreshLabel}>{refreshLabel} · auto-refreshes every 30s</p>
            )}

            {/* Loading State */}
            {loading && <BookingsPageSkeleton cardCount={3} statsCount={3} />}

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
                        <h3 className={styles.expertName}>{booking.expertId?.userId?.name || 'Expert'}</h3>
                        <p className={styles.expertSpecialization}>
                          {booking.expertId?.specialization?.join(', ') || 'Legal Expert'}
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
                          <span className={styles.label}>📝 Notes</span>
                          <span className={styles.value}>{booking.notes}</span>
                        </div>
                      )}

                      {booking.caseDescription && (
                        <div className={styles.bookingDetail}>
                          <span className={styles.label}>📋 Case</span>
                          <span className={styles.value}>{booking.caseDescription}</span>
                        </div>
                      )}

                      {booking.documents?.length > 0 && (
                        <div className={styles.bookingDetail} style={{ alignItems: 'flex-start' }}>
                          <span className={styles.label}>📎 Your Documents</span>
                          <div className={styles.docList}>
                            {booking.documents.map((doc, i) => (
                              <a
                                key={i}
                                href={`${SERVER_URL}${doc.path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.docLink}
                              >
                                {doc.mimetype === 'application/pdf' ? '📄' : '🖼️'} {doc.originalName}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Expert's response — blue bubble, shown when expert has added notes */}
                    {booking.expertNotes && (
                      <div style={{ padding: '0 24px 20px', borderBottom: '1px solid #f0f0f0' }}>
                        <p style={{
                          fontSize: '12px', fontWeight: 600, textTransform: 'uppercase',
                          color: 'var(--ink-muted)', margin: '0 0 8px', letterSpacing: '0.5px',
                        }}>
                          💬 Expert's Response
                        </p>
                        <div style={{
                          background: '#f0f7ff', borderLeft: '3px solid #2196F3',
                          borderRadius: '0 6px 6px 0', padding: '12px 16px',
                          fontSize: '14px', color: 'var(--ink)', lineHeight: 1.6,
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>
                          {booking.expertNotes}
                        </div>
                      </div>
                    )}

                    {/* Referral — amber bubble, shown when expert declined with a referral */}
                    {booking.status === 'cancelled' && booking.referralMessage && (
                      <div style={{ padding: '0 24px 20px', borderBottom: '1px solid #f0f0f0' }}>
                        <p style={{
                          fontSize: '12px', fontWeight: 600, textTransform: 'uppercase',
                          color: 'var(--ink-muted)', margin: '0 0 8px', letterSpacing: '0.5px',
                        }}>
                          🔀 Expert's Referral
                        </p>
                        <div style={{
                          background: '#fff8e1', borderLeft: '3px solid #FF9800',
                          borderRadius: '0 6px 6px 0', padding: '12px 16px',
                          fontSize: '14px', color: 'var(--ink)', lineHeight: 1.6,
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>
                          {booking.referralMessage}
                        </div>
                      </div>
                    )}

                    <div className={styles.cardFooter}>
                      {(booking.status === 'pending' || booking.status === 'confirmed') && (
                        <button
                          className={styles.cancelBtn}
                          onClick={() => handleCancelClick(booking._id)}
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
    </ErrorBoundary>
  )
}
