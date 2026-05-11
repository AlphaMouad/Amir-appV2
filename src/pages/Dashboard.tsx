import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getProjects, getAllTrades } from '../services/api';
import { Project, Trade } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { AlertCircle, TrendingUp, Building, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    let projectsLoaded = false;
    let tradesLoaded = false;

    const unsubProjects = getProjects(user.uid, (data) => {
      setProjects(data);
      projectsLoaded = true;
      if (tradesLoaded) setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    const unsubTrades = getAllTrades(user.uid, (data) => {
      setTrades(data);
      tradesLoaded = true;
      if (projectsLoaded) setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => {
      unsubProjects();
      unsubTrades();
    };
  }, [user]);

  if (loading) {
    return <div className="flex justify-center items-center h-full text-amber-400 font-playfair">Loading Elite Dashboard...</div>;
  }

  // Calculate metrics
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'ongoing').length;
  
  const totalBudget = trades.reduce((sum, trade) => sum + trade.amount, 0);
  const totalAdvances = trades.reduce((sum, trade) => sum + trade.totalAdvances, 0);

  // Warnings for advances > 75%
  const tradesWithWarnings = trades.filter(t => t.amount > 0 && (t.totalAdvances / t.amount) > 0.75);

  // Prepare chart data (Advances vs Budget per project)
  const projectChartData = projects.map(p => {
    const projectTrades = trades.filter(t => t.projectId === p.id);
    const pBudget = projectTrades.reduce((sum, t) => sum + t.amount, 0);
    const pAdvances = projectTrades.reduce((sum, t) => sum + t.totalAdvances, 0);
    return {
      name: p.name,
      Budget: pBudget,
      Advances: pAdvances
    };
  });

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-playfair font-black tracking-tight text-white mb-2">Overview</h1>
          <p className="text-stone-300/60 font-medium">Welcome back, {user?.displayName?.split(' ')[0] || 'User'}. Here is your financial summary.</p>
        </div>
        <div className="bg-amber-600/10 border border-amber-600/20 px-4 py-2 rounded-xl backdrop-blur-md">
          <span className="text-sm font-bold text-amber-200 uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        </div>
      </motion.div>
      
      <motion.div variants={container} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div variants={item}>
          <Card className="glass-card overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10 border-b border-white/5 mb-4">
              <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Projects</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-amber-600/10 border border-amber-600/20 flex items-center justify-center group-hover:bg-amber-600/20 transition-colors duration-300 shadow-[0_0_15px_rgba(79,70,229,0.2)]">
                <Building className="h-5 w-5 text-amber-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-playfair font-black text-white tracking-tight">{totalProjects}</div>
              <p className="text-sm text-amber-200 font-medium mt-1">{activeProjects} active</p>
            </CardContent>
            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10 border-b border-white/5 mb-4">
              <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Global Budget</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors duration-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-playfair font-black text-white tracking-tight">€{totalBudget.toLocaleString()}</div>
              <p className="text-sm text-emerald-300 font-medium mt-1">Total allocated</p>
            </CardContent>
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10 border-b border-white/5 mb-4">
              <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Total Advances</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors duration-300 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <TrendingUp className="h-5 w-5 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-playfair font-black text-white tracking-tight">€{totalAdvances.toLocaleString()}</div>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex-1 bg-white/5 h-2 rounded-full overflow-hidden border border-white/10">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${Math.min(100, (totalAdvances / (totalBudget || 1)) * 100)}%` }} />
                </div>
                <p className="text-xs text-blue-300 font-bold w-8 text-right">
                  {totalBudget > 0 ? Math.round((totalAdvances / totalBudget) * 100) : 0}%
                </p>
              </div>
            </CardContent>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card overflow-hidden group border-rose-500/30 shadow-[0_8px_32px_rgba(244,63,94,0.1)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10 border-b border-rose-500/10 mb-4">
              <CardTitle className="text-xs font-bold text-rose-400 uppercase tracking-[0.2em]">Risk Alerts</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center group-hover:bg-rose-500/20 transition-colors duration-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                <AlertCircle className="h-5 w-5 text-rose-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-playfair font-black text-rose-400 tracking-tight drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]">{tradesWithWarnings.length}</div>
              <p className="text-sm text-rose-300 font-medium mt-1">Advances &gt; 75%</p>
            </CardContent>
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </Card>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 pb-6">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="glass-card h-full">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-xl font-playfair font-black text-white">Financial Matrix</CardTitle>
              <CardDescription className="text-stone-300/60 font-medium">Budget vs Advances tracking across active projects</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px] pt-6">
              <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
                <BarChart data={projectChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} dy={10} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `€${value / 1000}k`} tick={{fill: '#94a3b8'}} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.02)'}} 
                    contentStyle={{
                      backgroundColor: 'rgba(11, 15, 25, 0.8)', 
                      backdropFilter: 'blur(16px)', 
                      borderRadius: '16px', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)', 
                      padding: '16px',
                      color: 'white'
                    }} 
                  />
                  <Legend iconType="circle" wrapperStyle={{fontSize: '12px', color: '#cbd5e1', paddingTop: '20px'}} />
                  <Bar dataKey="Budget" fill="url(#colorBudget)" radius={[6, 6, 6, 6]} maxBarSize={32} />
                  <Bar dataKey="Advances" fill="url(#colorAdvances)" radius={[6, 6, 6, 6]} maxBarSize={32} />
                  <defs>
                    <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity={1}/>
                    </linearGradient>
                    <linearGradient id="colorAdvances" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#10b981" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card h-full">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-xl font-playfair font-black text-white">Critical Ledger</CardTitle>
              <CardDescription className="text-rose-300/60 font-medium">Trades approaching limit</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {tradesWithWarnings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                     <Building className="h-10 w-10 text-emerald-400 opacity-80" />
                  </div>
                  <p className="text-lg font-playfair font-bold text-white neon-green">Ledger Clear!</p>
                  <p className="text-sm text-emerald-200/60 mt-1">No trades exceed risk thresholds.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {tradesWithWarnings.map(trade => {
                    const project = projects.find(p => p.id === trade.projectId);
                    const percentage = Math.round((trade.totalAdvances / trade.amount) * 100);
                    
                    return (
                      <div key={trade.id} className="flex items-start space-x-4 p-4 bg-white/5 rounded-2xl border border-rose-500/20 shadow-lg hover:bg-white/10 transition-colors duration-300 relative overflow-hidden group">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-400 to-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.8)]"></div>
                        <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20 shrink-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]">
                          <AlertCircle className="h-5 w-5 text-rose-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{trade.designation}</p>
                          <p className="text-xs text-stone-300/60 truncate mb-2">{project?.name || 'Unknown Project'}</p>
                          
                          <div className="w-full bg-black/40 rounded-full h-2 mb-1.5 border border-white/5 overflow-hidden">
                            <div className="bg-gradient-to-r from-rose-600 to-rose-400 h-full rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)]" style={{ width: `${Math.min(100, percentage)}%` }}></div>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs font-black text-rose-400">{percentage}%</span>
                            <span className="text-[10px] text-slate-400 font-medium tracking-wide">€{trade.totalAdvances.toLocaleString()} / €{trade.amount.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
