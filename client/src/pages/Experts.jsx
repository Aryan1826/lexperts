// src/pages/Experts.jsx

import { useState, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import ExpertCard from '../components/ExpertCard'
import { ExpertGridSkeleton } from '../components/LoadingSkeleton'
import { getAllExperts } from '../services/expert.service'
import styles from './Experts.module.css'

const SORT_OPTIONS = [
  { value: '', label: 'Most Recent' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'fee_asc', label: 'Fee: Low to High' },
  { value: 'fee_desc', label: 'Fee: High to Low' },
  { value: 'experience', label: 'Most Experienced' },
]

export default function Experts() {
  const [experts, setExperts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    specialization: '',
    minFee: '',
    maxFee: '',
    minRating: '',
    sort: '',
  })

  const fetchExperts = useCallback(async (currentPage = 1) => {
    setLoading(true)
    setError('')
    try {
      const params = { page: currentPage, limit: 9 }
      if (filters.specialization) params.specialization = filters.specialization
      if (filters.minFee) params.minFee = filters.minFee
      if (filters.maxFee) params.maxFee = filters.maxFee
      if (filters.minRating) params.minRating = filters.minRating
      if (filters.sort) params.sort = filters.sort
      const data = await getAllExperts(params)
      setExperts(data.experts)
      setPagination(data.pagination)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load experts.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    setPage(1)
    fetchExperts(1)
  }, [filters])

  const handlePageChange = (newPage) => {
    setPage(newPage)
    fetchExperts(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleFilterChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const clearFilters = () => {
    setFilters({ specialization: '', minFee: '', maxFee: '', minRating: '', sort: '' })
  }

  const hasActiveFilters = Object.values(filters).some(Boolean)

  return (
    <div className={styles.page}>
      <Navbar />
      <main>
        <div className={styles.pageHead}>
          <div className="container">
            <h1 className={styles.pageTitle}>Find an Expert</h1>
            <p className={styles.pageSub}>Browse verified professionals ready to help you.</p>
          </div>
        </div>

        <div className={`container ${styles.body}`}>
          <aside className={styles.sidebar}>
            <div className={styles.filterBox}>
              <div className={styles.filterHead}>
                <span className={styles.filterTitle}>Filters</span>
                {hasActiveFilters && (
                  <button className={styles.clearBtn} onClick={clearFilters}>Clear all</button>
                )}
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Specialization</label>
                <input
                  type="text"
                  name="specialization"
                  value={filters.specialization}
                  onChange={handleFilterChange}
                  className={styles.filterInput}
                  placeholder="e.g. tax, criminal"
                />
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Fee Range (₹)</label>
                <div className={styles.rangeRow}>
                  <input
                    type="number"
                    name="minFee"
                    value={filters.minFee}
                    onChange={handleFilterChange}
                    className={styles.filterInput}
                    placeholder="Min"
                    min={0}
                  />
                  <span className={styles.rangeSep}>–</span>
                  <input
                    type="number"
                    name="maxFee"
                    value={filters.maxFee}
                    onChange={handleFilterChange}
                    className={styles.filterInput}
                    placeholder="Max"
                    min={0}
                  />
                </div>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Minimum Rating</label>
                <select
                  name="minRating"
                  value={filters.minRating}
                  onChange={handleFilterChange}
                  className={styles.filterInput}
                >
                  <option value="">Any rating</option>
                  <option value="3">3★ and above</option>
                  <option value="4">4★ and above</option>
                  <option value="4.5">4.5★ and above</option>
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Sort by</label>
                <select
                  name="sort"
                  value={filters.sort}
                  onChange={handleFilterChange}
                  className={styles.filterInput}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </aside>

          <section className={styles.results}>
            {error && <div className={styles.errorBox}>{error}</div>}

            {!error && (
              <div className={styles.resultsHead}>
                <span className={styles.resultCount}>
                  {loading
                    ? 'Loading...'
                    : `${pagination?.total ?? 0} expert${pagination?.total !== 1 ? 's' : ''} found`}
                </span>
              </div>
            )}

            {loading ? (
              <ExpertGridSkeleton count={3} />
            ) : !error && experts.length === 0 ? (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>No experts found</p>
                <p className={styles.emptySub}>Try adjusting your filters.</p>
                {hasActiveFilters && (
                  <button className={styles.clearBtn2} onClick={clearFilters}>Clear filters</button>
                )}
              </div>
            ) : (
              <>
                <div className={styles.grid}>
                  {experts.map((expert) => (
                    <ExpertCard key={expert._id} expert={expert} />
                  ))}
                </div>

                {pagination && pagination.totalPages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      className={styles.pageBtn}
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                    >
                      ← Prev
                    </button>
                    <span className={styles.pageInfo}>
                      Page {page} of {pagination.totalPages}
                    </span>
                    <button
                      className={styles.pageBtn}
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= pagination.totalPages}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}