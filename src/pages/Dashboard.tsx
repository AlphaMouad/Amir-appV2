import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getProjects, getAllTrades } from '../services/api';
import { Project, Trade } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { AlertCircle, TrendingUp, Building, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 26 } },
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

    const unsubProjects = getProjects(
      user.uid,
      (data) => {
        setProjects(data);
        projectsLoaded = true;
        if (tradesLoaded) setLoading(false);
      },
      (error) => { console.error(error); setLoading(false); }
    );

    const unsubTrades = getAllTrades(
      user.uid,
      (data) => {
        setTrades(data);
        tradesLoaded = true;
        if (projectsLoaded) setLoading(false);
      },
      (error) => { console.error(error); setLoading(false); }
    );

    return () => { unsubProjects(); unsubTrades(); };
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-5">
        <div className="w-10 h-10 border-t-2 border-r-2 border-[#D4AF37] rounded-full animate-spin" />
        <span className="font-playfair text-[10px] uppercase tracking-[0.3em] animate-pulse-soft" style={{ color: 'rgba(212,175,55,0.5)' }}>
          Initializing Matrix...
        </span>
      </div>
    );
  }

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === 'ongoing').length;
  const totalBudget = trades.reduce((sum, t) => sum + t.amount, 0);
  const totalAdvances = trades.reduce((sum, t) => sum + t.totalAdvances, 0);
  const tradesWithWarnings = trades.filter((t) => t.amount > 0 && t.totalAdvances / t.amount > 0.75);
  const utilizationPct = totalBudget > 0 ? Math.round((totalAdvances / totalBudget) * 100) : 0;

  const projectChartData = projects.map((p) => {
    const projectTrades = trades.filter((t) => t.projectId === p.id);
    return {
      name: p.name.length > 12 ? p.name.substring(0, 12) + '…' : p.name,
      Budget: projectTrades.reduce((sum, t) => sum + t.amount, 0),
      Advances: projectTrades.reduce((sum, t) => sum + t.totalAdvances, 0),
    };
  });

  const kpiCards = [
    {
      label: 'Projects',
      value: totalProjects,
      sub: `${activeProjects} Active`,
      subColor: '#D4AF37',
      icon: <Building size={16} style={{ color: '#D4AF37' }} />,
      accentHover: 'rgba(212,175,55,0.28)',
    },
    {
      label: 'Global Budget',
      value: `€${totalBudget.toLocaleString()}`,
      sub: 'Total Allocated',
      subColor: '#34d399',
      icon: <DollarSign size={16} style={{ color: '#34d399' }} />,
      accentHover: 'rgba(52,211,153,0.28)',
    },
    {
      label: 'Total Advances',
      value: `€${totalAdvances.toLocaleString()}`,
      sub: null,
      subColor: null,
      icon: <TrendingUp size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />,
      progress: utilizationPct,
      accentHover: 'rgba(255,255,255,0.15)',
    },
    {
      label: 'Risk Alerts',
      value: tradesWithWarnings.length,
      sub: 'Advances > 75%',
      subColor: '#f87171',
      icon: <AlertCircle size={16} style={{ color: '#f87171' }} />,
      valueColor: tradesWithWarnings.length > 0 ? '#f87171' : 'white',
      accentHover: 'rgba(248,113,113,0.25)',
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">

      {/* Header */}
      <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-playfair font-black tracking-[0.05em] text-white uppercase mb-2">Overview</h1>
          <p className="elite-text-silver">
            Welcome back, {user?.displayName?.split(' ')[0] || 'User'}. Here is your financial summary.
          </p>
        </div>
        <div
          className="px-5 py-2 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={container} className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {kpiCards.map((card, i) => (
          <motion.div variants={item} key={i}>
            <Card className="elite-card group h-full">
              <CardHeader
                className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10 mb-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '20px 20px 12px' }}
              >
                <CardTitle className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.38)' }}>
                  {card.label}
                </CardTitle>
                <div
                  className="w-9 h-9 rounded-lg bg-black flex items-center justify-center transition-colors duration-400 group-hover:border-opacity-40"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {card.icon}
                </div>
              </CardHeader>
              <CardContent className="relative z-10" style={{ padding: '0 20px 20px' }}>
                <div
                  className="text-3xl md:text-4xl font-playfair font-black tracking-tight"
                  style={{ color: card.valueColor || 'white' }}
                >
                  {card.value}
                </div>
                {card.sub && (
                  <p className="text-[10px] font-bold tracking-wide mt-2 uppercase" style={{ color: card.subColor || 'rgba(255,255,255,0.4)' }}>
                    {card.sub}
                  </p>
                )}
                {card.progress !== undefined && (
                  <div className="mt-3">
                    <div className="elite-progress-track">
                      <div
                        className={card.progress > 75 ? 'elite-progress-fill-danger' : 'elite-progress-fill-gold'}
                        style={{ width: `${Math.min(100, card.progress)}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-black mt-1.5 tracking-widest" style={{ color: card.progress > 75 ? '#f87171' : '#D4AF37' }}>
                      {card.progress}%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Chart + Critical Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="elite-card h-full">
            <CardHeader style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '24px 24px 20px' }}>
              <CardTitle className="text-lg font-playfair font-black text-white uppercase tracking-[0.1em]">
                Financial Matrix
              </CardTitle>
              <CardDescription className="text-[10px] font-medium tracking-wide mt-1 uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Budget vs Advances tracking across active projects
              </CardDescription>
            </CardHeader>
            <CardContent style={{ height: 340, padding: '28px 12px 12px' }}>
              {projectChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    No project data yet
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.025)" />
                    <XAxis
                      dataKey="name"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat', fontWeight: 600 }}
                      dy={14}
                    />
                    <YAxis
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `€${v / 1000}k`}
                      tick={{ fill: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat', fontWeight: 600 }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.015)' }}
                      contentStyle={{
                        backgroundColor: 'rgba(5,5,5,0.96)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.07)',
                        padding: '10px 14px',
                        color: 'white',
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        fontFamily: 'Montserrat',
                      }}
                      labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}
                    />
                    <defs>
                      <linearGradient id="gradBudget" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3a3a3a" />
                        <stop offset="100%" stopColor="#181818" />
                      </linearGradient>
                      <linearGradient id="gradAdvances" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D4AF37" />
                        <stop offset="100%" stopColor="#8C6D1F" />
                      </linearGradient>
                    </defs>
                    <Bar dataKey="Budget" fill="url(#gradBudget)" radius={[3, 3, 0, 0]} maxBarSize={22} />
                    <Bar dataKey="Advances" fill="url(#gradAdvances)" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="elite-card h-full">
            <CardHeader style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '24px 24px 20px' }}>
              <CardTitle className="text-lg font-playfair font-black uppercase tracking-[0.1em]" style={{ color: '#f87171' }}>
                Critical Ledger
              </CardTitle>
              <CardDescription className="text-[10px] font-medium tracking-wide mt-1 uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Trades approaching limit
              </CardDescription>
            </CardHeader>
            <CardContent style={{ padding: '20px 20px' }}>
              {tradesWithWarnings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
                    style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <Building size={22} style={{ color: 'rgba(52,211,153,0.55)' }} />
                  </div>
                  <p className="text-sm font-playfair tracking-[0.2em] text-white uppercase">Ledger Clear</p>
                  <p className="text-[9px] mt-2 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    No trades exceed risk thresholds
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {tradesWithWarnings.map((trade) => {
                    const project = projects.find((p) => p.id === trade.projectId);
                    const percentage = Math.round((trade.totalAdvances / trade.amount) * 100);
                    return (
                      <div
                        key={trade.id}
                        className="flex flex-col p-4 rounded-lg relative overflow-hidden"
                        style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.04)', borderLeft: '2px solid #f43f5e' }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-[11px] font-bold text-white uppercase tracking-wider">{trade.designation}</p>
                            <p className="text-[9px] uppercase tracking-[0.2em] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                              {project?.name || 'Unknown'}
                            </p>
                          </div>
                          <AlertCircle size={14} style={{ color: '#f87171', opacity: 0.8 }} />
                        </div>
                        <div className="elite-progress-track mb-2">
                          <div className="elite-progress-fill-danger" style={{ width: `${Math.min(100, percentage)}%` }} />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black tracking-widest" style={{ color: '#f87171' }}>{percentage}%</span>
                          <span className="text-[9px] font-medium tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            €{trade.totalAdvances.toLocaleString()} / €{trade.amount.toLocaleString()}
                          </span>
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
