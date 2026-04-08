// src/components/ExpertCard.jsx

import { useState, useEffect } from 'react'
import { getAvailableSlots } from '../services/expert.service'
import { createRazorpayOrder, verifyRazorpayPayment, loadRazorpayScript } from '../services/payment.service'
import styles from './ExpertCard.module.css'

const today = new Date().toISOString().split('T')[0]
const MAX_FILES = 3
const MAX_SIZE_MB = 5

// Duration options: label → number of 30-min slots
const DURATIONS = [
  { label: '30 min', slots: 1 },
  { label: '1 hr',   slots: 2 },
  { label: '1.5 hr', slots: 3 },
  { label: '2 hr',   slots: 4 },
]

const timeToMinutes = (time) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

/**
 * Given the available slots list, a chosen start time, and a duration in 30-min
 * units, return whether ALL required consecutive slots are in the available list.
 */
const isRangeAvailable = (slots, startTime, durationSlots) => {
  const startMin = timeToMinutes(startTime)
  for (let i = 0; i < durationSlots; i++) {
    const chunkStart = minutesToTime(startMin + i * 30)
    const chunkEnd   = minutesToTime(startMin + (i + 1) * 30)
    const found = slots.some((s) => s.start === chunkStart && s.end === chunkEnd)
    if (!found) return false
  }
  return true
}

export default function ExpertCard({ expert }) {
  const user = expert.userId
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'EX'

  const feePerSlot = expert.consultationFee || 0

  // ── UI visibility ──────────────────────────────────────────────────────────
  const [showForm, setShowForm]     = useState(false)

  // ── Slot picker state ──────────────────────────────────────────────────────
  const [date, setDate]                       = useState('')
  const [availableSlots, setAvailableSlots]   = useState([])
  const [loadingSlots, setLoadingSlots]       = useState(false)
  const [slotsError, setSlotsError]           = useState('')
  const [selectedStart, setSelectedStart]     = useState(null)
  const [duration, setDuration]               = useState(1) // in 30-min units

  // ── Case description + docs ────────────────────────────────────────────────
  const [description, setDescription]  = useState('')
  const [files, setFiles]               = useState([])
  const [fileError, setFileError]       = useState('')

  // ── Submission state ───────────────────────────────────────────────────────
  const [submitting, setSubmitting]   = useState(false)
  const [success, setSuccess]         = useState('')
  const [error, setError]             = useState('')

  // ── When date changes, fetch available slots ───────────────────────────────
  useEffect(() => {
    if (!date || !showForm) return
    setSelectedStart(null)
    setAvailableSlots([])
    setSlotsError('')

    const fetch = async () => {
      setLoadingSlots(true)
      try {
        const slots = await getAvailableSlots(expert._id, date)
        setAvailableSlots(slots)
        if (slots.length === 0) setSlotsError('No available slots for this date.')
      } catch {
        setSlotsError('Could not load slots. Please try another date.')
      } finally {
        setLoadingSlots(false)
      }
    }
    fetch()
  }, [date, showForm, expert._id])

  // Reset when form is closed
  const handleToggle = () => {
    setShowForm((prev) => !prev)
    setDate('')
    setAvailableSlots([])
    setSelectedStart(null)
    setDuration(1)
    setDescription('')
    setFiles([])
    setFileError('')
    setSuccess('')
    setError('')
    setSlotsError('')
  }

  // ── File handlers ──────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    setFileError('')
    const selected = Array.from(e.target.files)
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    for (const f of selected) {
      if (!allowed.includes(f.type)) { setFileError('Only PDF, JPG, PNG allowed'); e.target.value = ''; return }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) { setFileError(`Each file must be under ${MAX_SIZE_MB} MB`); e.target.value = ''; return }
    }
    if (selected.length > MAX_FILES) { setFileError(`Maximum ${MAX_FILES} files`); e.target.value = ''; return }
    setFiles(selected)
  }

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx))

  // ── Derived values ─────────────────────────────────────────────────────────
  const endTime = selectedStart ? minutesToTime(timeToMinutes(selectedStart) + duration * 30) : null
  const totalFee = duration * feePerSlot

  // Determine which start slots are valid for the currently chosen duration
  const validStartSlots = availableSlots.filter((s) =>
    isRangeAvailable(availableSlots, s.start, duration)
  )

  // ── Submit — opens Razorpay popup ─────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!date)          { setError('Please select a date.'); return }
    if (!selectedStart) { setError('Please select a time slot.'); return }
    if (!isRangeAvailable(availableSlots, selectedStart, duration)) {
      setError('Selected slot range is no longer available. Please pick another.')
      return
    }

    setSubmitting(true)

    try {
      // ── Step 1: create Razorpay order on backend ────────────────────────────
      const { orderId, amount, currency, keyId } = await createRazorpayOrder({
        expertId: expert._id,
        date,
        slot: { start: selectedStart, end: endTime },
        duration,
      })

      // ── Step 2: load Razorpay checkout.js if not already loaded ────────────
      await loadRazorpayScript()

      // ── Step 3: open Razorpay popup ─────────────────────────────────────────
      const rzp = new window.Razorpay({
        key:         keyId,
        amount:      amount * 100,   // paise
        currency,
        name:        'LExperts',
        description: `Consultation with ${user?.name || 'Expert'} · ${DURATIONS.find(d => d.slots === duration)?.label}`,
        order_id:    orderId,
        theme:       { color: '#b8922a' },

        // ── Step 4: on successful payment, verify on backend ─────────────────
        handler: async (response) => {
          try {
            await verifyRazorpayPayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              expertId:      expert._id,
              date,
              slot:          { start: selectedStart, end: endTime },
              duration,
              caseDescription: description,
            })
            setSuccess('✓ Payment successful! Your booking request has been sent to the expert.')
            // Reset form state
            setDate('')
            setSelectedStart(null)
            setDuration(1)
            setAvailableSlots([])
            setDescription('')
            setFiles([])
            setTimeout(() => { setShowForm(false); setSuccess('') }, 3000)
          } catch (verifyErr) {
            setError(verifyErr.response?.data?.message || 'Payment verification failed. Contact support.')
          } finally {
            setSubmitting(false)
          }
        },

        modal: {
          // User closed the popup without paying
          ondismiss: () => {
            setError('Payment was cancelled. Your slot is still available.')
            setSubmitting(false)
          },
        },
      })

      rzp.open()

    } catch (err) {
      setError(err.response?.data?.message || 'Could not initiate payment. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className={`${styles.card} ${showForm ? styles.cardExpanded : ''}`}>
      <div className={styles.cardMain}>
        <div className={styles.avatar}>{initials}</div>

        <div className={styles.body}>
          <div className={styles.header}>
            <h3 className={styles.name}>{user?.name || 'Expert'}</h3>
            {expert.isVerified && <span className={styles.badge}>Verified</span>}
          </div>
          <p className={styles.specs}>{expert.specialization?.join(' · ')}</p>
          <p className={styles.bio}>{expert.bio}</p>

          <div className={styles.footer}>
            <div className={styles.meta}>
              <span className={styles.metaItem}>
                <span className={styles.metaLabel}>Exp</span>
                {expert.experience} yrs
              </span>
              <span className={styles.metaDivider} />
              <span className={styles.metaItem}>
                <span className={styles.metaLabel}>Rating</span>
                {expert.rating > 0 ? `${expert.rating.toFixed(1)} ★` : 'New'}
              </span>
              <span className={styles.metaDivider} />
              <span className={styles.metaItem}>
                <span className={styles.metaLabel}>Fee</span>
                ₹{feePerSlot}/30min
              </span>
            </div>

            <button
              className={`${styles.bookBtn} ${showForm ? styles.bookBtnActive : ''}`}
              onClick={handleToggle}
            >
              {showForm ? 'Cancel' : 'Book Now'}
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className={styles.formPanel}>
          <div className={styles.formDivider} />
          <h4 className={styles.formTitle}>
            Book a consultation with <span>{user?.name}</span>
          </h4>

          {success && <div className={styles.successMsg}>✓ {success}</div>}
          {error   && <div className={styles.errorMsg}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>

            {/* ── Step 1: Date ─────────────────────────────────────────── */}
            <div className={styles.field}>
              <label className={styles.label}>Select Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => { setDate(e.target.value); setSelectedStart(null) }}
                className={styles.input}
                min={today}
                required
              />
            </div>

            {/* ── Step 2: Duration ─────────────────────────────────────── */}
            {date && (
              <div className={styles.field}>
                <label className={styles.label}>Duration</label>
                <div className={styles.durationRow}>
                  {DURATIONS.map(({ label, slots }) => (
                    <button
                      key={slots}
                      type="button"
                      className={`${styles.durationBtn} ${duration === slots ? styles.durationBtnActive : ''}`}
                      onClick={() => { setDuration(slots); setSelectedStart(null) }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 3: Available slots grid ─────────────────────────── */}
            {date && (
              <div className={styles.field}>
                <label className={styles.label}>
                  Available Slots
                  {selectedStart && endTime && (
                    <span className={styles.selectedRange}> — {selectedStart} to {endTime}</span>
                  )}
                </label>

                {loadingSlots && (
                  <p className={styles.slotsLoading}>Loading available slots…</p>
                )}

                {slotsError && !loadingSlots && (
                  <p className={styles.slotsError}>{slotsError}</p>
                )}

                {!loadingSlots && availableSlots.length > 0 && (
                  <div className={styles.slotsGrid}>
                    {availableSlots.map((slot) => {
                      const isValid    = validStartSlots.some((s) => s.start === slot.start)
                      const isSelected = selectedStart === slot.start
                      // Highlight slots that are part of the selected range
                      const inRange    = selectedStart && endTime
                        ? timeToMinutes(slot.start) >= timeToMinutes(selectedStart) &&
                          timeToMinutes(slot.end)   <= timeToMinutes(endTime)
                        : false

                      return (
                        <button
                          key={slot.start}
                          type="button"
                          disabled={!isValid}
                          onClick={() => setSelectedStart(isSelected ? null : slot.start)}
                          className={`
                            ${styles.slotBtn}
                            ${isSelected  ? styles.slotBtnSelected : ''}
                            ${inRange && !isSelected ? styles.slotBtnInRange : ''}
                            ${!isValid    ? styles.slotBtnBooked   : ''}
                          `}
                        >
                          {slot.start}
                        </button>
                      )
                    })}
                  </div>
                )}

                {!loadingSlots && !slotsError && availableSlots.length === 0 && date && (
                  <p className={styles.slotsError}>
                    No availability set for this date. Try a different date.
                  </p>
                )}
              </div>
            )}

            {/* ── Fee summary ───────────────────────────────────────────── */}
            {selectedStart && endTime && (
              <div className={styles.feeSummary}>
                <span>🕐 {selectedStart} – {endTime} ({DURATIONS.find(d => d.slots === duration)?.label})</span>
                <span className={styles.feeAmount}>₹{totalFee}</span>
              </div>
            )}

            {/* ── Case Description ──────────────────────────────────────── */}
            <div className={styles.field}>
              <label className={styles.label}>
                Case Description <span className={styles.optional}>(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe your legal issue so the expert can prepare…"
                className={styles.textarea}
                maxLength={2000}
                rows={3}
              />
              <span className={styles.charCount}>{description.length}/2000</span>
            </div>

            {/* ── Document Upload ───────────────────────────────────────── */}
            <div className={styles.field}>
              <label className={styles.label}>
                Attach Documents <span className={styles.optional}>(optional — max {MAX_FILES} files, {MAX_SIZE_MB}MB each)</span>
              </label>
              <label className={styles.fileLabel}>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  onChange={handleFileChange}
                  className={styles.fileInput}
                />
                <span className={styles.fileBtn}>📎 Choose files</span>
                <span className={styles.fileHint}>PDF, JPG, PNG accepted</span>
              </label>
              {fileError && <p className={styles.fileError}>{fileError}</p>}
              {files.length > 0 && (
                <ul className={styles.fileList}>
                  {files.map((f, i) => (
                    <li key={i} className={styles.fileItem}>
                      <span className={styles.fileName}>
                        {f.type === 'application/pdf' ? '📄' : '🖼️'} {f.name}
                        <span className={styles.fileSize}> ({(f.size / 1024).toFixed(0)} KB)</span>
                      </span>
                      <button type="button" className={styles.fileRemove} onClick={() => removeFile(i)}>✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ── Submit ───────────────────────────────────────────────── */}
            <div className={styles.formActions}>
              <p className={styles.feeNote}>
                {selectedStart && endTime
                  ? <>Total: <strong>₹{totalFee}</strong> for {DURATIONS.find(d => d.slots === duration)?.label}</>
                  : <>Fee: <strong>₹{feePerSlot}</strong> per 30 min</>
                }
              </p>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={submitting || !selectedStart}
              >
                {submitting ? 'Opening payment…' : `Pay ₹${totalFee} & Book`}
              </button>
            </div>

          </form>
        </div>
      )}
    </div>
  )
}
