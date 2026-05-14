import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getProjects, getAllTrades, getAllPayments } from '../services/api';
import { Project, Trade, Payment, PeriodKey } from '../types';
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
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>('1m');

  const getStartDate = (p: PeriodKey) => {
    if (p === 'all') return new Date(0);
    const date = new Date();
    switch (p) {
      case '7d': date.setDate(date.getDate() - 7); break;
      case '14d': date.setDate(date.getDate() - 14); break;
      case '1m': date.setMonth(date.getMonth() - 1); break;
      case '3m': date.setMonth(date.getMonth() - 3); break;
      case '6m': date.setMonth(date.getMonth() - 6); break;
      case '1y': date.setFullYear(date.getFullYear() - 1); break;
    }
    return date;
  };

  useEffect(() => {
    if (!user) return;

    let projectsLoaded = false;
    let tradesLoaded = false;
    let paymentsLoaded = false;

    const checkLoaded = () => {
      if (projectsLoaded && tradesLoaded && paymentsLoaded) setLoading(false);
    };

    const unsubProjects = getProjects(
      user.uid,
      (data) => {
        setProjects(data);
        projectsLoaded = true;
        checkLoaded();
      },
      (error) => { console.error(error); setLoading(false); }
    );

    const unsubTrades = getAllTrades(
      user.uid,
      (data) => {
        setTrades(data);
        tradesLoaded = true;
        checkLoaded();
      },
      (error) => { console.error(error); setLoading(false); }
    );

    const unsubPayments = getAllPayments(
      user.uid,
      (data) => {
        setPayments(data);
        paymentsLoaded = true;
        checkLoaded();
      },
      (error) => { console.error(error); setLoading(false); }
    );

    return () => { unsubProjects(); unsubTrades(); unsubPayments(); };
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

  const safeNum = (v: any) => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  const startDate = getStartDate(period);
  const filteredPayments = payments.filter(p => p.date && p.date >= startDate);

  const globalBudget = Number(trades.reduce((sum, t) => sum + safeNum(t.budget || t.amount), 0).toFixed(2));
  
  // Lifetime Totals (ignores Time Filter)
  const lifetimeAdvances = Number(payments.filter(p => p.type === 'client_advance' || p.type === 'advance' || p.type === 'income').reduce((sum, p) => sum + safeNum(p.amount), 0).toFixed(2));
  const lifetimeExpenses = Number(payments.filter(p => p.type === 'labor_expense' || p.type === 'material_expense' || p.type === 'expense').reduce((sum, p) => sum + safeNum(p.amount), 0).toFixed(2));
  const lifetimeBalance = Number((lifetimeAdvances - lifetimeExpenses).toFixed(2));

  // Period Totals (uses Time Filter)
  const periodAdvances = Number(filteredPayments.filter(p => p.type === 'client_advance' || p.type === 'advance' || p.type === 'income').reduce((sum, p) => sum + safeNum(p.amount), 0).toFixed(2));
  const periodExpenses = Number(filteredPayments.filter(p => p.type === 'labor_expense' || p.type === 'material_expense' || p.type === 'expense').reduce((sum, p) => sum + safeNum(p.amount), 0).toFixed(2));
  const periodCashflow = Number((periodAdvances - periodExpenses).toFixed(2));

  const tradesWithWarnings = trades.filter((t) => {
    const budget = t.budget || t.amount || 0;
    const expenses = (t.totalLaborExpenses || 0) + (t.totalMaterialExpenses || 0);
    return budget > 0 && expenses >= budget * 0.75;
  });

  const projectChartData = projects.map((p) => {
    const pPayments = filteredPayments.filter(pay => pay.projectId === p.id);
    return {
      name: p.name.length > 12 ? p.name.substring(0, 12) + '…' : p.name,
      Advances: pPayments.filter(pay => pay.type === 'client_advance' || pay.type === 'advance' || pay.type === 'income').reduce((sum, pay) => sum + safeNum(pay.amount), 0),
      Expenses: pPayments.filter(pay => pay.type === 'labor_expense' || pay.type === 'material_expense' || pay.type === 'expense').reduce((sum, pay) => sum + safeNum(pay.amount), 0),
    };
  });

  const kpiCards = [
    {
      label: t('dash_kpi_projects'),
      value: totalProjects,
      sub: `${activeProjects} ${t('dash_kpi_active')}`,
      subColor: 'var(--elite-gold)',
      icon: <Building size={16} style={{ color: 'var(--elite-gold)' }} />,
    },
    {
      label: (t as any)('dash_kpi_global_budget') || 'Global Budget',
      value: `€${globalBudget.toLocaleString()}`,
      sub: (t as any)('dash_kpi_allocated_total') || 'Total Allocated',
      subColor: 'var(--elite-gold)',
      icon: <DollarSign size={16} style={{ color: 'var(--elite-gold)' }} />,
    },
    {
      label: (t as any)('dash_kpi_lifetime_balance') || 'Lifetime Balance',
      value: `€${lifetimeBalance.toLocaleString()}`,
      sub: `€${lifetimeExpenses.toLocaleString()} ${(t as any)('dash_kpi_expenses') || 'Expenses'}`,
      subColor: lifetimeBalance < 0 ? '#f87171' : '#34d399',
      icon: <AlertCircle size={16} style={{ color: lifetimeBalance < 0 ? '#f87171' : '#34d399' }} />,
      valueColor: lifetimeBalance < 0 ? '#f87171' : '#34d399',
    },
    {
      label: (t as any)('dash_kpi_period_cashflow') || 'Period Cashflow',
      value: `€${periodCashflow.toLocaleString()}`,
      sub: period === 'all' ? ((t as any)('dash_kpi_all_time') || 'All Time') : `LAST ${period.toUpperCase()}`,
      subColor: periodCashflow < 0 ? '#f87171' : '#34d399',
      icon: <TrendingUp size={16} style={{ color: periodCashflow < 0 ? '#f87171' : '#34d399' }} />,
      valueColor: periodCashflow < 0 ? '#f87171' : '#34d399',
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">

      {/* Header */}
      <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-playfair font-black tracking-[0.05em] text-foreground uppercase mb-2">{t('dash_title')}</h1>
          <p className="elite-text-silver">
            {t('dash_welcome')}, {user?.displayName?.split(' ')[0] || 'User'}. Showing cashflow for the selected period.
          </p>
        </div>
        <div className="flex bg-background/50 border border-border p-1 rounded-xl">
          {(['7d', '14d', '1m', '3m', '6m', '1y', 'all'] as PeriodKey[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                period === p ? 'bg-foreground text-background shadow-md' : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={container} className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {kpiCards.map((card, i) => (
          <motion.div variants={item} key={i}>
            <Card className="elite-card group h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 mb-3" style={{ borderBottom: '1px solid var(--card-border)', padding: '16px 16px 10px' }}>
                <CardTitle className="text-[8px] font-bold uppercase tracking-[0.2em] leading-tight" style={{ color: 'var(--text-silver)' }}>
                  {card.label}
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shrink-0" style={{ border: '1px solid var(--card-border)' }}>
                  {card.icon}
                </div>
              </CardHeader>
              <CardContent style={{ padding: '0 16px 16px' }}>
                <div className="text-2xl md:text-3xl font-playfair font-black tracking-tight" style={{ color: card.valueColor || 'var(--foreground)' }}>
                  {card.value}
                </div>
                <p className="text-[9px] font-bold tracking-wide mt-2 uppercase" style={{ color: card.subColor || 'var(--text-silver)' }}>
                  {card.sub}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Chart + Critical Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="elite-card h-full">
            <CardHeader style={{ borderBottom: '1px solid var(--card-border)', padding: '24px 24px 20px' }}>
              <CardTitle className="text-lg font-playfair font-black text-foreground uppercase tracking-[0.1em]">
                {t('dash_chart_title')}
              </CardTitle>
              <CardDescription className="text-[10px] font-medium tracking-wide mt-1 uppercase">
                {t('dash_chart_sub')}
              </CardDescription>
            </CardHeader>
            <CardContent className="chart-responsive" style={{ padding: '20px 8px 8px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                  <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-silver)' }} dy={14} />
                  <YAxis fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `€${v / 1000}k`} tick={{ fill: 'var(--text-silver)' }} />
                  <Tooltip
                    cursor={{ fill: 'var(--body-bg-start)' }}
                    contentStyle={{
                      backgroundColor: 'var(--glass-bg)',
                      borderRadius: '10px',
                      border: '1px solid var(--card-border)',
                      fontSize: '10px',
                      color: 'var(--foreground)'
                    }}
                  />
                  <Bar dataKey="Advances" fill="var(--elite-gold)" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="Expenses" fill="#f87171" radius={[3, 3, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="elite-card h-full">
            <CardHeader style={{ borderBottom: '1px solid var(--card-border)', padding: '24px 24px 20px' }}>
              <CardTitle className="text-lg font-playfair font-black uppercase tracking-[0.1em]" style={{ color: '#f87171' }}>
                {t('dash_ledger_title')}
              </CardTitle>
              <CardDescription className="text-[10px] font-medium tracking-wide mt-1 uppercase" style={{ color: 'var(--text-silver)' }}>
                {t('dash_ledger_sub')}
              </CardDescription>
            </CardHeader>
            <CardContent style={{ padding: '20px' }}>
              {tradesWithWarnings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <p className="text-sm font-playfair tracking-[0.2em] text-foreground uppercase">{t('dash_ledger_clear')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tradesWithWarnings.map((trade) => {
                    const projectName = projects.find(p => p.id === trade.projectId)?.name || 'Project';
                    return (
                      <div 
                        key={trade.id} 
                        onClick={() => navigate(`/projects/${trade.projectId}?tradeId=${trade.id}`)}
                        className="p-4 rounded-lg bg-background/50 border border-border border-l-[#f87171] border-l-2 cursor-pointer hover:bg-background/80 transition-colors"
                      >
                        <p className="text-[9px] font-bold tracking-widest text-[#f87171] uppercase mb-1">{projectName}</p>
                        <p className="text-[11px] font-bold text-foreground uppercase">{trade.designation}</p>
                        <p className="text-[9px] uppercase tracking-widest mt-1 opacity-40">
                          Exp: €{((trade.totalLaborExpenses || 0) + (trade.totalMaterialExpenses || 0)).toLocaleString()} / Budget: €{(trade.budget || trade.amount || 0).toLocaleString()}
                        </p>
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
