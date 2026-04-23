// client/src/pages/ExpertDashboard.jsx

import { useState, useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'
import ErrorBoundary from '../components/ErrorBoundary'
import { BookingsPageSkeleton } from '../components/LoadingSkeleton'
import { getExpertBookings, confirmBooking, cancelBooking, addExpertNote } from '../services/booking.service'
import { SERVER_URL } from '../config'
import styles from './ExpertDashboard.module.css'

const STATUS_COLORS = {
  pending:         '#FF9800',
  payment_pending: '#9C27B0',
  confirmed:       '#4CAF50',
  completed:       '#2196F3',
  cancelled:       '#F44336',
  payment_expired: '#9E9E9E',
}

const STATUS_LABELS = {
  pending:         'Awaiting Your Confirmation',
  payment_pending: 'Awaiting Client Payment',
  confirmed:       'Confirmed',
  completed:       'Completed',
  cancelled:       'Cancelled',
  payment_expired: 'Payment Expired',
}

function getMeetStatus(booking) {
  if (!booking.meetLink || booking.status !== 'confirmed') return null
  const slotStart = new Date(`${booking.date}T${booking.slot.start}:00`)
  const slotEnd   = new Date(`${booking.date}T${booking.slot.end}:00`)
  const now = new Date()
  if (now < slotStart) return { state: 'upcoming', label: `Opens at ${booking.slot.start}` }
  if (now > slotEnd)   return { state: 'ended',    label: 'Meeting ended' }
  return { state: 'active', label: 'Join Meeting' }
}

export default function ExpertDashboard() {
  const [bookings, setBookings]             = useState([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState('')
  const [filter, setFilter]                 = useState('all')
  const [actioningId, setActioningId]       = useState(null)
  const [actionType, setActionType]         = useState(null)
  const [lastUpdated, setLastUpdated]       = useState(null)
  const [refreshLabel, setRefreshLabel]     = useState('')
  const pollRef                             = useRef(null)

  // Per-booking note drafts  { [bookingId]: string }
  const [noteDrafts, setNoteDrafts]         = useState({})
  const [savingNoteId, setSavingNoteId]     = useState(null)

  // Decline modal state (includes optional referral message)
  const [declineModal, setDeclineModal]     = useState({
    isOpen: false,
    bookingId: null,
    referralMessage: '',
  })

  // ── Fetch bookings ────────────────────────────────────────────
  const fetchBookings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    if (!silent) setError('')
    try {
      const data = await getExpertBookings()
      const list = data.bookings || []
      setBookings(list)
      setLastUpdated(new Date())
      // Pre-fill note drafts with any existing expertNotes
      setNoteDrafts((prev) => {
        const next = { ...prev }
        list.forEach((b) => {
          if (!(b._id in next)) {
            next[b._id] = b.expertNotes || ''
          }
        })
        return next
      })
    } catch (err) {
      if (!silent) setError(err.response?.data?.message || 'Failed to load bookings.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // Initial load + poll every 30 s
  useEffect(() => {
    fetchBookings(false)
    pollRef.current = setInterval(() => fetchBookings(true), 30000)
    return () => clearInterval(pollRef.current)
  }, [fetchBookings])

  // "Updated X ago" label
  useEffect(() => {
    if (!lastUpdated) return
    const updateLabel = () => {
      const seconds = Math.floor((new Date() - lastUpdated) / 1000)
      if (seconds < 10)      setRefreshLabel('Updated just now')
      else if (seconds < 60) setRefreshLabel(`Updated ${seconds}s ago`)
      else                   setRefreshLabel(`Updated ${Math.floor(seconds / 60)}m ago`)
    }
    updateLabel()
    const t = setInterval(updateLabel, 15000)
    return () => clearInterval(t)
  }, [lastUpdated])

  // ── Confirm booking (with optional note) ─────────────────────
  const handleConfirmBooking = async (bookingId) => {
    setActioningId(bookingId)
    setActionType('confirm')
    try {
      const notes = noteDrafts[bookingId] || ''
      await confirmBooking(bookingId, notes)
      setBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId
            ? { ...b, status: 'confirmed', expertNotes: notes || b.expertNotes }
            : b
        )
      )
      toast.success('Booking confirmed! The client has been notified.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm booking.')
    } finally {
      setActioningId(null)
      setActionType(null)
    }
  }

  // ── Save note only (no status change) ────────────────────────
  const handleSaveNote = async (bookingId) => {
    setSavingNoteId(bookingId)
    try {
      const notes = noteDrafts[bookingId] || ''
      await addExpertNote(bookingId, notes)
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, expertNotes: notes } : b))
      )
      toast.success('Response saved and visible to client.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save note.')
    } finally {
      setSavingNoteId(null)
    }
  }

  // ── Open decline modal ────────────────────────────────────────
  // Pre-fill the referral textarea with whatever the expert already typed in the card
  // so they don't have to type it twice
  const handleDeclineClick = (bookingId) => {
    setDeclineModal({
      isOpen: true,
      bookingId,
      referralMessage: noteDrafts[bookingId] || '',
    })
  }

  // ── Confirm decline ───────────────────────────────────────────
  const handleDeclineConfirm = async () => {
    const { bookingId, referralMessage } = declineModal
    setDeclineModal({ isOpen: false, bookingId: null, referralMessage: '' })

    setActioningId(bookingId)
    setActionType('cancel')
    try {
      await cancelBooking(bookingId, '', referralMessage)
      setBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId
            ? { ...b, status: 'cancelled', referralMessage }
            : b
        )
      )
      toast.success('Booking declined. The client has been notified.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline booking.')
    } finally {
      setActioningId(null)
      setActionType(null)
    }
  }

  const handleDeclineDismiss = () => {
    setDeclineModal({ isOpen: false, bookingId: null, referralMessage: '' })
  }

  // ── Derived counts ────────────────────────────────────────────
  const filteredBookings   = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter)
  const pendingBookings    = bookings.filter((b) => b.status === 'pending')
  const confirmedBookings  = bookings.filter((b) => b.status === 'confirmed')
  const completedBookings  = bookings.filter((b) => b.status === 'completed')
  const cancelledBookings  = bookings.filter((b) => b.status === 'cancelled')

  return (
    <ErrorBoundary>
      {/* ── Inline Decline Modal ─────────────────────────────── */}
      {declineModal.isOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px',
          }}
          onClick={handleDeclineDismiss}
        >
          <div
            style={{
              background: 'white', borderRadius: '12px', padding: '32px',
              maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: 'var(--font-serif)', margin: '0 0 8px', fontSize: '20px' }}>
              Decline Booking
            </h3>
            <p style={{ color: 'var(--ink-muted)', margin: '0 0 16px', fontSize: '15px', lineHeight: 1.5 }}>
              Are you sure you want to decline this booking? The client will be notified.
            </p>

            <label style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
              Message to Client — Reason / Referral (optional)
            </label>
            <p style={{ fontSize: '13px', color: 'var(--ink-muted)', margin: '4px 0 8px', lineHeight: 1.4 }}>
              This message will be shown to the client. You can explain why you're declining or recommend another lawyer.
            </p>
            <textarea
              className={styles.modalTextarea}
              placeholder={`E.g. "This case falls under Criminal Law. I specialise in Civil Law — I recommend contacting Advocate Sharma for this matter."`}
              value={declineModal.referralMessage}
              onChange={(e) =>
                setDeclineModal((prev) => ({ ...prev, referralMessage: e.target.value }))
              }
              maxLength={1000}
            />
            <p style={{ fontSize: '12px', color: '#aaa', margin: '4px 0 20px', textAlign: 'right' }}>
              {declineModal.referralMessage.length}/1000
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleDeclineConfirm}
                style={{
                  flex: 1, padding: '12px', background: 'var(--danger)', color: 'white',
                  border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '14px',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Yes, Decline
              </button>
              <button
                onClick={handleDeclineDismiss}
                style={{
                  flex: 1, padding: '12px', background: '#f0f0f0', color: 'var(--ink)',
                  border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '14px',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Keep It
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.page}>
        <Navbar />
        <main>
          <div className={styles.pageHead}>
            <div className="container">
              <h1 className={styles.pageTitle}>Expert Dashboard</h1>
              <p className={styles.pageSub}>
                Manage booking requests from clients and respond to their cases.
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

                    {/* ── Header ── */}
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

                    {/* ── Booking Details ── */}
                    <div className={styles.cardBody}>
                      <div className={styles.bookingDetail}>
                        <span className={styles.label}>📅 Date</span>
                        <span className={styles.value}>
                          {booking.date
                            ? new Date(booking.date).toLocaleDateString('en-US', {
                                weekday: 'short', year: 'numeric',
                                month: 'short', day: 'numeric',
                              })
                            : 'N/A'}
                        </span>
                      </div>

                      <div className={styles.bookingDetail}>
                        <span className={styles.label}>⏰ Time</span>
                        <span className={styles.value}>
                          {booking.slot?.start ? `${booking.slot.start} – ${booking.slot.end}` : 'N/A'}
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

                      {booking.caseDescription && (
                        <div className={styles.bookingDetail} style={{ gridColumn: '1 / -1' }}>
                          <span className={styles.label}>📋 Case Description</span>
                          <span className={styles.value}>{booking.caseDescription}</span>
                        </div>
                      )}

                      {booking.documents?.length > 0 && (
                        <div className={styles.bookingDetail} style={{ gridColumn: '1 / -1', alignItems: 'flex-start' }}>
                          <span className={styles.label}>📎 Client Documents</span>
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

                    {/* ── Expert Response Section ────────────────────────── */}
                    {(booking.status === 'pending' || booking.status === 'confirmed') && (
                      <div className={styles.expertResponseSection}>
                        <p className={styles.expertResponseLabel}>
                          💬 Your Message to Client
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--ink-muted)', margin: '0 0 8px', lineHeight: 1.4 }}>
                          {booking.status === 'pending'
                            ? 'This will be sent to the client when you confirm. If you decline, this text will be used as your referral/reason message.'
                            : 'Update your message to the client — changes appear in their My Bookings page.'}
                        </p>
                        <textarea
                          className={styles.expertResponseTextarea}
                          placeholder={
                            booking.status === 'pending'
                              ? 'E.g. "I\'ve reviewed your case and I can help. Please bring your original documents to the session." — OR if declining: "This is a Criminal Law matter. I specialise in Civil Law — I recommend contacting Advocate Sharma."'
                              : 'Update your response to the client…'
                          }
                          value={noteDrafts[booking._id] ?? booking.expertNotes ?? ''}
                          onChange={(e) =>
                            setNoteDrafts((prev) => ({ ...prev, [booking._id]: e.target.value }))
                          }
                          maxLength={2000}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                          <span style={{ fontSize: '12px', color: '#aaa' }}>
                            {(noteDrafts[booking._id] ?? booking.expertNotes ?? '').length}/2000
                          </span>
                          {/* Save button only for confirmed (pending saves on confirm/decline click) */}
                          {booking.status === 'confirmed' && (
                            <div className={styles.saveNoteRow}>
                              <button
                                className={styles.saveNoteBtn}
                                onClick={() => handleSaveNote(booking._id)}
                                disabled={savingNoteId === booking._id}
                              >
                                {savingNoteId === booking._id ? 'Saving…' : 'Save Response'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Referral message (shown on cancelled bookings if expert left one) */}
                    {booking.status === 'cancelled' && booking.referralMessage && (
                      <div className={styles.referralBox}>
                        <p className={styles.referralTitle}>🔀 Your Referral / Reason Sent to Client</p>
                        <div className={styles.referralBubble}>{booking.referralMessage}</div>
                      </div>
                    )}

                    {/* Expert notes (read-only on completed/cancelled) */}
                    {(booking.status === 'completed' || booking.status === 'cancelled') && booking.expertNotes && (
                      <div className={styles.expertResponseDisplay}>
                        <p className={styles.referralTitle}>💬 Your Response (Sent to Client)</p>
                        <div className={styles.expertResponseBubble}>{booking.expertNotes}</div>
                      </div>
                    )}

                    {/* ── Footer Actions ── */}
                    <div className={styles.cardFooter}>
                      {/* Join Meeting — time-locked */}
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

                      {booking.status === 'pending' && (
                        <>
                          <button
                            className={styles.confirmBtn}
                            onClick={() => handleConfirmBooking(booking._id)}
                            disabled={actioningId === booking._id}
                          >
                            {actioningId === booking._id && actionType === 'confirm'
                              ? 'Confirming…'
                              : '✓ Confirm Booking'}
                          </button>
                          <button
                            className={styles.cancelBtn}
                            onClick={() => handleDeclineClick(booking._id)}
                            disabled={actioningId === booking._id}
                          >
                            ✗ Decline
                          </button>
                        </>
                      )}
                      {booking.status === 'confirmed' && (
                        <button
                          className={styles.cancelBtn}
                          onClick={() => handleDeclineClick(booking._id)}
                          disabled={actioningId === booking._id}
                        >
                          {actioningId === booking._id ? 'Cancelling…' : 'Cancel Booking'}
                        </button>
                      )}
                      {booking.status === 'completed' && (
                        <button className={styles.completeBtn} disabled>
                          ✓ Completed
                        </button>
                      )}
                      {booking.status === 'cancelled' && (
                        <button className={styles.cancelledBtn} disabled>
                          ✗ Declined / Cancelled
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
