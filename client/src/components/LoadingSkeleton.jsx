// client/src/components/LoadingSkeleton.jsx

import styles from './LoadingSkeleton.module.css'

// Single skeleton line (animated shimmer)
export function SkeletonLine({ width = '100%', height = '16px' }) {
  return (
    <div
      className={styles.skeletonLine}
      style={{ width, height }}
    />
  )
}

// Skeleton for a booking card (matches BookingCard layout)
export function BookingCardSkeleton() {
  return (
    <div className={styles.cardSkeleton}>
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <SkeletonLine width="180px" height="20px" />
          <div style={{ marginTop: '8px' }}>
            <SkeletonLine width="120px" height="14px" />
          </div>
        </div>
        <SkeletonLine width="100px" height="32px" />
      </div>
      <div className={styles.cardBody}>
        <div className={styles.detailItem}>
          <SkeletonLine width="40px" height="12px" />
          <div style={{ marginTop: '6px' }}>
            <SkeletonLine width="130px" height="16px" />
          </div>
        </div>
        <div className={styles.detailItem}>
          <SkeletonLine width="40px" height="12px" />
          <div style={{ marginTop: '6px' }}>
            <SkeletonLine width="100px" height="16px" />
          </div>
        </div>
        <div className={styles.detailItem}>
          <SkeletonLine width="30px" height="12px" />
          <div style={{ marginTop: '6px' }}>
            <SkeletonLine width="60px" height="16px" />
          </div>
        </div>
      </div>
      <div className={styles.cardFooter}>
        <SkeletonLine width="140px" height="40px" />
      </div>
    </div>
  )
}

// Skeleton for stats cards row
export function StatsSkeleton({ count = 3 }) {
  return (
    <div className={styles.statsRow}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.statCardSkeleton}>
          <SkeletonLine width="60px" height="42px" />
          <div style={{ marginTop: '12px' }}>
            <SkeletonLine width="80px" height="14px" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Skeleton for My Bookings / Expert Dashboard full page
export function BookingsPageSkeleton({ cardCount = 3, statsCount = 3 }) {
  return (
    <div className={styles.pageSkeleton}>
      <StatsSkeleton count={statsCount} />
      <div className={styles.filterSkeleton}>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonLine key={i} width="100px" height="36px" />
        ))}
      </div>
      {Array.from({ length: cardCount }).map((_, i) => (
        <BookingCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Skeleton for Expert Profile form
export function ProfileFormSkeleton() {
  return (
    <div className={styles.formSkeleton}>
      <SkeletonLine width="240px" height="28px" />
      <div style={{ marginTop: '8px' }}>
        <SkeletonLine width="320px" height="16px" />
      </div>

      <div className={styles.checkboxGridSkeleton}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonLine key={i} width="100%" height="44px" />
        ))}
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={styles.fieldSkeleton}>
          <SkeletonLine width="160px" height="18px" />
          <div style={{ marginTop: '8px' }}>
            <SkeletonLine width="100%" height="44px" />
          </div>
        </div>
      ))}

      <div className={styles.fieldSkeleton}>
        <SkeletonLine width="160px" height="18px" />
        <div style={{ marginTop: '8px' }}>
          <SkeletonLine width="100%" height="120px" />
        </div>
      </div>

      <SkeletonLine width="100%" height="48px" />
    </div>
  )
}

export default BookingCardSkeleton
