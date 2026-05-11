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
    return (
      <div className="flex flex-col justify-center items-center h-full">
        <div className="w-12 h-12 border-t-2 border-[#D4AF37] border-r-2 rounded-full animate-spin mb-4" />
        <span className="elite-text-gold font-playfair uppercase tracking-[0.2em] text-sm animate-pulse">Initializing Matrix...</span>
      </div>
    );
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
          <h1 className="text-4xl font-playfair font-black tracking-[0.05em] text-white uppercase mb-2">Overview</h1>
          <p className="elite-text-silver">Welcome back, {user?.displayName?.split(' ')[0] || 'User'}. Here is your financial summary.</p>
        </div>
        <div className="bg-black/50 border border-white/[0.05] px-5 py-2 rounded-lg backdrop-blur-md">
          <span className="text-xs font-bold text-white/50 uppercase tracking-[0.2em]">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        </div>
      </motion.div>
      
      <motion.div variants={container} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div variants={item}>
          <Card className="elite-card group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10 border-b border-white/[0.04] mb-4">
              <CardTitle className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Projects</CardTitle>
              <div className="w-10 h-10 rounded-lg bg-black border border-white/5 flex items-center justify-center group-hover:border-[#D4AF37]/30 transition-colors duration-500">
                <Building className="h-4 w-4 text-[#D4AF37]" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-playfair font-black text-white tracking-tight">{totalProjects}</div>
              <p className="text-xs text-[#D4AF37]/80 font-medium tracking-wide mt-2">{activeProjects} ACTIVE</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="elite-card group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10 border-b border-white/[0.04] mb-4">
              <CardTitle className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Global Budget</CardTitle>
              <div className="w-10 h-10 rounded-lg bg-black border border-white/5 flex items-center justify-center group-hover:border-[#D4AF37]/30 transition-colors duration-500">
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl lg:text-4xl font-playfair font-black text-white tracking-tight">€{totalBudget.toLocaleString()}</div>
              <p className="text-xs text-emerald-500/80 font-medium tracking-wide mt-2">TOTAL ALLOCATED</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="elite-card group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10 border-b border-white/[0.04] mb-4">
              <CardTitle className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Total Advances</CardTitle>
              <div className="w-10 h-10 rounded-lg bg-black border border-white/5 flex items-center justify-center group-hover:border-[#D4AF37]/30 transition-colors duration-500">
                <TrendingUp className="h-4 w-4 text-white/60" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl lg:text-4xl font-playfair font-black text-white tracking-tight">€{totalAdvances.toLocaleString()}</div>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex-1 bg-black h-1 rounded-full overflow-hidden border border-white/5">
                  <div className="bg-gradient-to-r from-white/20 to-white/60 h-full rounded-full" style={{ width: `${Math.min(100, (totalAdvances / (totalBudget || 1)) * 100)}%` }} />
                </div>
                <p className="text-[10px] text-white/60 font-bold w-8 text-right tracking-widest">
                  {totalBudget > 0 ? Math.round((totalAdvances / totalBudget) * 100) : 0}%
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="elite-card group border-rose-900/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10 border-b border-white/[0.04] mb-4">
              <CardTitle className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Risk Alerts</CardTitle>
              <div className="w-10 h-10 rounded-lg bg-black border border-white/5 flex items-center justify-center group-hover:border-rose-500/30 transition-colors duration-500">
                <AlertCircle className="h-4 w-4 text-rose-500" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-playfair font-black text-rose-500 tracking-tight">{tradesWithWarnings.length}</div>
              <p className="text-xs text-rose-500/80 font-medium tracking-wide mt-2">ADVANCES &gt; 75%</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 pb-6">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="elite-card h-full">
            <CardHeader className="border-b border-white/[0.04] pb-5">
              <CardTitle className="text-lg font-playfair font-black text-white uppercase tracking-[0.1em]">Financial Matrix</CardTitle>
              <CardDescription className="text-white/40 text-xs font-medium tracking-wide mt-1">BUDGET VS ADVANCES TRACKING ACROSS ACTIVE PROJECTS</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px] pt-8">
              <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
                <BarChart data={projectChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.02)" />
                  <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} tick={{fill: 'rgba(255,255,255,0.4)'}} dy={15} />
                  <YAxis fontSize={9} tickLine={false} axisLine={false} tickFormatter={(value) => `€${value / 1000}k`} tick={{fill: 'rgba(255,255,255,0.4)'}} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.02)'}} 
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                      backdropFilter: 'blur(20px)', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(255,255,255,0.05)', 
                      padding: '12px',
                      color: 'white',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em'
                    }} 
                  />
                  <Legend iconType="circle" wrapperStyle={{fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', paddingTop: '30px'}} />
                  <Bar dataKey="Budget" fill="url(#colorBudget)" radius={[2, 2, 0, 0]} maxBarSize={20} />
                  <Bar dataKey="Advances" fill="url(#colorAdvances)" radius={[2, 2, 0, 0]} maxBarSize={20} />
                  <defs>
                    <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4A4A4A" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#1A1A1A" stopOpacity={1}/>
                    </linearGradient>
                    <linearGradient id="colorAdvances" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4AF37" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#8C6D1F" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="elite-card h-full">
            <CardHeader className="border-b border-white/[0.04] pb-5">
              <CardTitle className="text-lg font-playfair font-black text-rose-500 uppercase tracking-[0.1em]">Critical Ledger</CardTitle>
              <CardDescription className="text-white/40 text-xs font-medium tracking-wide mt-1">TRADES APPROACHING LIMIT</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {tradesWithWarnings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-black border border-white/10 rounded-full flex items-center justify-center mb-6">
                     <Building className="h-6 w-6 text-emerald-500 opacity-60" />
                  </div>
                  <p className="text-sm font-playfair tracking-[0.2em] text-white uppercase">Ledger Clear</p>
                  <p className="text-[10px] text-white/40 mt-2 uppercase tracking-widest">No trades exceed risk thresholds</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {tradesWithWarnings.map(trade => {
                    const project = projects.find(p => p.id === trade.projectId);
                    const percentage = Math.round((trade.totalAdvances / trade.amount) * 100);
                    
                    return (
                      <div key={trade.id} className="flex flex-col p-4 bg-black border border-white/[0.04] rounded-lg relative overflow-hidden group">
                        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-rose-600"></div>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-xs font-bold text-white uppercase tracking-wider">{trade.designation}</p>
                            <p className="text-[9px] text-white/40 uppercase tracking-[0.2em] mt-1">{project?.name || 'Unknown Project'}</p>
                          </div>
                          <AlertCircle className="h-4 w-4 text-rose-500 opacity-80" />
                        </div>
                        
                        <div className="w-full bg-white/5 rounded-full h-1 mb-2">
                          <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, percentage)}%` }}></div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-rose-500 tracking-widest">{percentage}%</span>
                          <span className="text-[9px] text-white/40 font-medium tracking-widest">€{trade.totalAdvances.toLocaleString()} / €{trade.amount.toLocaleString()}</span>
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
