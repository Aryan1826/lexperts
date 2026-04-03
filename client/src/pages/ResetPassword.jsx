// client/src/pages/ResetPassword.jsx

import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { resetPassword } from '../services/auth.service'
import styles from './Auth.module.css'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [form, setForm] = useState({ password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // If no token in URL, show an error immediately
  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new reset link.')
    }
  }, [token])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await resetPassword({ token, password: form.password })
      setDone(true)
      toast.success('Password reset successfully!')
      // Auto-redirect to login after 3 seconds
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <div className={styles.leftContent}>
          <div className={styles.brandMark}>
            <span className={styles.brandL}>L</span>Experts
          </div>
          <h1 className={styles.tagline}>Create a new<br />password.</h1>
          <p className={styles.sub}>
            Choose a strong password that you haven't used before. Your account will be secured with the new password immediately.
          </p>
          <div className={styles.trustRow}>
            <span className={styles.trustItem}>✦ Minimum 8 characters</span>
            <span className={styles.trustItem}>✦ Instant update</span>
          </div>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.card}>

          {done ? (
            /* ── Success State ── */
            <div className={styles.successState}>
              <div className={styles.successIcon}>✅</div>
              <h2 className={styles.formTitle}>Password updated!</h2>
              <p className={styles.formSub}>
                Your password has been changed successfully. You'll be redirected to the login page in a moment.
              </p>
              <Link to="/login" className={styles.btn} style={{ marginTop: '24px', display: 'block', textAlign: 'center' }}>
                Go to Sign In
              </Link>
            </div>
          ) : (
            /* ── Form State ── */
            <>
              <h2 className={styles.formTitle}>Set new password</h2>
              <p className={styles.formSub}>Enter your new password below.</p>

              {error && <div className={styles.error}>{error}</div>}

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.label}>New password</label>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Minimum 8 characters"
                    required
                    autoFocus
                    disabled={!token}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Confirm new password</label>
                  <input
                    type="password"
                    name="confirm"
                    value={form.confirm}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Repeat your new password"
                    required
                    disabled={!token}
                  />
                </div>
                <button type="submit" className={styles.btn} disabled={loading || !token}>
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>

              <p className={styles.switchText}>
                <Link to="/forgot-password" className={styles.switchLink}>Request a new reset link</Link>
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
