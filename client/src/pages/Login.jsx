// src/pages/Login.jsx

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../services/auth.service'
import styles from './Auth.module.css'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
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
          <h1 className={styles.tagline}>Expert advice,<br />when you need it.</h1>
          <p className={styles.sub}>Connect with verified lawyers, doctors and consultants — on your schedule.</p>
          <div className={styles.trustRow}>
            <span className={styles.trustItem}>✦ Verified Experts</span>
            <span className={styles.trustItem}>✦ Secure Consultations</span>
            <span className={styles.trustItem}>✦ Transparent Fees</span>
          </div>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.card}>
          <h2 className={styles.formTitle}>Welcome back</h2>
          <p className={styles.formSub}>Sign in to your account</p>

          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Email address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className={styles.input}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className={styles.input}
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className={styles.switchText}>
            Don't have an account?{' '}
            <Link to="/register" className={styles.switchLink}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}