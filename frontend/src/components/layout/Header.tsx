import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LogOutIcon } from '@/components/ui/Icons';
import styles from './Header.module.css';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className={styles.header}>
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
