// client/src/pages/AdminPanel.jsx

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  getAdminStats,
  getAdminUsers,
  deactivateUser,
  activateUser,
  getAdminExperts,
  approveExpert,
  rejectExpert,
  getAdminBookings,
} from '../services/admin.service'
import styles from './AdminPanel.module.css'

// ─── Badge helpers ─────────────────────────────────────────────────────────────
const VERIFICATION_COLORS = {
  pending:  '#FF9800',
  approved: '#4CAF50',
  rejected: '#F44336',
}

const STATUS_COLORS = {
  pending:   '#FF9800',
  confirmed: '#4CAF50',
  completed: '#2196F3',
  cancelled: '#F44336',
}

const ROLE_COLORS = {
  client: '#5C6BC0',
  expert: '#00897B',
  admin:  '#E53935',
}

function Badge({ label, color }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '20px',
        background: color + '20',
        color: color,
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'capitalize',
        border: `1px solid ${color}40`,
      }}
    >
      {label}
    </span>
  )
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIcon} style={{ background: color + '18', color }}>
        {icon}
      </div>
      <div>
        <div className={styles.statValue} style={{ color }}>{value ?? '—'}</div>
        <div className={styles.statLabel}>{label}</div>
      </div>
    </div>
  )
}

// ─── Loading Spinner ───────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className={styles.spinnerWrap}>
      <div className={styles.spinner} />
      <p className={styles.spinnerText}>Loading…</p>
    </div>
  )
}

// ─── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ message }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>📭</div>
      <p>{message}</p>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('overview')

  // Data
  const [stats,    setStats]    = useState(null)
  const [users,    setUsers]    = useState([])
  const [experts,  setExperts]  = useState([])
  const [bookings, setBookings] = useState([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // Filters
  const [userSearch,    setUserSearch]    = useState('')
  const [expertFilter,  setExpertFilter]  = useState('all')
  const [expertSearch,  setExpertSearch]  = useState('')
  const [bookingFilter, setBookingFilter] = useState('all')
  const [bookingSearch, setBookingSearch] = useState('')

  // Per-row action loading
  const [actioningUserId,   setActioningUserId]   = useState(null)
  const [actioningExpertId, setActioningExpertId] = useState(null)

  // Reject modal
  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    expertId: null,
    expertName: '',
    reason: '',
  })

  // ── Fetch helpers ────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getAdminStats()
      setStats(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load stats.')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUsers = useCallback(async (search = '') => {
    setLoading(true)
    setError('')
    try {
      const data = await getAdminUsers({ search: search || undefined, limit: 50 })
      setUsers(data.users || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchExperts = useCallback(async (status = 'all', search = '') => {
    setLoading(true)
    setError('')
    try {
      const params = { limit: 50 }
      if (status !== 'all') params.status = status
      if (search) params.search = search
      const data = await getAdminExperts(params)
      setExperts(data.experts || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load experts.')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchBookings = useCallback(async (status = 'all') => {
    setLoading(true)
    setError('')
    try {
      const params = { limit: 50 }
      if (status !== 'all') params.status = status
      const data = await getAdminBookings(params)
      setBookings(data.bookings || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load bookings.')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Tab change triggers fetch ─────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'overview') fetchStats()
    if (activeTab === 'users')    fetchUsers()
    if (activeTab === 'experts')  fetchExperts(expertFilter, expertSearch)
    if (activeTab === 'bookings') fetchBookings(bookingFilter)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // ── User actions ─────────────────────────────────────────────────────────────
  const handleToggleUser = async (userId, currentlyActive) => {
    setActioningUserId(userId)
    try {
      if (currentlyActive) {
        await deactivateUser(userId)
        setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, isActive: false } : u))
        toast.success('User deactivated.')
      } else {
        await activateUser(userId)
        setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, isActive: true } : u))
        toast.success('User activated.')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.')
    } finally {
      setActioningUserId(null)
    }
  }

  // ── Expert actions ────────────────────────────────────────────────────────────
  const handleApproveExpert = async (expertId) => {
    setActioningExpertId(expertId)
    try {
      await approveExpert(expertId)
      setExperts((prev) =>
        prev.map((e) =>
          e._id === expertId
            ? { ...e, verificationStatus: 'approved', isVerified: true }
            : e
        )
      )
      toast.success('Expert approved successfully.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed.')
    } finally {
      setActioningExpertId(null)
    }
  }

  const handleOpenRejectModal = (expertId, expertName) => {
    setRejectModal({ isOpen: true, expertId, expertName, reason: '' })
  }

  const handleRejectConfirm = async () => {
    const { expertId, reason } = rejectModal
    setRejectModal({ isOpen: false, expertId: null, expertName: '', reason: '' })
    setActioningExpertId(expertId)
    try {
      await rejectExpert(expertId, reason)
      setExperts((prev) =>
        prev.map((e) =>
          e._id === expertId
            ? { ...e, verificationStatus: 'rejected', isVerified: false, rejectionReason: reason }
            : e
        )
      )
      toast.success('Expert rejected.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed.')
    } finally {
      setActioningExpertId(null)
    }
  }

  const handleRejectDismiss = () => {
    setRejectModal({ isOpen: false, expertId: null, expertName: '', reason: '' })
  }

  // ── Expert filter/search ──────────────────────────────────────────────────────
  const handleExpertFilterChange = (status) => {
    setExpertFilter(status)
    fetchExperts(status, expertSearch)
  }

  const handleExpertSearch = (e) => {
    setExpertSearch(e.target.value)
    fetchExperts(expertFilter, e.target.value)
  }

  // ── Booking filter ────────────────────────────────────────────────────────────
  const handleBookingFilterChange = (status) => {
    setBookingFilter(status)
    fetchBookings(status)
  }

  // ── Derived: client-side search for users and bookings ───────────────────────
  const filteredUsers = userSearch
    ? users.filter(
        (u) =>
          u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.email?.toLowerCase().includes(userSearch.toLowerCase())
      )
    : users

  const filteredBookings = bookingSearch
    ? bookings.filter(
        (b) =>
          b.clientId?.name?.toLowerCase().includes(bookingSearch.toLowerCase()) ||
          b.clientId?.email?.toLowerCase().includes(bookingSearch.toLowerCase()) ||
          b.expertId?.userId?.name?.toLowerCase().includes(bookingSearch.toLowerCase())
      )
    : bookings

  // ── Format helpers ────────────────────────────────────────────────────────────
  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }

  const formatCurrency = (amount) => {
    if (amount == null) return '—'
    return `₹${amount.toLocaleString('en-IN')}`
  }

  const tabs = ['overview', 'users', 'experts', 'bookings']

  return (
    <>
      {/* ── Reject Modal ───────────────────────────────────────────────────────── */}
      {rejectModal.isOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px',
          }}
          onClick={handleRejectDismiss}
        >
          <div
            style={{
              background: 'white', borderRadius: '12px', padding: '32px',
              maxWidth: '480px', width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: 'var(--font-serif)', margin: '0 0 6px', fontSize: '20px', color: '#1a1a2e' }}>
              Reject Expert
            </h3>
            <p style={{ color: '#6b7280', margin: '0 0 20px', fontSize: '14px', lineHeight: 1.5 }}>
              You are rejecting <strong>{rejectModal.expertName || 'this expert'}</strong>. Provide a reason below (optional).
            </p>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#374151', marginBottom: '6px' }}>
              Rejection Reason
            </label>
            <textarea
              style={{
                width: '100%', minHeight: '100px', padding: '10px 12px',
                border: '1px solid #d1d5db', borderRadius: '8px',
                fontFamily: 'var(--font-sans)', fontSize: '14px', resize: 'vertical',
                outline: 'none',
              }}
              placeholder="E.g. Incomplete qualifications, missing bar council registration…"
              value={rejectModal.reason}
              maxLength={500}
              onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
            />
            <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'right', margin: '4px 0 20px' }}>
              {rejectModal.reason.length}/500
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleRejectConfirm}
                style={{
                  flex: 1, padding: '11px', background: '#F44336', color: 'white',
                  border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Confirm Rejection
              </button>
              <button
                onClick={handleRejectDismiss}
                style={{
                  flex: 1, padding: '11px', background: '#f3f4f6', color: '#374151',
                  border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.layout}>
        {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarBrand}>
            <span className={styles.brandL}>L</span>Experts
            <span className={styles.adminBadge}>Admin</span>
          </div>
          <nav className={styles.sidebarNav}>
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`${styles.navItem} ${activeTab === tab ? styles.navItemActive : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                <span className={styles.navIcon}>
                  {tab === 'overview' && '📊'}
                  {tab === 'users'    && '👥'}
                  {tab === 'experts'  && '⚖️'}
                  {tab === 'bookings' && '📅'}
                </span>
                <span style={{ textTransform: 'capitalize' }}>{tab}</span>
                {tab === 'experts' && stats?.pendingExperts > 0 && (
                  <span className={styles.navBadge}>{stats.pendingExperts}</span>
                )}
              </button>
            ))}
          </nav>
          <div className={styles.sidebarFooter}>
            <Link to="/dashboard" className={styles.backLink}>
              ← Back to Site
            </Link>
          </div>
        </aside>

        {/* ── Main Content ─────────────────────────────────────────────────────── */}
        <main className={styles.content}>
          {/* Header */}
          <div className={styles.contentHeader}>
            <div>
              <h1 className={styles.pageTitle}>
                {activeTab === 'overview' && 'Overview'}
                {activeTab === 'users'    && 'Users'}
                {activeTab === 'experts'  && 'Expert Verification'}
                {activeTab === 'bookings' && 'Bookings'}
              </h1>
              <p className={styles.pageSub}>
                {activeTab === 'overview' && 'Platform-wide statistics at a glance.'}
                {activeTab === 'users'    && 'Manage all registered users.'}
                {activeTab === 'experts'  && 'Review and approve or reject expert profiles.'}
                {activeTab === 'bookings' && 'View all consultation bookings on the platform.'}
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {error && !loading && (
            <div className={styles.errorBanner}>
              <span>{error}</span>
              <button
                onClick={() => {
                  if (activeTab === 'overview') fetchStats()
                  if (activeTab === 'users')    fetchUsers(userSearch)
                  if (activeTab === 'experts')  fetchExperts(expertFilter, expertSearch)
                  if (activeTab === 'bookings') fetchBookings(bookingFilter)
                }}
                className={styles.retryBtn}
              >
                Retry
              </button>
            </div>
          )}

          {/* ── OVERVIEW TAB ──────────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div>
              {loading ? (
                <Spinner />
              ) : stats ? (
                <>
                  <div className={styles.statsGrid}>
                    <StatCard label="Total Users"        value={stats.totalUsers}    color="#5C6BC0" icon="👥" />
                    <StatCard label="Total Experts"      value={stats.totalExperts}  color="#00897B" icon="⚖️" />
                    <StatCard label="Total Bookings"     value={stats.totalBookings} color="#2196F3" icon="📅" />
                    <StatCard label="Pending Approvals"  value={stats.pendingExperts} color="#FF9800" icon="⏳" />
                  </div>

                  <div className={styles.revenueCard}>
                    <div className={styles.revenueLabel}>Total Platform Revenue</div>
                    <div className={styles.revenueValue}>{formatCurrency(stats.totalRevenue)}</div>
                    <div className={styles.revenueSub}>from confirmed + completed bookings</div>
                  </div>

                  <div className={styles.overviewGrid}>
                    <div className={styles.overviewBlock}>
                      <h3 className={styles.blockTitle}>Booking Breakdown</h3>
                      <div className={styles.breakdownList}>
                        <div className={styles.breakdownItem}>
                          <span>Confirmed</span>
                          <Badge label={stats.confirmedBookings} color="#4CAF50" />
                        </div>
                        <div className={styles.breakdownItem}>
                          <span>Cancelled</span>
                          <Badge label={stats.cancelledBookings} color="#F44336" />
                        </div>
                        <div className={styles.breakdownItem}>
                          <span>Other</span>
                          <Badge
                            label={stats.totalBookings - stats.confirmedBookings - stats.cancelledBookings}
                            color="#9E9E9E"
                          />
                        </div>
                      </div>
                    </div>

                    <div className={styles.overviewBlock}>
                      <h3 className={styles.blockTitle}>Expert Status</h3>
                      <div className={styles.breakdownList}>
                        <div className={styles.breakdownItem}>
                          <span>Pending Review</span>
                          <Badge label={stats.pendingExperts} color="#FF9800" />
                        </div>
                        <div className={styles.breakdownItem}>
                          <span>Approved</span>
                          <Badge label={stats.totalExperts - stats.pendingExperts} color="#4CAF50" />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* ── USERS TAB ────────────────────────────────────────────────────── */}
          {activeTab === 'users' && (
            <div>
              <div className={styles.tableToolbar}>
                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder="Search by name or email…"
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value)
                    fetchUsers(e.target.value)
                  }}
                />
                <span className={styles.resultCount}>{filteredUsers.length} users</span>
              </div>

              {loading ? (
                <Spinner />
              ) : filteredUsers.length === 0 ? (
                <EmptyState message="No users found." />
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Joined</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user._id}>
                          <td className={styles.tdName}>{user.name}</td>
                          <td className={styles.tdEmail}>{user.email}</td>
                          <td>
                            <Badge label={user.role} color={ROLE_COLORS[user.role] || '#9E9E9E'} />
                          </td>
                          <td>
                            <Badge
                              label={user.isActive ? 'Active' : 'Inactive'}
                              color={user.isActive ? '#4CAF50' : '#9E9E9E'}
                            />
                          </td>
                          <td className={styles.tdDate}>{formatDate(user.createdAt)}</td>
                          <td>
                            <button
                              className={
                                user.isActive
                                  ? styles.actionBtnDanger
                                  : styles.actionBtnSuccess
                              }
                              onClick={() => handleToggleUser(user._id, user.isActive)}
                              disabled={actioningUserId === user._id}
                            >
                              {actioningUserId === user._id
                                ? '…'
                                : user.isActive
                                ? 'Deactivate'
                                : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── EXPERTS TAB ──────────────────────────────────────────────────── */}
          {activeTab === 'experts' && (
            <div>
              {/* Filter tabs */}
              <div className={styles.filterTabs}>
                {['all', 'pending', 'approved', 'rejected'].map((f) => (
                  <button
                    key={f}
                    className={`${styles.filterTab} ${expertFilter === f ? styles.filterTabActive : ''}`}
                    onClick={() => handleExpertFilterChange(f)}
                  >
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              <div className={styles.tableToolbar}>
                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder="Search by name or email…"
                  value={expertSearch}
                  onChange={handleExpertSearch}
                />
                <span className={styles.resultCount}>{experts.length} experts</span>
              </div>

              {loading ? (
                <Spinner />
              ) : experts.length === 0 ? (
                <EmptyState message={`No ${expertFilter === 'all' ? '' : expertFilter} experts found.`} />
              ) : (
                <div className={styles.cardList}>
                  {experts.map((expert) => (
                    <div key={expert._id} className={styles.expertCard}>
                      <div className={styles.expertCardHeader}>
                        <div>
                          <div className={styles.expertName}>
                            {expert.userId?.name || 'Unknown User'}
                          </div>
                          <div className={styles.expertEmail}>
                            {expert.userId?.email || '—'}
                          </div>
                        </div>
                        <Badge
                          label={expert.verificationStatus || 'pending'}
                          color={VERIFICATION_COLORS[expert.verificationStatus] || '#FF9800'}
                        />
                      </div>

                      <div className={styles.expertMeta}>
                        <div className={styles.expertMetaItem}>
                          <span className={styles.metaLabel}>Specialization</span>
                          <span className={styles.metaValue}>
                            {expert.specialization?.join(', ') || '—'}
                          </span>
                        </div>
                        <div className={styles.expertMetaItem}>
                          <span className={styles.metaLabel}>Experience</span>
                          <span className={styles.metaValue}>
                            {expert.experience != null ? `${expert.experience} yrs` : '—'}
                          </span>
                        </div>
                        <div className={styles.expertMetaItem}>
                          <span className={styles.metaLabel}>Consultation Fee</span>
                          <span className={styles.metaValue}>
                            {expert.consultationFee != null ? formatCurrency(expert.consultationFee) : '—'}
                          </span>
                        </div>
                        <div className={styles.expertMetaItem}>
                          <span className={styles.metaLabel}>Joined</span>
                          <span className={styles.metaValue}>
                            {formatDate(expert.userId?.createdAt)}
                          </span>
                        </div>
                      </div>

                      {expert.bio && (
                        <p className={styles.expertBio}>
                          {expert.bio.length > 160 ? expert.bio.slice(0, 160) + '…' : expert.bio}
                        </p>
                      )}

                      {expert.verificationStatus === 'rejected' && expert.rejectionReason && (
                        <div className={styles.rejectionNote}>
                          <strong>Rejection reason:</strong> {expert.rejectionReason}
                        </div>
                      )}

                      {/* Actions */}
                      <div className={styles.expertCardFooter}>
                        {expert.verificationStatus !== 'approved' && (
                          <button
                            className={styles.approveBtn}
                            onClick={() => handleApproveExpert(expert._id)}
                            disabled={actioningExpertId === expert._id}
                          >
                            {actioningExpertId === expert._id ? 'Approving…' : '✓ Approve'}
                          </button>
                        )}
                        {expert.verificationStatus !== 'rejected' && (
                          <button
                            className={styles.rejectBtn}
                            onClick={() => handleOpenRejectModal(expert._id, expert.userId?.name)}
                            disabled={actioningExpertId === expert._id}
                          >
                            ✗ Reject
                          </button>
                        )}
                        {expert.verificationStatus === 'approved' && (
                          <span className={styles.verifiedNote}>Profile is verified and active.</span>
                        )}
                        {expert.verificationStatus === 'rejected' && (
                          <span className={styles.rejectedNote}>Currently rejected.</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── BOOKINGS TAB ─────────────────────────────────────────────────── */}
          {activeTab === 'bookings' && (
            <div>
              {/* Filter tabs */}
              <div className={styles.filterTabs}>
                {['all', 'pending', 'confirmed', 'cancelled'].map((f) => (
                  <button
                    key={f}
                    className={`${styles.filterTab} ${bookingFilter === f ? styles.filterTabActive : ''}`}
                    onClick={() => handleBookingFilterChange(f)}
                  >
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              <div className={styles.tableToolbar}>
                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder="Search by client or expert name…"
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                />
                <span className={styles.resultCount}>{filteredBookings.length} bookings</span>
              </div>

              {loading ? (
                <Spinner />
              ) : filteredBookings.length === 0 ? (
                <EmptyState message={`No ${bookingFilter === 'all' ? '' : bookingFilter} bookings found.`} />
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Expert</th>
                        <th>Date</th>
                        <th>Slot</th>
                        <th>Fee</th>
                        <th>Status</th>
                        <th>Booked On</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map((booking) => (
                        <tr key={booking._id}>
                          <td>
                            <div className={styles.tdName}>{booking.clientId?.name || '—'}</div>
                            <div className={styles.tdEmail}>{booking.clientId?.email || ''}</div>
                          </td>
                          <td>
                            <div className={styles.tdName}>
                              {booking.expertId?.userId?.name || '—'}
                            </div>
                            <div className={styles.tdEmail}>
                              {booking.expertId?.userId?.email || ''}
                            </div>
                          </td>
                          <td className={styles.tdDate}>{formatDate(booking.date)}</td>
                          <td className={styles.tdDate}>
                            {booking.slot?.start
                              ? `${booking.slot.start} – ${booking.slot.end}`
                              : '—'}
                          </td>
                          <td>{formatCurrency(booking.consultationFeeAtBooking)}</td>
                          <td>
                            <Badge
                              label={booking.status}
                              color={STATUS_COLORS[booking.status] || '#9E9E9E'}
                            />
                          </td>
                          <td className={styles.tdDate}>{formatDate(booking.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  )
}
