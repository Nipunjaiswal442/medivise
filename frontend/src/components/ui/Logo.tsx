import styles from './Logo.module.css';

interface LogoProps {
  className?: string;
  variant?: 'dark' | 'light';
}

export default function Logo({ className, variant = 'dark' }: LogoProps) {
  // In light variant (dark bg): white box + red cross
  // In dark variant (light bg): red box + white cross
  const boxColor = variant === 'light' ? '#FFFFFF' : '#B91C1C';
  const crossColor = variant === 'light' ? '#B91C1C' : '#FFFFFF';

  return (
    <div
      className={`${styles.logo} ${variant === 'light' ? styles.light : ''} ${className ?? ''}`}
    >
      <div className={styles.icon}>
        <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <rect width="40" height="40" rx="10" fill={boxColor} />
          <path d="M16 10h8v6h6v8h-6v6h-8v-6h-6v-8h6V10z" fill={crossColor} />
        </svg>
      </div>
      <span className={styles.text}>Medivise</span>
    </div>
  );
}
