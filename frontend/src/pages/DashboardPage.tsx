import { useAuth } from '@/context/AuthContext';
import styles from './DashboardPage.module.css';

const STATS = [
  { label: 'Patients Today', value: '24', icon: '👤' },
  { label: 'Drug Interactions Checked', value: '8', icon: '💊' },
  { label: 'Protocols Referenced', value: '5', icon: '📋' },
  { label: 'Alerts', value: '2', icon: '🔔' },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <>
      <div className={styles.banner}>
        <p className={styles.bannerGreeting}>Good morning,</p>
        <h1 className={styles.bannerName}>{user?.name}</h1>
        <p className={styles.bannerSubtext}>
          Welcome back to Medivise. Your clinical dashboard is ready.
        </p>
      </div>

      <div className={styles.statsGrid}>
        {STATS.map(({ label, value, icon }) => (
          <div key={label} className={styles.statCard}>
            <div className={styles.statIcon}>{icon}</div>
            <div className={styles.statValue}>{value}</div>
            <div className={styles.statLabel}>{label}</div>
          </div>
        ))}
      </div>
    </>
  );
}
