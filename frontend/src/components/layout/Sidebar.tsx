import { NavLink } from 'react-router-dom';
import Logo from '@/components/ui/Logo';
import {
  LayoutDashboardIcon,
  MessageSquareIcon,
  UsersIcon,
  StethoscopeIcon,
  NewspaperIcon,
  SettingsIcon,
} from '@/components/ui/Icons';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
  { to: '/chat', label: 'AI Assistant', icon: MessageSquareIcon },
  { to: '/patients', label: 'Patients', icon: UsersIcon },
  { to: '/consultation', label: 'Start Consultation', icon: StethoscopeIcon },
  { to: '/news', label: 'Medical News', icon: NewspaperIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

interface SidebarProps {
  collapsed: boolean;
}

export default function Sidebar({ collapsed }: SidebarProps) {
  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.logoArea}>
        {!collapsed && <Logo />}
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ to, label, icon: IconComponent }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <IconComponent size={18} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        {!collapsed && <p className={styles.footerText}>Medivise v1.0</p>}
      </div>
    </aside>
  );
}
