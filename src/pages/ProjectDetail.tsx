import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getProjects, getTrades, addTrade, updateTrade, getPayments, addPayment } from '../services/api';
import { Project, Trade, Payment } from '../types';
import { ArrowLeft, Plus, AlertCircle, Wallet, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { ImageUpload } from '../components/ui/ImageUpload';
import { LazyImage } from '../components/ui/LazyImage';
import { checkAndSendAlert } from '../services/email';
import { motion } from 'motion/react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 26 } },
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [addingTrade, setAddingTrade] = useState(false);
  const [newTrade, setNewTrade] = useState({ designation: '', amount: 0, supplierName: '', quantity: 1 });
  const [isSavingTrade, setIsSavingTrade] = useState(false);

  const [addingPayment, setAddingPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: 0, date: new Date().toISOString().substring(0, 10), designation: '' });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    const unsubP = getProjects(user.uid, (projs) => {
      const p = projs.find((x) => x.id === id);
      if (p) setProject(p);
    }, console.error);
    const unsubT = getTrades(id, user.uid, setTrades, console.error);
    return () => { unsubP(); unsubT(); };
  }, [user, id]);

  // Keep selectedTrade in sync when trades update (e.g. after a payment)
  useEffect(() => {
    if (selectedTrade) {
      const fresh = trades.find((t) => t.id === selectedTrade.id);
      if (fresh) setSelectedTrade(fresh);
    }
  }, [trades]);

  useEffect(() => {
    if (!user || !id || !selectedTrade) return;
    const unsub = getPayments(id, selectedTrade.id, user.uid, setPayments, console.error);
    return () => unsub();
  }, [user, id, selectedTrade]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-t-2 border-r-2 border-[#D4AF37] rounded-full animate-spin" />
          <span className="font-playfair text-[10px] uppercase tracking-[0.3em] animate-pulse-soft" style={{ color: 'rgba(212,175,55,0.5)' }}>
            Loading...
          </span>
        </div>
      </div>
    );
  }

  const totalBudget = trades.reduce((sum, t) => sum + t.amount, 0);
  const totalAdvances = trades.reduce((sum, t) => sum + t.totalAdvances, 0);

  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !newTrade.designation) return;
    setIsSavingTrade(true);
    try {
      await addTrade(id, {
        designation: newTrade.designation,
        amount: Number(newTrade.amount),
        quantity: Number(newTrade.quantity),
        supplierName: newTrade.supplierName,
        totalAdvances: 0,
        ownerId: user.uid,
      });
      setAddingTrade(false);
      setNewTrade({ designation: '', amount: 0, supplierName: '', quantity: 1 });
    } catch (err: any) {
      console.error(err);
      alert('Error creating trade: ' + err.message);
    } finally {
      setIsSavingTrade(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !selectedTrade) return;
    setIsSavingPayment(true);
    try {
      const amount = Number(newPayment.amount);
      await addPayment(id, selectedTrade.id, {
        amount,
        date: new Date(newPayment.date),
        type: 'advance',
        designation: newPayment.designation,
        ownerId: user.uid,
      }, receiptFile);
      await updateTrade(id, selectedTrade.id, { totalAdvances: selectedTrade.totalAdvances + amount });
      await checkAndSendAlert(selectedTrade, amount);
      setAddingPayment(false);
      setNewPayment({ amount: 0, date: new Date().toISOString().substring(0, 10), designation: '' });
      setReceiptFile(null);
    } catch (err: any) {
      console.error(err);
      alert('Error recording advance. Details: ' + err.message);
    } finally {
      setIsSavingPayment(false);
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-10">

      {/* Header */}
      <motion.div
        variants={item}
        className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-center gap-5">
          <Link to="/projects">
            <button
              className="h-11 w-11 rounded-full flex items-center justify-center transition-colors duration-200"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.35)'; e.currentTarget.style.color = '#D4AF37'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
            >
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl md:text-4xl font-playfair font-black text-white uppercase tracking-[0.05em]">
              {project.name}
            </h1>
            <p className="text-[10px] font-medium mt-2 uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Client: <span style={{ color: '#D4AF37' }}>{project.clientName}</span>
              {project.contractorName && (
                <span style={{ color: 'rgba(255,255,255,0.35)' }}> &nbsp;·&nbsp; Contractor: {project.contractorName}</span>
              )}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={container} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <motion.div variants={item}>
          <div className="elite-card p-7 relative overflow-hidden group">
            <div className="pb-3 mb-5 relative z-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <h3 className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.38)' }}>
                Project Budget
              </h3>
            </div>
            <div className="relative z-10">
              <div className="text-3xl md:text-4xl font-playfair font-black text-white tracking-tight">
                € {totalBudget.toLocaleString()}
              </div>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-600 pointer-events-none rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.04) 0%, transparent 60%)' }} />
          </div>
        </motion.div>

        <motion.div variants={item}>
          <div className="elite-card p-7 relative overflow-hidden group">
            <div className="pb-3 mb-5 relative z-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <h3 className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.38)' }}>
                Advances Paid
              </h3>
            </div>
            <div className="relative z-10">
              <div className="text-3xl md:text-4xl font-playfair font-black tracking-tight" style={{ color: '#D4AF37', textShadow: '0 0 15px rgba(212,175,55,0.2)' }}>
                € {totalAdvances.toLocaleString()}
              </div>
              <div className="flex items-center gap-4 mt-5">
                <div className="flex-1 elite-progress-track">
                  <div
                    className={totalBudget > 0 && totalAdvances / totalBudget > 0.75 ? 'elite-progress-fill-danger' : 'elite-progress-fill-gold'}
                    style={{ width: `${Math.min(100, (totalAdvances / (totalBudget || 1)) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] font-black tracking-widest w-11 text-right" style={{ color: '#D4AF37' }}>
                  {totalBudget > 0 ? ((totalAdvances / totalBudget) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-600 pointer-events-none rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.03) 0%, transparent 60%)' }} />
          </div>
        </motion.div>
      </motion.div>

      {/* Trades Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-playfair font-black text-white uppercase tracking-[0.1em]">Ledger Matrix</h2>
        <button
          onClick={() => setAddingTrade(!addingTrade)}
          className="elite-button px-7 py-3 flex items-center gap-2 uppercase tracking-[0.1em] text-[10px]"
        >
          <Plus size={14} /> Initialize Trade
        </button>
      </motion.div>

      {/* Add Trade Form */}
      {addingTrade && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
          <div
            className="elite-card p-7 md:p-10 relative overflow-hidden mb-2"
            style={{ border: '1px solid rgba(212,175,55,0.18)' }}
          >
            <div className="absolute top-[-50px] right-[-50px] w-64 h-64 rounded-full pointer-events-none" style={{ background: 'rgba(212,175,55,0.05)', filter: 'blur(80px)' }} />
            <div className="relative z-10">
              <form onSubmit={handleAddTrade} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                    Designation
                  </label>
                  <input required placeholder="e.g. Travaux Plombier" className="elite-input"
                    value={newTrade.designation} onChange={(e) => setNewTrade({ ...newTrade, designation: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                    Supplier Entity
                  </label>
                  <input placeholder="Supplier Name" className="elite-input"
                    value={newTrade.supplierName} onChange={(e) => setNewTrade({ ...newTrade, supplierName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                    Budget Allocation
                  </label>
                  <input type="number" required placeholder="0" className="elite-input"
                    value={newTrade.amount || ''} onChange={(e) => setNewTrade({ ...newTrade, amount: Number(e.target.value) })} />
                </div>
                <div className="flex items-end gap-5 pb-0.5">
                  <button
                    type="submit"
                    disabled={isSavingTrade}
                    className="elite-button px-8 py-3 uppercase text-[10px] tracking-[0.1em] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSavingTrade ? 'Saving...' : 'Deploy'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingTrade(false)}
                    disabled={isSavingTrade}
                    className="text-[10px] uppercase tracking-[0.1em] transition-colors hover:text-white pb-0.5 disabled:opacity-40"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      )}

      {/* Mobile Trades List */}
      <div className="md:hidden space-y-3">
        {trades.length === 0 ? (
          <div
            className="elite-card text-center py-14 text-[10px] uppercase tracking-[0.2em] font-bold"
            style={{ border: '1px dashed rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}
          >
            No trades initialized yet.
          </div>
        ) : (
          trades.map((trade) => {
            const ratio = trade.amount > 0 ? trade.totalAdvances / trade.amount : 0;
            const isWarning = ratio > 0.75;
            const isSelected = selectedTrade?.id === trade.id;

            return (
              <div
                key={trade.id}
                className="elite-card p-5 flex flex-col gap-4 relative overflow-hidden"
                style={isSelected ? { border: '1px solid rgba(212,175,55,0.4)', boxShadow: '0 0 24px rgba(212,175,55,0.1)' } : {}}
              >
                {isWarning && <div className="absolute top-0 left-0 bottom-0 w-[3px] rounded-l-xl" style={{ background: '#f43f5e' }} />}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-playfair font-black text-white text-[1.05rem] uppercase tracking-[0.04em]">{trade.designation}</h3>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] mt-1" style={{ color: '#D4AF37' }}>
                      {trade.supplierName || 'Unknown Entity'}
                    </p>
                  </div>
                  <button
                    className="px-3.5 py-1.5 text-[9px] uppercase tracking-[0.1em] font-bold rounded-lg transition-all duration-200"
                    style={isSelected
                      ? { background: '#D4AF37', color: '#000', border: '1px solid #D4AF37' }
                      : { background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
                    }
                    onClick={() => setSelectedTrade(isSelected ? null : trade)}
                  >
                    {isSelected ? 'Close' : 'Manage'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-lg p-4" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: 'rgba(255,255,255,0.38)' }}>Budget</p>
                    <p className="font-bold text-white text-sm">€ {trade.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: 'rgba(255,255,255,0.38)' }}>Advances</p>
                    <p className="font-bold text-sm" style={{ color: '#D4AF37' }}>€ {trade.totalAdvances.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 elite-progress-track">
                    <div
                      className={isWarning ? 'elite-progress-fill-danger' : 'elite-progress-fill-gold'}
                      style={{ width: `${Math.min(100, ratio * 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-black w-10 text-right tracking-widest" style={{ color: isWarning ? '#f87171' : '#D4AF37' }}>
                    {Math.round(ratio * 100)}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Trades Table */}
      <motion.div variants={item} className="hidden md:flex elite-card overflow-hidden flex-col">
        <div className="px-8 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.3)' }}>
          <h3 className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.35)' }}>Financial Ledger by Trade</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {['Designation', 'Supplier Entity', 'Budget', 'Advances', 'Risk Level', 'Actions'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-7 py-5 text-[9px] font-bold uppercase tracking-[0.22em] ${i >= 2 && i <= 3 ? 'text-right' : ''}`}
                    style={{ color: '#D4AF37' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    No trades initialized in ledger.
                  </td>
                </tr>
              ) : (
                trades.map((trade) => {
                  const ratio = trade.amount > 0 ? trade.totalAdvances / trade.amount : 0;
                  const isWarning = ratio > 0.75;
                  const isSelected = selectedTrade?.id === trade.id;

                  return (
                    <tr
                      key={trade.id}
                      className="transition-colors duration-300"
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        background: isSelected
                          ? 'rgba(212,175,55,0.04)'
                          : isWarning
                          ? 'rgba(244,63,94,0.02)'
                          : 'transparent',
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.015)'; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = isWarning ? 'rgba(244,63,94,0.02)' : 'transparent'; }}
                    >
                      <td className="px-7 py-5 whitespace-nowrap font-playfair font-black text-[1.05rem] text-white uppercase tracking-[0.04em]">
                        {isWarning && <AlertCircle size={12} className="inline mr-2 mb-0.5" style={{ color: '#f87171' }} />}
                        {trade.designation}
                      </td>
                      <td className="px-7 py-5 whitespace-nowrap text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.38)' }}>
                        {trade.supplierName || '—'}
                      </td>
                      <td className="px-7 py-5 whitespace-nowrap text-sm font-bold text-white text-right">
                        € {trade.amount.toLocaleString()}
                      </td>
                      <td className="px-7 py-5 whitespace-nowrap text-sm font-bold text-right" style={{ color: '#D4AF37' }}>
                        € {trade.totalAdvances.toLocaleString()}
                      </td>
                      <td className="px-7 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-24 elite-progress-track">
                            <div
                              className={isWarning ? 'elite-progress-fill-danger' : 'elite-progress-fill-gold'}
                              style={{ width: `${Math.min(100, ratio * 100)}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-black w-9 tracking-widest" style={{ color: isWarning ? '#f87171' : '#D4AF37' }}>
                            {Math.round(ratio * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-7 py-5 whitespace-nowrap text-right">
                        <button
                          className="px-5 py-2 text-[9px] uppercase tracking-[0.1em] font-bold transition-all duration-200 rounded-lg"
                          style={isSelected
                            ? { background: '#D4AF37', color: '#000', border: '1px solid #D4AF37', boxShadow: '0 0 15px rgba(212,175,55,0.35)' }
                            : { background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
                          }
                          onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; } }}
                          onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; } }}
                          onClick={() => setSelectedTrade(isSelected ? null : trade)}
                        >
                          {isSelected ? 'Close' : 'Manage'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Payment Panel */}
      {selectedTrade && (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <div
            className="elite-card relative overflow-hidden"
            style={{ border: '1px solid rgba(212,175,55,0.25)', boxShadow: '0 0 40px rgba(212,175,55,0.08)' }}
          >
            <div
              className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
              style={{ background: 'rgba(212,175,55,0.04)', filter: 'blur(120px)' }}
            />

            {/* Panel header */}
            <div
              className="px-7 md:px-10 py-7 relative z-10"
              style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-center gap-5">
                  <div
                    className="w-12 h-12 rounded-xl bg-black flex items-center justify-center shrink-0"
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <Wallet size={20} style={{ color: '#D4AF37' }} />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-playfair font-black text-white uppercase tracking-[0.04em]">
                      {selectedTrade.designation}
                    </h2>
                    <p className="text-[9px] uppercase tracking-[0.2em] font-bold mt-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Payment Records · Advance History
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAddingPayment(!addingPayment)}
                  className="flex items-center gap-2.5 px-7 py-3.5 font-bold text-[10px] uppercase tracking-[0.12em] rounded-xl transition-all duration-200"
                  style={{ background: 'white', color: '#000', boxShadow: '0 0 20px rgba(255,255,255,0.15)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
                >
                  <Plus size={14} /> Record Advance
                </button>
              </div>
            </div>

            <div className="px-7 md:px-10 py-8 relative z-10">
              {/* Add Payment Form */}
              {addingPayment && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  onSubmit={handleAddPayment}
                  className="grid grid-cols-1 md:grid-cols-3 gap-7 mb-10 p-7 rounded-xl"
                  style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.4)' }}
                >
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                      Date
                    </label>
                    <input type="date" required className="elite-input [color-scheme:dark]"
                      value={newPayment.date} onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                      Amount Transferred
                    </label>
                    <input type="number" required placeholder="0" className="elite-input"
                      value={newPayment.amount || ''} onChange={(e) => setNewPayment({ ...newPayment, amount: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                      Reference Note
                    </label>
                    <input placeholder="e.g. Invoice #123" className="elite-input"
                      value={newPayment.designation} onChange={(e) => setNewPayment({ ...newPayment, designation: e.target.value })} />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-3" style={{ color: 'rgba(255,255,255,0.38)' }}>
                      Document Proof
                    </label>
                    <ImageUpload onImageSelected={(f) => setReceiptFile(f)} onClear={() => setReceiptFile(null)} isLoading={isSavingPayment} />
                  </div>
                  <div className="md:col-span-3 flex items-center gap-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button
                      type="submit"
                      disabled={isSavingPayment}
                      className="flex items-center gap-2.5 px-9 py-3.5 font-bold text-[10px] uppercase tracking-[0.12em] rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'white', color: '#000', boxShadow: '0 0 16px rgba(255,255,255,0.12)' }}
                    >
                      {isSavingPayment ? 'Processing...' : 'Confirm Transfer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAddingPayment(false); setReceiptFile(null); }}
                      disabled={isSavingPayment}
                      className="text-[10px] uppercase tracking-[0.1em] transition-colors hover:text-white"
                      style={{ color: 'rgba(255,255,255,0.35)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </motion.form>
              )}

              {/* Payment List */}
              <div className="space-y-4">
                {payments.length === 0 ? (
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.22em] text-center py-14 rounded-xl"
                    style={{ color: 'rgba(255,255,255,0.3)', border: '1px dashed rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}
                  >
                    No transfers recorded.
                  </p>
                ) : (
                  payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex flex-col p-6 rounded-xl transition-colors duration-200"
                      style={{ border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.01)'; }}
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div className="flex items-center gap-5">
                          <div
                            className="h-11 w-11 rounded-xl bg-black flex items-center justify-center shrink-0"
                            style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#D4AF37' }}
                          >
                            <Wallet size={18} />
                          </div>
                          <div>
                            <p className="text-[1rem] font-playfair font-black text-white uppercase tracking-[0.04em]">
                              Advance Transferred
                            </p>
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mt-1.5" style={{ color: '#D4AF37' }}>
                              {format(payment.date, 'MMM d, yyyy')}
                              {payment.designation && <span style={{ color: 'rgba(255,255,255,0.4)' }}> · {payment.designation}</span>}
                            </p>
                          </div>
                        </div>
                        <span className="font-playfair font-black text-2xl text-white tracking-tight">
                          € {payment.amount.toLocaleString()}
                        </span>
                      </div>
                      {payment.receiptUrl && (
                        <div className="mt-5 w-44 h-44 rounded-xl overflow-hidden group relative" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                          <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
                            <LazyImage src={payment.receiptUrl} alt="Receipt" className="w-full h-full" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
