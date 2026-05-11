import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllTrades, getProjects, addPayment, updateTrade, getPayments } from '../services/api';
import { Trade, Project, Payment } from '../types';
import { Building2, Search, Wallet, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ImageUpload } from '../components/ui/ImageUpload';
import { LazyImage } from '../components/ui/LazyImage';
import { checkAndSendAlert } from '../services/email';
import { motion, AnimatePresence } from 'motion/react';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function Suppliers() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [addingPayment, setAddingPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: 0, date: new Date().toISOString().substring(0, 10), designation: '' });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    let tradesLoaded = false;
    let projectsLoaded = false;

    const checkLoading = () => {
      if (tradesLoaded && projectsLoaded) setLoading(false);
    };

    const unsubTrades = getAllTrades(user.uid, (data) => {
      setTrades(data);
      tradesLoaded = true;
      checkLoading();
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    const unsubProjects = getProjects(user.uid, (data) => {
      setProjects(data);
      projectsLoaded = true;
      checkLoading();
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => {
      unsubTrades();
      unsubProjects();
    };
  }, [user]);

  useEffect(() => {
    if (!user || !selectedTrade) return;
    const unsub = getPayments(selectedTrade.projectId, selectedTrade.id, user.uid, setPayments, console.error);
    return () => unsub();
  }, [user, selectedTrade]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTrade) return;
    
    setIsSavingPayment(true);
    try {
      const amount = Number(newPayment.amount);
      
      await addPayment(selectedTrade.projectId, selectedTrade.id, {
        amount,
        date: new Date(newPayment.date),
        type: 'advance',
        designation: newPayment.designation,
        ownerId: user.uid
      }, receiptFile);
      
      await updateTrade(selectedTrade.projectId, selectedTrade.id, {
        totalAdvances: selectedTrade.totalAdvances + amount
      });
      
      await checkAndSendAlert(selectedTrade, amount);
      
      setAddingPayment(false);
      setNewPayment({ amount: 0, date: new Date().toISOString().substring(0, 10), designation: '' });
      setReceiptFile(null);
    } catch (err: any) {
      console.error(err);
      alert('Error recording advance. Make sure Firebase Storage is enabled and rules are configured. Details: ' + err.message);
    } finally {
      setIsSavingPayment(false);
    }
  };

  const suppliers = useMemo(() => {
    const grouped = new Map<string, {
      name: string;
      totalBudget: number;
      totalAdvances: number;
      trades: (Trade & { projectName: string })[];
    }>();

    trades.forEach(trade => {
      const name = trade.supplierName?.trim() || 'Unknown Entity';
      const project = projects.find(p => p.id === trade.projectId);
      
      if (!grouped.has(name)) {
        grouped.set(name, {
          name,
          totalBudget: 0,
          totalAdvances: 0,
          trades: []
        });
      }
      
      const entry = grouped.get(name)!;
      entry.totalBudget += trade.amount || 0;
      entry.totalAdvances += trade.totalAdvances || 0;
      entry.trades.push({
        ...trade,
        projectName: project?.name || 'Unknown Project'
      });
    });

    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [trades, projects]);

  const filteredSuppliers = useMemo(() => {
    if (!search) return suppliers;
    const s = search.toLowerCase();
    return suppliers.filter(sup => sup.name.toLowerCase().includes(s));
  }, [suppliers, search]);

  if (loading) return <div className="p-8 text-center text-[#D4AF37] font-playfair uppercase tracking-widest text-xs">Loading Global Ledger...</div>;

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-10"
    >
      <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/[0.04] pb-6">
        <div>
          <h1 className="text-4xl font-playfair font-black tracking-[0.05em] uppercase text-white mb-2">Global Ledger</h1>
          <p className="elite-text-silver tracking-wide">Manage contractors and track capital distribution</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
          <input 
            type="text" 
            placeholder="SEARCH ENTITIES..." 
            className="w-full pl-8 pr-4 py-3 bg-transparent border-b border-white/20 focus:border-[#D4AF37] text-sm text-white transition-colors outline-none placeholder:text-white/20 uppercase tracking-[0.1em]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </motion.div>

      <motion.div variants={container} className="grid grid-cols-1 gap-8">
        <AnimatePresence>
          {filteredSuppliers.map(supplier => {
            const ratio = supplier.totalBudget > 0 ? supplier.totalAdvances / supplier.totalBudget : 0;
            const isWarning = ratio > 0.75;

            return (
              <motion.div variants={item} key={supplier.name} layout>
                <div className="elite-card overflow-hidden group">
                  <div className="bg-black/40 border-b border-white/[0.04] p-8 md:p-10 relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                      <div className="flex items-center gap-6">
                        <div className="h-16 w-16 rounded border border-white/10 flex items-center justify-center shrink-0 group-hover:border-[#D4AF37]/40 transition-colors duration-700">
                          <Building2 className="h-6 w-6 text-white/20 group-hover:text-[#D4AF37] transition-colors duration-700" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-playfair font-black text-white tracking-[0.05em] uppercase">{supplier.name}</h2>
                          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#D4AF37] mt-2">{supplier.trades.length} Active Allocations</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-10 items-center bg-white/[0.02] p-6 rounded border border-white/[0.04]">
                        <div className="text-right">
                          <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-white/40 mb-2">Global Budget</p>
                          <p className="text-2xl font-playfair font-black text-white">€ {supplier.totalBudget.toLocaleString()}</p>
                        </div>
                        <div className="w-px h-12 bg-white/10"></div>
                        <div className="text-right">
                          <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-white/40 mb-2">Total Advances</p>
                          <p className={`text-2xl font-playfair font-black ${isWarning ? 'text-rose-400' : 'text-[#D4AF37]'}`}>
                            € {supplier.totalAdvances.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-0 bg-transparent">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left border-collapse">
                        <thead className="border-b border-white/[0.04]">
                          <tr>
                            <th className="px-10 py-6 text-[9px] font-bold text-[#D4AF37] uppercase tracking-[0.2em]">Project Origin</th>
                            <th className="px-10 py-6 text-[9px] font-bold text-[#D4AF37] uppercase tracking-[0.2em]">Designation</th>
                            <th className="px-10 py-6 text-[9px] font-bold text-[#D4AF37] uppercase tracking-[0.2em] text-right">Budget</th>
                            <th className="px-10 py-6 text-[9px] font-bold text-[#D4AF37] uppercase tracking-[0.2em] text-right">Advances</th>
                            <th className="px-10 py-6 text-[9px] font-bold text-[#D4AF37] uppercase tracking-[0.2em]">Risk Status</th>
                            <th className="px-10 py-6 text-[9px] font-bold text-[#D4AF37] uppercase tracking-[0.2em] text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {supplier.trades.map((trade) => {
                            const trRatio = trade.amount > 0 ? trade.totalAdvances / trade.amount : 0;
                            const trWarning = trRatio > 0.75;
                            const isExpanded = selectedTrade?.id === trade.id;
                            
                            return (
                              <React.Fragment key={trade.id}>
                                <tr className={`transition-colors duration-500 ${isExpanded ? 'bg-[#D4AF37]/5' : 'hover:bg-white/[0.02]'}`}>
                                  <td className="px-10 py-6 whitespace-nowrap text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">{trade.projectName}</td>
                                  <td className="px-10 py-6 whitespace-nowrap text-lg font-playfair font-black text-white uppercase tracking-[0.05em]">{trade.designation}</td>
                                  <td className="px-10 py-6 whitespace-nowrap text-sm text-white font-bold text-right">€ {trade.amount.toLocaleString()}</td>
                                  <td className="px-10 py-6 whitespace-nowrap text-sm text-[#D4AF37] font-bold text-right">€ {trade.totalAdvances.toLocaleString()}</td>
                                  <td className="px-10 py-6 whitespace-nowrap text-sm">
                                    <div className="flex items-center gap-4">
                                      <div className="w-24 bg-white/5 border border-white/5 h-1 rounded-full overflow-hidden">
                                        <div className={`h-full ${trWarning ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.5)]'}`} style={{ width: `${Math.min(100, trRatio * 100)}%` }}></div>
                                      </div>
                                      <span className={`text-[9px] font-black tracking-widest w-10 ${trWarning ? 'text-rose-400' : 'text-[#D4AF37]'}`}>
                                        {Math.round(trRatio * 100)}%
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-10 py-6 whitespace-nowrap text-right text-sm">
                                    <button className={`px-6 py-2 text-[9px] uppercase tracking-[0.1em] font-bold transition-all border ${isExpanded ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-transparent text-white/40 border-white/10 hover:bg-white/5 hover:text-white hover:border-white/30'}`} onClick={() => setSelectedTrade(isExpanded ? null : trade)}>
                                      {isExpanded ? 'Close Matrix' : 'Manage'}
                                    </button>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr>
                                    <td colSpan={6} className="p-0 border-b-0">
                                      <div className="p-10 bg-black border-y border-[#D4AF37]/30 relative overflow-hidden">
                                        <div className="absolute top-[0%] right-[0%] w-[500px] h-[500px] bg-[#D4AF37]/5 blur-[100px] pointer-events-none" />
                                        
                                        <div className="flex items-center justify-between mb-10 relative z-10">
                                           <div>
                                             <h4 className="font-playfair font-black text-white text-2xl uppercase tracking-[0.05em]">{trade.designation} <span className="text-[#D4AF37]">/</span> Transfers</h4>
                                             <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold mt-2">Originating from {trade.projectName}</p>
                                           </div>
                                           <button onClick={() => setAddingPayment(!addingPayment)} className="bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.2)] px-8 py-4 uppercase text-[10px] tracking-[0.1em] font-bold flex items-center transition-all border border-transparent">
                                             <Plus className="h-4 w-4 mr-2" /> Record Advance
                                           </button>
                                        </div>
                                        
                                        {addingPayment && (
                                           <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} onSubmit={handleAddPayment} className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12 p-8 border border-white/10 rounded-lg bg-black/40 relative z-10">
                                             <div>
                                               <label className="block text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-2">Timestamp</label>
                                               <input type="date" required className="w-full bg-transparent border-b border-white/20 focus:border-[#D4AF37] pb-2 pt-1 text-sm text-white transition-colors outline-none [color-scheme:dark]"
                                                 value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})} />
                                             </div>
                                             <div>
                                               <label className="block text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-2">Amount Transferred</label>
                                               <input type="number" required className="w-full bg-transparent border-b border-white/20 focus:border-[#D4AF37] pb-2 pt-1 text-sm text-white transition-colors outline-none placeholder:text-white/20"
                                                 value={newPayment.amount || ''} onChange={e => setNewPayment({...newPayment, amount: Number(e.target.value)})} placeholder="0" />
                                             </div>
                                             <div>
                                               <label className="block text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-2">Reference Note</label>
                                               <input className="w-full bg-transparent border-b border-white/20 focus:border-[#D4AF37] pb-2 pt-1 text-sm text-white transition-colors outline-none placeholder:text-white/20"
                                                 value={newPayment.designation} onChange={e => setNewPayment({...newPayment, designation: e.target.value})} placeholder="e.g. Invoice #123" />
                                             </div>
                                              <div className="md:col-span-4 mt-4">
                                                <label className="block text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-4">Document Proof (Image Receipt)</label>
                                                <ImageUpload 
                                                  onImageSelected={(file) => setReceiptFile(file)} 
                                                  onClear={() => setReceiptFile(null)} 
                                                  isLoading={isSavingPayment}
                                                />
                                              </div>
                                              <div className="md:col-span-4 flex items-end space-x-6 pt-6 mt-4 border-t border-white/[0.04]">
                                                <button type="submit" disabled={isSavingPayment} className="bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed px-10 py-4 font-bold shadow-[0_0_15px_rgba(255,255,255,0.2)] uppercase tracking-[0.1em] text-[10px] transition-all">
                                                  {isSavingPayment ? 'Processing...' : 'Confirm Transfer'}
                                                </button>
                                                <button type="button" onClick={() => { setAddingPayment(false); setReceiptFile(null); }} disabled={isSavingPayment} className="text-white/40 hover:text-white uppercase tracking-[0.1em] text-[10px] transition-colors pb-3">Cancel</button>
                                              </div>
                                           </motion.form>
                                        )}

                                        <div className="space-y-4 relative z-10">
                                          {payments.length === 0 ? (
                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 text-center py-16 border border-dashed border-white/10 rounded-lg bg-black/20">No transfers recorded in this matrix.</p>
                                          ) : (
                                            payments.map(payment => (
                                              <div key={payment.id} className="flex flex-col p-8 rounded-lg border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                                                <div className="flex justify-between items-start">
                                                  <div className="flex items-center space-x-6">
                                                    <div className="h-12 w-12 rounded bg-black text-[#D4AF37] flex items-center justify-center border border-white/10">
                                                      <Wallet className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                      <p className="text-lg font-playfair font-black text-white uppercase tracking-[0.05em]">Advance Transferred</p>
                                                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#D4AF37] mt-2">{format(payment.date, 'MMM d, yyyy')} {payment.designation ? `// ${payment.designation}` : ''}</p>
                                                    </div>
                                                  </div>
                                                  <span className="font-playfair font-black text-3xl text-white tracking-tight">€ {payment.amount.toLocaleString()}</span>
                                                </div>
                                                {payment.receiptUrl && (
                                                  <div className="mt-6 ml-18 w-48 h-48 rounded overflow-hidden border border-white/10 shadow-xl group relative">
                                                    <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
                                                      <LazyImage src={payment.receiptUrl} alt="Receipt" className="w-full h-full object-cover" />
                                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                                    </a>
                                                  </div>
                                                )}
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredSuppliers.length === 0 && (
          <motion.div variants={item} className="text-center py-32 elite-card border border-dashed border-white/10">
            <div className="mx-auto h-20 w-20 bg-black rounded-full flex items-center justify-center mb-6 border border-white/10">
              <Building2 className="h-8 w-8 text-white/20" />
            </div>
            <h3 className="text-xl font-playfair font-black text-white uppercase tracking-[0.1em]">Entity Not Found</h3>
            <p className="mt-3 text-xs tracking-wide text-white/40">No suppliers match your current matrix parameters.</p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
