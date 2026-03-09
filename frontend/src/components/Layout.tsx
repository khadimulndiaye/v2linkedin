import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const NAV_ITEMS = [
  { path: '/dashboard',  label: 'Dashboard',  icon: '📊' },
  { path: '/accounts',   label: 'Accounts',   icon: '👤' },
  { path: '/campaigns',  label: 'Campaigns',  icon: '📣' },
  { path: '/leads',      label: 'Leads',      icon: '🎯' },
  { path: '/posts',      label: 'Posts',      icon: '📝' },
  { path: '/ai-content', label: 'AI Content', icon: '✨' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-52 bg-gray-900 text-white flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-gray-700">
          <h1 className="text-lg font-bold text-white leading-tight">LinkedIn Manager</h1>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={
                  'flex items-center gap-3 px-5 py-3 text-sm transition-colors ' +
                  (active
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white')
                }
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700">
          {user && (
            <p className="text-xs text-gray-400 truncate mb-2">{user.email}</p>
          )}
          <button
            onClick={handleLogout}
            className="w-full text-left text-xs text-gray-400 hover:text-white transition-colors py-1"
          >
            ← Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
