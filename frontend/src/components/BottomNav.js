import { useRouter } from 'next/router';
import Link from 'next/link';

export default function BottomNav() {
  const router = useRouter();
  const currentPath = router.pathname;

  const navItems = [
    { path: '/swipe', icon: '💝', label: 'Swipe' },
    { path: '/likes', icon: '⭐', label: 'Likes' },
    { path: '/chats', icon: '💬', label: 'Chats' },
    { path: '/profile', icon: '👤', label: 'Profile' }
  ];

  const isActive = (path) => {
    if (path === '/swipe' && (currentPath === '/' || currentPath === '/swipe')) return true;
    if (path === '/chats' && currentPath === '/chats') return true;
    if (path === '/likes' && currentPath === '/likes') return true;
    if (path === '/profile' && currentPath === '/profile') return true;
    return currentPath === path;
  };

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const active = isActive(item.path);
        return (
          <Link
            key={item.path}
            href={item.path === '/swipe' ? '/' : item.path}
            legacyBehavior
              >
                <a className={`bottom-nav-item ${active ? 'active' : ''}`}>
                  <span className="bottom-nav-icon">{item.icon}</span>
                  <span className="bottom-nav-label">{item.label}</span>
                </a>
              </Link>
        );
      })}
    </nav>
  );
}

