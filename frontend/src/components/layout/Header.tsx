import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LogOutIcon, MenuIcon } from '@/components/ui/Icons';
import styles from './Header.module.css';

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className={styles.header}>
      <button
        className={styles.menuBtn}
        onClick={onToggleSidebar}
        title="Toggle sidebar"
        aria-label="Toggle sidebar"
      >
        <MenuIcon size={20} />
      </button>

      <div className={styles.spacer} />

      <div className={styles.userArea}>
        <div className={styles.userInfo}>
          <p className={styles.userName}>{user?.name}</p>
          <p className={styles.userRole}>{user?.specialty ?? user?.role}</p>
        </div>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          <LogOutIcon size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
}
