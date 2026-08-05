import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import {
  PenSquare,
  Inbox,
  Send,
  FileText,
  Clock,
  History,
  Settings,
  LogOut,
  Mail
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Compose', path: '/', icon: PenSquare },
    { label: 'Inbox', path: '/inbox', icon: Inbox },
    { label: 'Sent', path: '/sent', icon: Send },
    { label: 'Drafts', path: '/drafts', icon: FileText },
    { label: 'Scheduled', path: '/scheduled', icon: Clock },
    { label: 'History Log', path: '/history', icon: History },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 bg-paper-100/80 backdrop-blur-md border-b border-paper-200 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 text-ink-900 font-bold text-xl tracking-tight group">
          <Logo />
          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-accent-400/20 text-ink-900 border border-accent-400/40 ml-1">MCP</span>
        </Link>

        {user && (
          <nav className="flex items-center gap-1.5 bg-paper-50/60 p-1.5 rounded-xl border border-paper-200">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-accent-400 text-ink-900 font-semibold shadow-md shadow-accent-400/20'
                      : 'text-ink-700 hover:text-ink-900 hover:bg-paper-200/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {user ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-paper-100 border border-paper-200">
              <Mail className="w-4 h-4 text-accent-500" />
              <span className="text-xs text-ink-700 font-medium">{user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-ink-700 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-ink-700 hover:text-ink-900 px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold text-ink-900 bg-accent-400 hover:bg-accent-500 px-4 py-2 rounded-lg shadow-md shadow-accent-400/20 transition-all"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
