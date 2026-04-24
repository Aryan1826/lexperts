// client/src/pages/ExpertProfile.jsx

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'
import ErrorBoundary from '../components/ErrorBoundary'
import { ProfileFormSkeleton } from '../components/LoadingSkeleton'
import { createProfile, getMyProfile, updateProfile, uploadSanad } from '../services/expert.service'
import { SERVER_URL } from '../config'
import styles from './ExpertProfile.module.css'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const LEGAL_SPECIALIZATIONS = [
  'Civil Law',
  'Criminal Law',
  'Corporate Law',
  'Family Law',
  'Property Law',
  'Labor Law',
  'Intellectual Property',
  'Environmental Law',
  'Tax Law',
  'Constitutional Law',
]

export default function ExpertProfile() {
  const [form, setForm] = useState({
    specialization: [],
    experience: '',
    consultationFee: '',
    bio: '',
  })
  const [availability, setAvailability] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchingProfile, setFetchingProfile] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [profileId, setProfileId] = useState(null)
  // Sanad upload state
  const [sanadFile, setSanadFile] = useState(null)
  const [sanadUploading, setSanadUploading] = useState(false)
  const [sanadCurrent, setSanadCurrent] = useState(null)
  const [verificationStatus, setVerificationStatus] = useState('pending')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setFetchingProfile(true)
    try {
      const data = await getMyProfile()
      if (data) {
        setProfileId(data._id)
        setForm({
          specialization: data.specialization || [],
          experience: data.experience.toString() || '',
          consultationFee: data.consultationFee.toString() || '',
          bio: data.bio || '',
        })
        setAvailability(data.availability || [])
        setSanadCurrent(data.sanadDocument || null)
        setVerificationStatus(data.verificationStatus || 'pending')
        setIsEditing(true)
      }
    } catch {
      // Profile doesn't exist yet (new expert), which is fine
      setIsEditing(false)
    } finally {
      setFetchingProfile(false)
    }
  }

  const handleSpecializationToggle = (spec) => {
    setForm((prev) => ({
      ...prev,
      specialization: prev.specialization.includes(spec)
        ? prev.specialization.filter((s) => s !== spec)
        : [...prev.specialization, spec],
    }))
  }

  // ─── Availability handlers ────────────────────────────────────────────────
  const toggleDay = (day) => {
    setAvailability((prev) => {
      const exists = prev.find((a) => a.day === day)
      if (exists) return prev.filter((a) => a.day !== day)
      return [...prev, { day, slots: [{ start: '09:00', end: '17:00' }] }]
    })
  }

  const updateSlot = (day, slotIdx, field, value) => {
    setAvailability((prev) =>
      prev.map((a) => {
        if (a.day !== day) return a
        const newSlots = a.slots.map((s, i) => (i === slotIdx ? { ...s, [field]: value } : s))
        return { ...a, slots: newSlots }
      })
    )
  }

  const addSlot = (day) => {
    setAvailability((prev) =>
      prev.map((a) => {
        if (a.day !== day) return a
        return { ...a, slots: [...a.slots, { start: '09:00', end: '17:00' }] }
      })
    )
  }

  const removeSlot = (day, slotIdx) => {
    setAvailability((prev) =>
      prev.map((a) => {
        if (a.day !== day) return a
        const newSlots = a.slots.filter((_, i) => i !== slotIdx)
        return { ...a, slots: newSlots }
      })
    )
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation — shown inline near the form
    if (form.specialization.length === 0) {
      setError('Please select at least one specialization')
      return
    }
    if (!form.experience || parseInt(form.experience) < 0 || parseInt(form.experience) > 70) {
      setError('Experience must be between 0 and 70 years')
      return
    }
    if (!form.consultationFee || parseFloat(form.consultationFee) < 0) {
      setError('Consultation fee must be a valid amount')
      return
    }
    if (!form.bio || form.bio.trim().length < 20 || form.bio.trim().length > 1000) {
      setError('Bio must be between 20 and 1000 characters')
      return
    }

    // Validate availability slots
    for (const avail of availability) {
      for (const slot of avail.slots) {
        if (!slot.start || !slot.end) {
          setError(`Please fill in all time slots for ${avail.day}`)
          return
        }
        if (slot.start >= slot.end) {
          setError(`On ${avail.day}: start time must be before end time`)
          return
        }
      }
      if (avail.slots.length === 0) {
        setError(`${avail.day} is checked but has no time slots. Add at least one slot or uncheck the day.`)
        return
      }
    }

    setLoading(true)
    try {
      const data = {
        specialization: form.specialization,
        experience: parseInt(form.experience),
        consultationFee: parseFloat(form.consultationFee),
        bio: form.bio.trim(),
        availability,
      }

      if (isEditing && profileId) {
        await updateProfile(profileId, data)
        toast.success('Profile updated successfully!')
      } else {
        await createProfile(data)
        toast.success('Profile created! You can now start accepting bookings.')
        setIsEditing(true)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (fetchingProfile) {
    return (
      <ErrorBoundary>
        <div className={styles.page}>
          <Navbar />
          <div className="container" style={{ marginTop: '40px' }}>
            <ProfileFormSkeleton />
          </div>
        </div>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <div className={styles.page}>
        <Navbar />
        <main>
          <div className={styles.pageHead}>
            <div className="container">
              <h1 className={styles.pageTitle}>
                {isEditing ? 'Edit Your Profile' : 'Create Your Expert Profile'}
              </h1>
              <p className={styles.pageSub}>
                {isEditing
                  ? 'Update your professional information and expertise.'
                  : 'Tell clients about your expertise and availability. This information will help you attract clients.'}
              </p>
            </div>
          </div>

          <div className="container">
            <div className={styles.formContainer}>
              {/* Inline validation error */}
              {error && (
                <div className={styles.errorBox}>
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className={styles.form}>
                {/* Specialization */}
                <fieldset className={styles.section}>
                  <legend className={styles.sectionLabel}>
                    Areas of Specialization <span className={styles.required}>*</span>
                  </legend>
                  <p className={styles.sectionInfo}>Select at least one area you specialize in</p>
                  <div className={styles.checkboxGrid}>
                    {LEGAL_SPECIALIZATIONS.map((spec) => (
                      <label key={spec} className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={form.specialization.includes(spec)}
                          onChange={() => handleSpecializationToggle(spec)}
                          className={styles.checkbox}
                        />
                        <span>{spec}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {/* Experience */}
                <div className={styles.formGroup}>
                  <label htmlFor="experience" className={styles.label}>
                    Years of Experience <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="number"
                    id="experience"
                    name="experience"
                    value={form.experience}
                    onChange={handleChange}
                    min="0"
                    max="70"
                    placeholder="e.g., 10"
                    className={styles.input}
                    required
                  />
                  <small className={styles.hint}>Enter a number between 0 and 70</small>
                </div>

                {/* Consultation Fee */}
                <div className={styles.formGroup}>
                  <label htmlFor="consultationFee" className={styles.label}>
                    Fee per 30-minute slot (₹) <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="number"
                    id="consultationFee"
                    name="consultationFee"
                    value={form.consultationFee}
                    onChange={handleChange}
                    min="0"
                    step="100"
                    placeholder="e.g., 500"
                    className={styles.input}
                    required
                  />
                  <small className={styles.hint}>
                    This is your fee per 30-minute unit. Clients booking 1 hour will pay ₹{(parseFloat(form.consultationFee) || 0) * 2}.
                  </small>
                </div>

                {/* Bio */}
                <div className={styles.formGroup}>
                  <label htmlFor="bio" className={styles.label}>
                    Professional Bio <span className={styles.required}>*</span>
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={form.bio}
                    onChange={handleChange}
                    minLength="20"
                    maxLength="1000"
                    placeholder="Write a brief bio about your background, expertise, and approach to law..."
                    className={styles.textarea}
                    rows="6"
                    required
                  />
                  <small className={styles.hint}>
                    {form.bio.length}/1000 characters (minimum 20 required)
                  </small>
                </div>

                {/* Availability */}
                <fieldset className={styles.section}>
                  <legend className={styles.sectionLabel}>Weekly Availability</legend>
                  <p className={styles.sectionInfo}>
                    Select the days you're available and set time slots for each day.
                    Leave unchecked to allow bookings at any time.
                  </p>
                  <div className={styles.availabilityGrid}>
                    {DAYS.map((day) => {
                      const dayEntry = availability.find((a) => a.day === day)
                      const isActive = !!dayEntry
                      return (
                        <div key={day} className={`${styles.dayRow} ${isActive ? styles.dayRowActive : ''}`}>
                          <div className={styles.dayHeader}>
                            <label className={styles.dayToggle}>
                              <input
                                type="checkbox"
                                checked={isActive}
                                onChange={() => toggleDay(day)}
                                className={styles.checkbox}
                              />
                              <span className={styles.dayName}>{day}</span>
                            </label>
                            {isActive && (
                              <button
                                type="button"
                                className={styles.addSlotBtn}
                                onClick={() => addSlot(day)}
                              >
                                + Add Slot
                              </button>
                            )}
                          </div>
                          {isActive && (
                            <div className={styles.slotsWrapper}>
                              {dayEntry.slots.map((slot, idx) => (
                                <div key={idx} className={styles.slotRow}>
                                  <input
                                    type="time"
                                    value={slot.start}
                                    onChange={(e) => updateSlot(day, idx, 'start', e.target.value)}
                                    className={styles.timeInput}
                                  />
                                  <span className={styles.slotSep}>–</span>
                                  <input
                                    type="time"
                                    value={slot.end}
                                    onChange={(e) => updateSlot(day, idx, 'end', e.target.value)}
                                    className={styles.timeInput}
                                  />
                                  {dayEntry.slots.length > 1 && (
                                    <button
                                      type="button"
                                      className={styles.removeSlotBtn}
                                      onClick={() => removeSlot(day, idx)}
                                      title="Remove slot"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </fieldset>

                {/* Submit Button */}
                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading ? 'Saving...' : isEditing ? 'Update Profile' : 'Create Profile'}
                </button>
              </form>

              {/* ── Sanad / Credential Upload (only after profile exists) ── */}
              {isEditing && (
                <div style={{
                  marginTop: '32px',
                  background: '#fafafa',
                  border: '1px solid #e0e0e0',
                  borderRadius: '10px',
                  padding: '24px',
                }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', margin: '0 0 6px' }}>
                    Sanad / Enrollment Certificate
                  </h3>
                  <p style={{ color: 'var(--ink-muted)', fontSize: '14px', margin: '0 0 16px', lineHeight: 1.5 }}>
                    Upload your Bar Council enrollment certificate (Sanad). Our admin team will review and verify your profile. Only verified experts are visible to clients.
                  </p>

                  {/* Current verification status */}
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 14px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: 600,
                      background: verificationStatus === 'approved' ? '#e8f5ee' : verificationStatus === 'rejected' ? '#fef2f2' : '#fff8e1',
                      color: verificationStatus === 'approved' ? '#2e7d32' : verificationStatus === 'rejected' ? '#c62828' : '#e65100',
                    }}>
                      {verificationStatus === 'approved' ? '✓ Verified' : verificationStatus === 'rejected' ? '✗ Rejected' : '⏳ Pending Review'}
                    </span>
                    {sanadCurrent && (
                      <a
                        href={`${SERVER_URL}${sanadCurrent}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ marginLeft: '12px', fontSize: '13px', color: 'var(--gold)', textDecoration: 'underline' }}
                      >
                        View uploaded document
                      </a>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      padding: '10px 18px', background: 'white', border: '1.5px solid #d0d0d0',
                      borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
                    }}>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        style={{ display: 'none' }}
                        onChange={(e) => setSanadFile(e.target.files[0] || null)}
                      />
                      📎 {sanadFile ? sanadFile.name : 'Choose file'}
                    </label>

                    <button
                      type="button"
                      disabled={!sanadFile || sanadUploading}
                      onClick={async () => {
                        if (!sanadFile) return
                        setSanadUploading(true)
                        try {
                          const res = await uploadSanad(sanadFile)
                          setSanadCurrent(res.data?.expert?.sanadDocument || sanadCurrent)
                          setVerificationStatus('pending')
                          setSanadFile(null)
                          toast.success('Sanad uploaded! Admin will verify your profile shortly.')
                        } catch (err) {
                          toast.error(err.response?.data?.message || 'Upload failed. Please try again.')
                        } finally {
                          setSanadUploading(false)
                        }
                      }}
                      style={{
                        padding: '10px 20px', background: 'var(--ink)', color: 'white',
                        border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '14px',
                        cursor: sanadFile ? 'pointer' : 'not-allowed', opacity: sanadFile ? 1 : 0.5,
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      {sanadUploading ? 'Uploading…' : 'Upload Sanad'}
                    </button>
                  </div>
                  <p style={{ fontSize: '12px', color: '#aaa', marginTop: '8px' }}>
                    PDF, JPG or PNG · max 5 MB
                  </p>
                </div>
              )}

              {/* Helpful Tips */}
              <div className={styles.tipsBox}>
                <h4>💡 Tips for a Strong Profile</h4>
                <ul>
                  <li>Be specific about your areas of expertise</li>
                  <li>Mention your credentials and achievements</li>
                  <li>Keep your bio professional and concise</li>
                  <li>Set fair consultation fees for your experience level</li>
                  <li>You can edit your profile anytime</li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
