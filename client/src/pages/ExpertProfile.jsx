// client/src/pages/ExpertProfile.jsx

import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import ErrorBoundary from '../components/ErrorBoundary'
import { ProfileFormSkeleton } from '../components/LoadingSkeleton'
import { createProfile, getMyProfile, updateProfile } from '../services/expert.service'
import styles from './ExpertProfile.module.css'

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
  const [loading, setLoading] = useState(false)
  const [fetchingProfile, setFetchingProfile] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [profileId, setProfileId] = useState(null)

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
        setIsEditing(true)
      }
    } catch (err) {
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

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

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

    setLoading(true)
    try {
      const data = {
        specialization: form.specialization,
        experience: parseInt(form.experience),
        consultationFee: parseFloat(form.consultationFee),
        bio: form.bio.trim(),
      }

      if (isEditing && profileId) {
        await updateProfile(profileId, data)
        setSuccess('Profile updated successfully!')
      } else {
        await createProfile(data)
        setSuccess('Profile created successfully! You can now start accepting bookings.')
        setIsEditing(true)
      }

      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (fetchingProfile) {
    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.loadingContainer}>
          <Spinner />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Navbar />
      <main>
        <div className={styles.pageHead}>
          <div className="container">
            <h1 className={styles.pageTitle}>{isEditing ? 'Edit Your Profile' : 'Create Your Expert Profile'}</h1>
            <p className={styles.pageSub}>
              {isEditing
                ? 'Update your professional information and expertise.'
                : 'Tell clients about your expertise and availability. This information will help you attract clients.'}
            </p>
          </div>
        </div>

        <div className="container">
          <div className={styles.formContainer}>
            {success && (
              <div className={styles.successBox}>
                <p>✓ {success}</p>
              </div>
            )}

            {error && (
              <div className={styles.errorBox}>
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
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

              <div className={styles.formGroup}>
                <label htmlFor="consultationFee" className={styles.label}>
                  Consultation Fee (₹) <span className={styles.required}>*</span>
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
                <small className={styles.hint}>Per consultation fee in Indian Rupees</small>
              </div>

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

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Saving...' : isEditing ? 'Update Profile' : 'Create Profile'}
              </button>
            </form>

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
  )
}
