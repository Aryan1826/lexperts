// client/src/pages/ForgotPassword.jsx

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../services/auth.service'
import styles from './Auth.module.css'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.')
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
          <h1 className={styles.tagline}>Forgot your<br />password?</h1>
          <p className={styles.sub}>
            No worries — enter your email and we'll send you a secure reset link within seconds.
          </p>
          <div className={styles.trustRow}>
            <span className={styles.trustItem}>✦ Secure Reset Link</span>
            <span className={styles.trustItem}>✦ Expires in 10 min</span>
            <span className={styles.trustItem}>✦ One-time use</span>
          </div>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.card}>

          {sent ? (
            /* ── Success State ── */
            <div className={styles.successState}>
              <div className={styles.successIcon}>📬</div>
              <h2 className={styles.formTitle}>Check your inbox</h2>
              <p className={styles.formSub}>
                If <strong>{email}</strong> is registered with LExperts, a password reset link has been sent. Check your inbox (and spam folder).
              </p>
              <p className={styles.successNote}>
                The link expires in <strong>10 minutes</strong>. Didn't receive it?{' '}
                <button
                  className={styles.resendBtn}
                  onClick={() => { setSent(false); setEmail('') }}
                >
                  Try again
                </button>
              </p>
              <Link to="/login" className={styles.btn} style={{ marginTop: '24px', display: 'block', textAlign: 'center' }}>
                Back to Sign In
              </Link>
            </div>
          ) : (
            /* ── Form State ── */
            <>
              <h2 className={styles.formTitle}>Reset password</h2>
              <p className={styles.formSub}>Enter your account email and we'll send you a reset link.</p>

              {error && <div className={styles.error}>{error}</div>}

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.label}>Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.input}
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>
                <button type="submit" className={styles.btn} disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <p className={styles.switchText}>
                Remember your password?{' '}
                <Link to="/login" className={styles.switchLink}>Sign in</Link>
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
