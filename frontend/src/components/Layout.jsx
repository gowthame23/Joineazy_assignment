import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, WakeBanner } from './ui';
import { LogOut, BookOpen, User } from 'lucide-react';

export function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col font-sans">
      <WakeBanner />

      {/* Navbar */}
      <header className="bg-ink text-white sticky top-0 z-40 shadow-sm border-b border-ink-soft">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded bg-brand flex items-center justify-center text-white font-bold text-base">
              J
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-base tracking-tight leading-none text-white">
                Joineazy
              </span>
              <span className="text-[11px] text-text-3 font-medium">Assignment Management</span>
            </div>
          </Link>

          {user && (
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-medium text-white">{user.name}</span>
                <span className="text-xs text-text-3 capitalize">
                  {user.role === 'admin' ? 'Professor' : 'Student'}
                  {user.studentId ? ` (${user.studentId})` : ''}
                </span>
              </div>

              <div className="sm:hidden flex items-center gap-1.5 bg-ink-soft px-2.5 py-1 rounded text-xs">
                <User className="w-3.5 h-3.5 text-text-3" />
                <span className="font-medium text-white capitalize">{user.role}</span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-white/80 hover:text-white hover:bg-ink-soft"
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Log out</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-line bg-surface py-4 text-center text-xs text-text-3">
        <div className="max-w-[1200px] mx-auto px-4">
          Joineazy Assignment Management System &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
