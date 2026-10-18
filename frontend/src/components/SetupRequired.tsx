import Logo from '@/components/ui/Logo';

/** Shown instead of the app when VITE_CONVEX_URL is not configured. */
export default function SetupRequired() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1.5rem', background: 'var(--color-gray-50)' }}>
      <div className="ui-card" style={{ maxWidth: 560 }}>
        <Logo />
        <h1 className="ui-title" style={{ marginTop: '1rem' }}>Backend not configured</h1>
        <p className="ui-muted" style={{ marginTop: '0.5rem' }}>
          Medivise needs a Convex deployment. Set <code>VITE_CONVEX_URL</code> to your deployment URL
          (for example <code>https://happy-animal-123.convex.cloud</code>):
        </p>
        <ul className="ui-muted" style={{ marginTop: '0.75rem', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
          <li>Locally: in <code>frontend/.env</code>, then restart <code>npm run dev</code>.</li>
          <li>On Vercel: Project &rarr; Settings &rarr; Environment Variables, then redeploy.</li>
        </ul>
        <p className="ui-muted" style={{ marginTop: '0.75rem' }}>See DEPLOYMENT.md for the full setup.</p>
      </div>
    </div>
  );
}
