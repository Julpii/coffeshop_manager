import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

const NAV = {
  cashier: [
    ['/pos', 'Main'],
    ['/orders', 'Orders'],
    ['/history', 'History'],
  ],
  admin: [
    ['/dashboard', 'Dashboard'],
    ['/history', 'History'],
    ['/products', 'Products'],
    ['/orders', 'Orders'],
    ['/categories', 'Category'],
  ],
};

export default function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col bg-espresso text-foam md:sticky md:top-0 md:h-screen md:w-56">
        <div className="flex items-center gap-3 px-4 py-4 md:flex-col md:items-start md:gap-4 md:px-5 md:py-6">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-caramel font-display text-lg font-bold text-white" aria-hidden="true">{initials}</span>
          <div className="min-w-0">
            <p className="truncate font-display text-lg leading-tight">{user.name}</p>
            <p className="text-xs capitalize text-latte/80">{user.role}</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:pb-0" aria-label="Main">
          {NAV[user.role].map(([to, label]) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-caramel text-white' : 'text-latte hover:bg-roast'}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 pb-3 md:pb-5">
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-latte hover:bg-roast"
            onClick={() => { logout(); navigate('/login'); }}>
            Logout
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6"><Outlet /></main>
    </div>
  );
}
