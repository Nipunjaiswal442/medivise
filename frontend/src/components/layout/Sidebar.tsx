import { NavLink } from 'react-router-dom';
import Logo from '@/components/ui/Logo';
import {
  LayoutDashboardIcon,
  MessageSquareIcon,
  UsersIcon,
  SettingsIcon,
} from '@/components/ui/Icons';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
  { to: '/chat', label: 'AI Assistant', icon: MessageSquareIcon },
  { to: '/patients', label: 'Patients', icon: UsersIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoArea}>
        <Logo />
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ to, label, icon: IconComponent }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            <IconComponent size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        <p className={styles.footerText}>Medivise v1.0</p>
      </div>
    </aside>
  );
}
