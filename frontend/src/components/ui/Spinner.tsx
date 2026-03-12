interface SpinnerProps {
  size?: number;
  className?: string;
}

export default function Spinner({ size = 48, className }: SpinnerProps) {
  return (
    <div className={className} style={{ textAlign: 'center' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite' }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <circle
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke="var(--color-gray-200)"
          strokeWidth="4"
        />
        <path
          d="M24 4a20 20 0 0 1 20 20"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function InlineSpinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
