// src/components/ExpertCard.jsx

import { useState } from 'react'
import { createBooking } from '../services/booking.service'
import styles from './ExpertCard.module.css'

const today = new Date().toISOString().split('T')[0]

const INITIAL_FORM = { date: '', start: '', end: '' }
const MAX_FILES = 3
const MAX_SIZE_MB = 5

export default function ExpertCard({ expert }) {
  const user = expert.userId
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'EX'

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState([])
  const [fileError, setFileError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const handleToggle = () => {
    setShowForm((prev) => !prev)
    setForm(INITIAL_FORM)
    setDescription('')
    setFiles([])
    setFileError('')
    setSuccess('')
    setError('')
  }

  const handleFileChange = (e) => {
    setFileError('')
    const selected = Array.from(e.target.files)
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']

    for (const f of selected) {
      if (!allowed.includes(f.type)) {
        setFileError('Only PDF, JPG, and PNG files are allowed')
        e.target.value = ''
        return
      }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        setFileError(`Each file must be under ${MAX_SIZE_MB} MB`)
        e.target.value = ''
        return
      }
    }
    if (selected.length > MAX_FILES) {
      setFileError(`Maximum ${MAX_FILES} files allowed`)
      e.target.value = ''
      return
    }
    setFiles(selected)
  }

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
    setSuccess('')
  }
  

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.date || !form.start || !form.end) {
      setError('Please fill in all fields: date, start time, and end time.')
      return
    }
    if (form.end <= form.start) {
      setError('End time must be after start time.')
      return
    }

    setSubmitting(true)
    try {
      await createBooking(
        { expertId: expert._id, date: form.date, slot: { start: form.start, end: form.end } },
        files,
        description
      )
      setSuccess('Booking request sent successfully!')
      setForm(INITIAL_FORM)
      setTimeout(() => {
        setShowForm(false)
        setSuccess('')
      }, 2500)
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed. Please try again.')
    } finally {
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
                ₹{expert.consultationFee}
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
          {error && <div className={styles.errorMsg}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Date</label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  className={styles.input}
                  min={today}
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Start Time</label>
                <input
                  type="time"
                  name="start"
                  value={form.start}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>End Time</label>
                <input
                  type="time"
                  name="end"
                  value={form.end}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
              </div>
            </div>

            {/* Case Description */}
            <div className={styles.field}>
              <label className={styles.label}>Case Description <span className={styles.optional}>(optional)</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe your legal issue so the expert can prepare..."
                className={styles.textarea}
                maxLength={2000}
                rows={3}
              />
              <span className={styles.charCount}>{description.length}/2000</span>
            </div>

            {/* Document Upload */}
            <div className={styles.field}>
              <label className={styles.label}>Attach Documents <span className={styles.optional}>(optional — max {MAX_FILES} files, {MAX_SIZE_MB}MB each)</span></label>
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

            <div className={styles.formActions}>
              <p className={styles.feeNote}>
                Consultation fee: <strong>₹{expert.consultationFee}</strong>
              </p>
              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}