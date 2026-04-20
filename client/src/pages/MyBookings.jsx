// src/pages/MyBookings.jsx

import { useState, useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'
import ErrorBoundary from '../components/ErrorBoundary'
import ConfirmModal from '../components/ConfirmModal'
import { BookingsPageSkeleton } from '../components/LoadingSkeleton'
import { getMyBookings, cancelBooking } from '../services/booking.service'
import { createRazorpayOrder, verifyRazorpayPayment, loadRazorpayScript } from '../services/payment.service'
import { SERVER_URL } from '../config'
import styles from './MyBookings.module.css'

const STATUS_COLORS = {
  pending:         '#FF9800',
  payment_pending: '#9C27B0',
  confirmed:       '#4CAF50',
  completed:       '#2196F3',
  cancelled:       '#F44336',
  payment_expired: '#9E9E9E',
}

const STATUS_LABELS = {
  pending:         'Awaiting Expert',
  payment_pending: 'Payment Required',
  confirmed:       'Confirmed',
  completed:       'Completed',
  cancelled:       'Cancelled',
  payment_expired: 'Slot Expired',
}

// ── Countdown hook: returns seconds remaining until deadline ─────────────────
function useCountdown(deadline) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    deadline ? Math.max(0, Math.floor((new Date(deadline) - Date.now()) / 1000)) : 0
  )
  useEffect(() => {
    if (!deadline) return
    const tick = () => {
      const s = Math.max(0, Math.floor((new Date(deadline) - Date.now()) / 1000))
      setSecondsLeft(s)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadline])
  return secondsLeft
}

// ── Meeting link time-lock helper ────────────────────────────────────────────
function getMeetStatus(booking) {
  if (!booking.meetLink || booking.status !== 'confirmed') return null
  const slotStart = new Date(`${booking.date}T${booking.slot.start}:00`)
  const slotEnd   = new Date(`${booking.date}T${booking.slot.end}:00`)
  const now = new Date()
  if (now < slotStart) return { state: 'upcoming', label: `Opens at ${booking.slot.start}` }
  if (now > slotEnd)   return { state: 'ended',    label: 'Meeting ended' }
  return { state: 'active', label: 'Join Meeting' }
}

// ── Individual booking countdown badge ───────────────────────────────────────
function CountdownBadge({ deadline }) {
  const s = useCountdown(deadline)
  if (s <= 0) return <span style={{ color: '#F44336', fontWeight: 600, fontSize: '13px' }}>Expired</span>
  const mins = Math.floor(s / 60)
  const secs = s % 60
  const urgent = s < 300 // last 5 minutes → red
  return (
    <span style={{ color: urgent ? '#F44336' : '#9C27B0', fontWeight: 700, fontSize: '13px' }}>
      ⏱ {mins}:{secs.toString().padStart(2, '0')} remaining
    </span>
  )
}

export default function MyBookings() {
  const [bookings, setBookings]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [filter, setFilter]             = useState('all')
  const [cancellingId, setCancellingId] = useState(null)
  const [payingId, setPayingId]         = useState(null)
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, bookingId: null })
  const [lastUpdated, setLastUpdated]   = useState(null)
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

  // "Updated X ago" label
  useEffect(() => {
    if (!lastUpdated) return
    const updateLabel = () => {
      const s = Math.floor((new Date() - lastUpdated) / 1000)
      if (s < 10)  setRefreshLabel('Updated just now')
      else if (s < 60) setRefreshLabel(`Updated ${s}s ago`)
      else setRefreshLabel(`Updated ${Math.floor(s / 60)}m ago`)
    }
    updateLabel()
    const t = setInterval(updateLabel, 15000)
    return () => clearInterval(t)
  }, [lastUpdated])

  // ── Cancel flow ─────────────────────────────────────────────────────────────
  const handleCancelClick   = (bookingId) => setConfirmModal({ isOpen: true, bookingId })
  const handleCancelDismiss = ()           => setConfirmModal({ isOpen: false, bookingId: null })

  const handleCancelConfirm = async () => {
    const bookingId = confirmModal.bookingId
    setConfirmModal({ isOpen: false, bookingId: null })
    setCancellingId(bookingId)
    try {
      await cancelBooking(bookingId)
      setBookings((prev) => prev.map((b) => b._id === bookingId ? { ...b, status: 'cancelled' } : b))
      toast.success('Booking cancelled successfully.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel booking.')
    } finally {
      setCancellingId(null)
    }
  }

  // ── Pay Now flow ────────────────────────────────────────────────────────────
  const handlePayNow = async (booking) => {
    setPayingId(booking._id)
    try {
      // Step 1: create Razorpay order for this booking
      const { orderId, amount, currency, keyId, expertName, breakdown } = await createRazorpayOrder({
        bookingId: booking._id,
      })

      await loadRazorpayScript()

      const rzp = new window.Razorpay({
        key:         keyId,
        amount:      amount * 100,
        currency,
        name:        'LExperts',
        description: `Consultation with ${expertName || booking.expertId?.userId?.name || 'Expert'}`,
        order_id:    orderId,
        theme:       { color: '#b8922a' },

        handler: async (response) => {
          try {
            await verifyRazorpayPayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              bookingId:           booking._id,
            })
            toast.success('Payment successful! Booking confirmed.')
            fetchBookings(true)
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed. Contact support.')
          } finally {
            setPayingId(null)
          }
        },

        modal: {
          ondismiss: () => {
            toast('Payment cancelled. Your slot is still held until the deadline.', { icon: 'ℹ️' })
            setPayingId(null)
          },
        },
      })

      rzp.open()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not initiate payment.')
      setPayingId(null)
    }
  }

  // ── Derived counts ──────────────────────────────────────────────────────────
  const paymentPendingBookings = bookings.filter((b) => b.status === 'payment_pending')
  const activeBookings         = bookings.filter((b) => !['completed', 'cancelled', 'payment_expired'].includes(b.status))
  const completedBookings      = bookings.filter((b) => b.status === 'completed')
  const cancelledBookings      = bookings.filter((b) => ['cancelled', 'payment_expired'].includes(b.status))

  const filteredBookings =
    filter === 'all' ? bookings : bookings.filter((b) => b.status === filter)

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

            {/* Payment-pending alert banner */}
            {paymentPendingBookings.length > 0 && (
              <div style={{
                background: '#f3e8ff', border: '1px solid #d8b4fe', borderRadius: '10px',
                padding: '14px 20px', marginBottom: '28px',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                <span style={{ fontSize: '20px' }}>⚡</span>
                <div>
                  <strong style={{ color: '#7c3aed' }}>
                    {paymentPendingBookings.length === 1
                      ? '1 booking is awaiting payment'
                      : `${paymentPendingBookings.length} bookings are awaiting payment`}
                  </strong>
                  <p style={{ fontSize: '13px', color: '#6b21a8', margin: '2px 0 0' }}>
                    Complete payment before the deadline to secure your slot.
                  </p>
                </div>
              </div>
            )}

            {/* Stats Cards */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{activeBookings.length}</div>
                <div className={styles.statLabel}>Active</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue} style={{ color: '#9C27B0' }}>{paymentPendingBookings.length}</div>
                <div className={styles.statLabel}>Awaiting Payment</div>
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
              {['all', 'pending', 'payment_pending', 'confirmed', 'completed', 'cancelled'].map((tab) => (
                <button
                  key={tab}
                  className={`${styles.filterTab} ${filter === tab ? styles.active : ''}`}
                  onClick={() => setFilter(tab)}
                >
                  {tab === 'all' ? 'All' : STATUS_LABELS[tab]}
                  {tab === 'payment_pending' && paymentPendingBookings.length > 0 && (
                    <span style={{
                      marginLeft: '6px', background: '#9C27B0', color: 'white',
                      borderRadius: '10px', fontSize: '11px', padding: '1px 6px', fontWeight: 700,
                    }}>
                      {paymentPendingBookings.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Refresh indicator */}
            {!loading && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <p className={styles.refreshLabel} style={{ margin: 0 }}>
                  {refreshLabel ? `${refreshLabel} · auto-refreshes every 30s` : ''}
                </p>
                <button
                  onClick={() => fetchBookings(false)}
                  style={{
                    background: 'transparent', border: '1px solid #d0d0d0', borderRadius: '6px',
                    padding: '6px 14px', fontSize: '13px', color: 'var(--ink-muted)',
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--ink)' }}
                  onMouseOut={(e)  => { e.currentTarget.style.borderColor = '#d0d0d0';    e.currentTarget.style.color = 'var(--ink-muted)' }}
                >
                  ↻ Refresh
                </button>
              </div>
            )}

            {loading  && <BookingsPageSkeleton cardCount={3} statsCount={4} />}
            {error && !loading && (
              <div className={styles.errorBox}>
                <p>{error}</p>
                <button onClick={() => fetchBookings(false)} className={styles.retryBtn}>Retry</button>
              </div>
            )}

            {!loading && !error && filteredBookings.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📅</div>
                <h3>No bookings found</h3>
                <p>
                  {filter === 'all'
                    ? "You don't have any bookings yet. Browse experts to book a consultation."
                    : `You don't have any ${STATUS_LABELS[filter] || filter} bookings.`}
                </p>
              </div>
            )}

            {!loading && !error && filteredBookings.length > 0 && (
              <div className={styles.bookingsList}>
                {filteredBookings.map((booking) => (
                  <div
                    key={booking._id}
                    className={styles.bookingCard}
                    style={booking.status === 'payment_pending' ? { borderColor: '#d8b4fe', borderWidth: '2px' } : {}}
                  >
                    <div className={styles.cardHeader}>
                      <div className={styles.expertInfo}>
                        <h3 className={styles.expertName}>{booking.expertId?.userId?.name || 'Expert'}</h3>
                        <p className={styles.expertSpecialization}>
                          {booking.expertId?.specialization?.join(', ') || 'Legal Expert'}
                        </p>
                      </div>
                      <div className={styles.statusBadge} style={{ backgroundColor: STATUS_COLORS[booking.status] }}>
                        {STATUS_LABELS[booking.status] || booking.status}
                      </div>
                    </div>

                    {/* Payment deadline countdown */}
                    {booking.status === 'payment_pending' && booking.paymentDeadline && (
                      <div style={{
                        background: '#f3e8ff', borderBottom: '1px solid #e9d5ff',
                        padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <span style={{ fontSize: '13px', color: '#7c3aed' }}>Pay to confirm your slot</span>
                        <CountdownBadge deadline={booking.paymentDeadline} />
                      </div>
                    )}

                    <div className={styles.cardBody}>
                      <div className={styles.bookingDetail}>
                        <span className={styles.label}>📅 Date</span>
                        <span className={styles.value}>
                          {booking.date
                            ? new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
                            : 'N/A'}
                        </span>
                      </div>
                      <div className={styles.bookingDetail}>
                        <span className={styles.label}>⏰ Time</span>
                        <span className={styles.value}>
                          {booking.slot?.start ? `${booking.slot.start} – ${booking.slot.end}` : 'N/A'}
                        </span>
                      </div>

                      {/* Fee breakdown */}
                      {booking.status === 'payment_pending' && booking.totalAmount > 0 ? (
                        <div className={styles.bookingDetail} style={{ alignItems: 'flex-start' }}>
                          <span className={styles.label}>💰 Amount Due</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '13px' }}>
                            <span style={{ color: 'var(--ink-soft)' }}>Expert fee: ₹{(booking.durationUnits || 1) * (booking.consultationFeeAtBooking || 0)}</span>
                            <span style={{ color: 'var(--ink-soft)' }}>Platform fee: ₹{booking.platformFee || 0}</span>
                            <span style={{ color: 'var(--ink-muted)', fontSize: '12px' }}>GST (18%): ₹{booking.gstAmount || 0}</span>
                            <strong style={{ color: '#7c3aed', fontSize: '15px' }}>Total: ₹{booking.totalAmount}</strong>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.bookingDetail}>
                          <span className={styles.label}>💰 Fee</span>
                          <span className={styles.value}>
                            {booking.totalAmount > 0
                              ? `₹${booking.totalAmount} (paid)`
                              : `₹${booking.consultationFeeAtBooking || 'N/A'}`}
                          </span>
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
                          <span className={styles.label}>📎 Documents</span>
                          <div className={styles.docList}>
                            {booking.documents.map((doc, i) => (
                              <a key={i} href={`${SERVER_URL}${doc.path}`} target="_blank" rel="noopener noreferrer" className={styles.docLink}>
                                {doc.mimetype === 'application/pdf' ? '📄' : '🖼️'} {doc.originalName}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Expert response */}
                    {booking.expertNotes && (
                      <div style={{ padding: '0 24px 20px', borderBottom: '1px solid #f0f0f0' }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', margin: '0 0 8px', letterSpacing: '0.5px' }}>
                          💬 Expert's Response
                        </p>
                        <div style={{ background: '#f0f7ff', borderLeft: '3px solid #2196F3', borderRadius: '0 6px 6px 0', padding: '12px 16px', fontSize: '14px', color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {booking.expertNotes}
                        </div>
                      </div>
                    )}

                    {/* Referral message */}
                    {booking.status === 'cancelled' && booking.referralMessage && (
                      <div style={{ padding: '0 24px 20px', borderBottom: '1px solid #f0f0f0' }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', margin: '0 0 8px', letterSpacing: '0.5px' }}>
                          🔀 Expert's Referral
                        </p>
                        <div style={{ background: '#fff8e1', borderLeft: '3px solid #FF9800', borderRadius: '0 6px 6px 0', padding: '12px 16px', fontSize: '14px', color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {booking.referralMessage}
                        </div>
                      </div>
                    )}

                    <div className={styles.cardFooter}>
                      {/* Join Meeting button — time-locked */}
                      {(() => {
                        const meet = getMeetStatus(booking)
                        if (!meet) return null
                        const active = meet.state === 'active'
                        return (
                          <a
                            href={active ? booking.meetLink : undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={!active ? (e) => e.preventDefault() : undefined}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '6px',
                              height: '38px', padding: '0 20px', borderRadius: '6px',
                              fontWeight: 700, fontSize: '14px', textDecoration: 'none',
                              fontFamily: 'var(--font-sans)', transition: 'background 0.15s',
                              background: active ? '#1a73e8' : '#e0e0e0',
                              color: active ? 'white' : '#9e9e9e',
                              cursor: active ? 'pointer' : 'not-allowed',
                            }}
                            title={!active ? meet.label : 'Join Google Meet'}
                          >
                            🎥 {meet.label}
                          </a>
                        )
                      })()}

                      {/* Pay Now button */}
                      {booking.status === 'payment_pending' && (
                        <button
                          onClick={() => handlePayNow(booking)}
                          disabled={payingId === booking._id}
                          style={{
                            height: '38px', padding: '0 24px',
                            background: payingId === booking._id ? '#ccc' : '#7c3aed',
                            color: 'white', border: 'none', borderRadius: '6px',
                            fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                            fontFamily: 'var(--font-sans)', transition: 'background 0.15s',
                          }}
                        >
                          {payingId === booking._id ? 'Opening…' : `Pay ₹${booking.totalAmount}`}
                        </button>
                      )}

                      {/* Cancel button */}
                      {['pending', 'payment_pending', 'confirmed'].includes(booking.status) && (
                        <button
                          className={styles.cancelBtn}
                          onClick={() => handleCancelClick(booking._id)}
                          disabled={cancellingId === booking._id}
                        >
                          {cancellingId === booking._id ? 'Cancelling…' : 'Cancel'}
                        </button>
                      )}

                      {booking.status === 'completed' && (
                        <button className={styles.completeBtn} disabled>✓ Completed</button>
                      )}
                      {['cancelled', 'payment_expired'].includes(booking.status) && (
                        <button className={styles.cancelledBtn} disabled>
                          {booking.status === 'payment_expired' ? '⏰ Slot Expired' : '✗ Cancelled'}
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
