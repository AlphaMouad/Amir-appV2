import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, LogOut, Building2, User } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Projects', path: '/projects', icon: FolderKanban },
    { label: 'Suppliers', path: '/suppliers', icon: Building2 },
  ];

  return (
    <div className="min-h-screen flex font-montserrat text-white pb-20 md:pb-0 relative overflow-hidden bg-black">
      
      {/* Desktop Sidebar */}
      <aside className="w-72 elite-glass border-y-0 border-l-0 hidden md:flex flex-col shrink-0 sticky top-0 h-screen z-20">
        <div className="p-8 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-black border border-[#D4AF37]/20 flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.1)]">
              <span className="font-playfair font-black text-2xl elite-text-gold">V</span>
            </div>
            <div>
              <h1 className="text-xl font-playfair font-black tracking-[0.1em] text-white uppercase">
                Elite<span className="elite-text-gold font-medium">Finance</span>
              </h1>
              <p className="text-[9px] text-[#D4AF37]/60 uppercase tracking-[0.3em] mt-1 font-bold">Management</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-6 space-y-3">
          <div className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-6 px-2">Menu</div>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-4 text-sm font-medium rounded-lg transition-all duration-500 relative group overflow-hidden ${
                  isActive 
                    ? 'text-white' 
                    : 'elite-text-silver hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeNavIndicator"
                    className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/10 to-transparent border-l-2 border-[#D4AF37]"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={`h-5 w-5 relative z-10 transition-colors duration-500 ${isActive ? 'text-[#D4AF37]' : 'text-white/40 group-hover:text-white/80'}`} />
                <span className="relative z-10 tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 mt-auto border-t border-white/[0.04] bg-black/60">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-black border border-white/10 flex items-center justify-center text-white shadow-inner overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover opacity-80" />
              ) : (
                <User className="h-5 w-5 text-white/50" />
              )}
            </div>
            <div className="text-sm truncate">
              <p className="font-semibold text-white truncate tracking-wide">{user?.displayName || 'User'}</p>
              <p className="text-white/40 text-xs truncate tracking-wider">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="elite-button-outline w-full py-3 flex items-center justify-center text-xs tracking-[0.1em] uppercase">
            <LogOut className="h-4 w-4 mr-3" />
            Secure Logout
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="elite-glass h-20 flex items-center justify-between px-6 md:hidden fixed top-0 left-0 right-0 z-20 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-lg bg-black border border-[#D4AF37]/20 flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.1)]">
              <span className="font-playfair font-black text-xl elite-text-gold">V</span>
            </div>
            <h1 className="text-lg font-playfair font-black tracking-[0.1em] text-white uppercase">
              Elite<span className="elite-text-gold font-medium">Finance</span>
            </h1>
        </div>
        <button onClick={logout} className="rounded-full h-10 w-10 bg-black border border-white/10 flex items-center justify-center hover:border-rose-500/50 hover:text-rose-500 transition-colors">
           <LogOut className="h-4 w-4 text-white/60" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-10 pt-28 md:pt-10 min-h-[calc(100vh-5rem)] md:min-h-screen relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-6 left-4 right-4 elite-card z-30 px-6 py-4 flex items-center justify-between bg-black/80">
         {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 p-2 transition-all duration-500 relative ${
                  isActive ? 'text-[#D4AF37]' : 'text-white/40 hover:text-white/80'
                }`}
              >
                <item.icon className={`h-6 w-6 relative z-10 transition-colors duration-500`} />
                <span className="text-[9px] font-bold relative z-10 tracking-[0.1em] uppercase mt-1">{item.label}</span>
              </Link>
            );
          })}
      </nav>
    </div>
  );
}

