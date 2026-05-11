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
    <div className="min-h-screen flex font-montserrat text-slate-100 pb-20 md:pb-0 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-amber-700/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />

      {/* Desktop Sidebar */}
      <aside className="w-72 glass-sidebar hidden md:flex flex-col shrink-0 sticky top-0 h-screen z-20">
        <div className="p-8 mb-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-600 to-indigo-700 flex items-center justify-center shadow-[0_0_24px_rgba(79,70,229,0.4)] border border-white/10">
              <span className="font-playfair font-black text-2xl text-white">V</span>
            </div>
            <div>
              <h1 className="text-xl font-playfair font-black tracking-tight text-white">ELITE<span className="text-amber-400 font-medium">FINANCE</span></h1>
              <p className="text-[10px] text-stone-300/60 uppercase tracking-[0.2em] mt-0.5 font-bold">Management</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-6 space-y-2 mt-4">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-4 px-2">Menu</div>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-3.5 text-sm font-medium rounded-2xl transition-all duration-300 relative group overflow-hidden ${
                  isActive 
                    ? 'text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeNavIndicator"
                    className="absolute inset-0 bg-amber-600/10 border border-amber-600/20 rounded-2xl"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={`h-5 w-5 relative z-10 transition-colors ${isActive ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(79,70,229,0.5)]' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 mt-auto border-t border-white/5 bg-black/20 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white shadow-inner overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="h-5 w-5 text-slate-400" />
              )}
            </div>
            <div className="text-sm truncate">
              <p className="font-semibold text-slate-200 truncate">{user?.displayName || 'User'}</p>
              <p className="text-slate-500 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-center text-slate-300 border-white/10 hover:bg-white/10 hover:text-white rounded-xl transition-all" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="glass-nav h-16 flex items-center justify-between px-6 md:hidden fixed top-0 left-0 right-0 z-20">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-600 to-indigo-700 flex items-center justify-center shadow-[0_0_12px_rgba(79,70,229,0.4)]">
              <span className="font-playfair font-black text-sm text-white">V</span>
            </div>
            <h1 className="text-lg font-playfair font-black tracking-tight text-white">ELITE<span className="text-amber-400 font-medium">FINANCE</span></h1>
        </div>
        <Button variant="ghost" size="icon" onClick={logout} className="rounded-full h-9 w-9 bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-slate-300">
           <LogOut className="h-4 w-4" />
        </Button>
      </header>

      {/* Main Content Area with Page Transitions */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 pt-20 md:pt-8 min-h-[calc(100vh-5rem)] md:min-h-screen relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-6 left-4 right-4 glass-card shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-30 rounded-3xl px-6 py-3 flex items-center justify-between">
         {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 relative ${
                  isActive ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="mobileNavIndicator"
                    className="absolute inset-0 bg-amber-600/10 rounded-xl"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={`h-6 w-6 relative z-10 transition-colors duration-300 ${isActive ? 'drop-shadow-[0_0_8px_rgba(79,70,229,0.5)]' : ''}`} />
                <span className="text-[10px] font-medium relative z-10 tracking-wide">{item.label}</span>
              </Link>
            );
          })}
      </nav>
    </div>
  );
}

