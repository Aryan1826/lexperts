// src/pages/Register.jsx

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../services/auth.service'
import styles from './Auth.module.css'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'client' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
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
          <h1 className={styles.tagline}>Start your<br />journey today.</h1>
          <p className={styles.sub}>Join thousands of clients and experts building better professional relationships.</p>
          <div className={styles.trustRow}>
            <span className={styles.trustItem}>✦ Free to Join</span>
            <span className={styles.trustItem}>✦ Expert Network</span>
            <span className={styles.trustItem}>✦ Instant Access</span>
          </div>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.card}>
          <h2 className={styles.formTitle}>Create account</h2>
          <p className={styles.formSub}>Join the LExperts platform</p>

          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Full name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className={styles.input}
                placeholder="John Smith"
                required
              />
            </div>
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
                placeholder="Min. 8 characters"
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>I am joining as</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className={styles.input}
              >
                <option value="client">Client — I need consultations</option>
                <option value="expert">Expert — I provide consultations</option>
              </select>
            </div>
            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className={styles.switchText}>
            Already have an account?{' '}
            <Link to="/login" className={styles.switchLink}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}