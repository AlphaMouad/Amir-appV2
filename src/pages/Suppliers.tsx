import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllTrades, getProjects, addPayment, updateTrade, getPayments } from '../services/api';
import { Trade, Project, Payment } from '../types';
import { Building2, Search, Wallet, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
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

  if (loading) return <div className="p-8 text-center text-indigo-400 font-outfit">Loading Global Ledger...</div>;

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-10"
    >
      <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-4xl font-outfit font-black tracking-tight text-white mb-2">Global Ledger</h1>
          <p className="text-indigo-200/60 font-medium">Manage contractors and track capital distribution</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search entities..." 
            className="w-full pl-11 pr-4 py-3 bg-black/40 backdrop-blur-md border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm text-white transition-all outline-none placeholder:text-slate-600 shadow-inner"
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
                <Card className="glass-card overflow-hidden group border-white/10">
                  <div className="bg-black/20 backdrop-blur-xl border-b border-white/5 p-6 md:p-8 relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(79,70,229,0.15)] group-hover:scale-110 group-hover:bg-indigo-500/30 transition-all duration-500">
                          <Building2 className="h-8 w-8 text-indigo-400 group-hover:text-white transition-colors" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-outfit font-black text-white tracking-tight">{supplier.name}</h2>
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-200/60 mt-1">{supplier.trades.length} Active Allocations</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-8 items-center bg-black/20 p-4 rounded-2xl border border-white/5">
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-1">Global Budget</p>
                          <p className="text-xl font-outfit font-black text-white">€ {supplier.totalBudget.toLocaleString()}</p>
                        </div>
                        <div className="w-px h-10 bg-white/10"></div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-1">Total Advances</p>
                          <p className={`text-xl font-outfit font-black drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] ${isWarning ? 'text-rose-400' : 'text-emerald-400'}`}>
                            € {supplier.totalAdvances.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left border-collapse">
                        <thead className="bg-white/5 border-b border-white/5">
                          <tr>
                            <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Project Origin</th>
                            <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Designation</th>
                            <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right">Budget</th>
                            <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right">Advances</th>
                            <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Risk Status</th>
                            <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-medium text-sm bg-black/10">
                          {supplier.trades.map((trade) => {
                            const trRatio = trade.amount > 0 ? trade.totalAdvances / trade.amount : 0;
                            const trWarning = trRatio > 0.75;
                            const isExpanded = selectedTrade?.id === trade.id;
                            
                            return (
                              <React.Fragment key={trade.id}>
                                <tr className={`transition-colors duration-300 ${isExpanded ? 'bg-indigo-500/10' : 'hover:bg-white/5'}`}>
                                  <td className="px-8 py-5 whitespace-nowrap text-sm text-indigo-200/60 font-medium tracking-wide">{trade.projectName}</td>
                                  <td className="px-8 py-5 whitespace-nowrap text-sm font-outfit font-bold text-white text-base">{trade.designation}</td>
                                  <td className="px-8 py-5 whitespace-nowrap text-sm text-white font-bold text-right">€ {trade.amount.toLocaleString()}</td>
                                  <td className="px-8 py-5 whitespace-nowrap text-sm text-slate-300 text-right">€ {trade.totalAdvances.toLocaleString()}</td>
                                  <td className="px-8 py-5 whitespace-nowrap text-sm">
                                    <div className="flex items-center gap-3">
                                      <div className="w-20 bg-white/5 border border-white/5 h-1.5 rounded-full overflow-hidden shadow-inner">
                                        <div className={`h-full shadow-[0_0_8px_rgba(0,0,0,0.5)] ${trWarning ? 'bg-gradient-to-r from-rose-600 to-rose-400' : 'bg-gradient-to-r from-indigo-600 to-indigo-400'}`} style={{ width: `${Math.min(100, trRatio * 100)}%` }}></div>
                                      </div>
                                      <span className={`text-[10px] font-bold tracking-wider ${trWarning ? 'text-rose-400' : 'text-slate-400'}`}>
                                        {Math.round(trRatio * 100)}%
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-8 py-5 whitespace-nowrap text-right text-sm">
                                    <Button variant={isExpanded ? "default" : "outline"} size="sm" className={`h-9 px-4 text-xs font-bold rounded-xl border-white/10 transition-all ${isExpanded ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] border-transparent' : 'bg-black/20 text-slate-300 hover:bg-white/10 hover:text-white'}`} onClick={() => setSelectedTrade(isExpanded ? null : trade)}>
                                      {isExpanded ? 'Close Matrix' : 'Manage'}
                                    </Button>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr>
                                    <td colSpan={6} className="p-0 border-b-0">
                                      <div className="p-8 bg-indigo-900/10 border-y border-indigo-500/20 shadow-inner relative overflow-hidden">
                                        <div className="absolute top-[-50%] left-[-10%] w-[40%] h-[200%] bg-indigo-500/5 blur-[80px] pointer-events-none" />
                                        
                                        <div className="flex items-center justify-between mb-6 relative z-10">
                                           <div>
                                             <h4 className="font-outfit font-black text-white text-lg">Transfer Records: {trade.designation}</h4>
                                             <p className="text-xs uppercase tracking-widest text-indigo-200/60 font-bold mt-1">Originating from {trade.projectName}</p>
                                           </div>
                                           <Button onClick={() => setAddingPayment(!addingPayment)} size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] rounded-xl h-10 px-4">
                                             <Plus className="h-4 w-4 mr-2" /> <span className="font-bold">Record Advance</span>
                                           </Button>
                                        </div>
                                        
                                        {addingPayment && (
                                           <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} onSubmit={handleAddPayment} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 p-6 border border-emerald-500/20 rounded-2xl bg-emerald-500/5 shadow-inner relative z-10">
                                             <div>
                                               <label className="block text-[10px] font-bold text-emerald-300 uppercase tracking-[0.2em] mb-2">Timestamp</label>
                                               <input type="date" required className="w-full bg-black/40 backdrop-blur-md border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3.5 text-sm text-white transition-all outline-none"
                                                 value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})} />
                                             </div>
                                             <div>
                                               <label className="block text-[10px] font-bold text-emerald-300 uppercase tracking-[0.2em] mb-2">Amount</label>
                                               <input type="number" required className="w-full bg-black/40 backdrop-blur-md border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3.5 text-sm text-white transition-all outline-none"
                                                 value={newPayment.amount || ''} onChange={e => setNewPayment({...newPayment, amount: Number(e.target.value)})} />
                                             </div>
                                             <div>
                                               <label className="block text-[10px] font-bold text-emerald-300 uppercase tracking-[0.2em] mb-2">Reference Note</label>
                                               <input className="w-full bg-black/40 backdrop-blur-md border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3.5 text-sm text-white transition-all outline-none"
                                                 value={newPayment.designation} onChange={e => setNewPayment({...newPayment, designation: e.target.value})} />
                                             </div>
                                              <div className="md:col-span-4 mt-2">
                                                <label className="block text-[10px] font-bold text-emerald-300 uppercase tracking-[0.2em] mb-2">Document Proof (Image Receipt)</label>
                                                <ImageUpload 
                                                  onImageSelected={(file) => setReceiptFile(file)} 
                                                  onClear={() => setReceiptFile(null)} 
                                                  isLoading={isSavingPayment}
                                                />
                                              </div>
                                              <div className="md:col-span-4 flex items-end space-x-3 pt-2 border-t border-white/5 mt-2">
                                                <Button type="submit" size="sm" disabled={isSavingPayment} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-8 h-10 font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                                                  {isSavingPayment ? 'Processing...' : 'Confirm Transfer'}
                                                </Button>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => { setAddingPayment(false); setReceiptFile(null); }} disabled={isSavingPayment} className="rounded-xl h-10 text-slate-400 hover:text-white hover:bg-white/5">Cancel</Button>
                                              </div>
                                           </motion.form>
                                        )}

                                        <div className="space-y-4 relative z-10">
                                          {payments.length === 0 ? (
                                            <p className="text-sm font-medium text-slate-500 text-center py-8 border border-dashed border-white/10 rounded-2xl bg-black/20">No transfers recorded in this ledger.</p>
                                          ) : (
                                            payments.map(payment => (
                                              <div key={payment.id} className="flex flex-col p-6 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors shadow-lg">
                                                <div className="flex justify-between items-start">
                                                  <div className="flex items-center space-x-5">
                                                    <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-inner">
                                                      <Wallet className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                      <p className="text-base font-outfit font-bold text-white">Advance Transferred</p>
                                                      <p className="text-xs font-medium uppercase tracking-widest text-indigo-200/60 mt-1">{format(payment.date, 'MMM d, yyyy')} {payment.designation ? `// ${payment.designation}` : ''}</p>
                                                    </div>
                                                  </div>
                                                  <span className="font-outfit font-black text-2xl text-emerald-400 tracking-tight drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">€ {payment.amount.toLocaleString()}</span>
                                                </div>
                                                {payment.receiptUrl && (
                                                  <div className="mt-4 ml-16 w-40 h-40 rounded-xl overflow-hidden border border-white/10 shadow-lg group relative">
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
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredSuppliers.length === 0 && (
          <motion.div variants={item} className="text-center py-20 glass-card border border-dashed border-white/20">
            <div className="mx-auto h-20 w-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-inner">
              <Building2 className="h-10 w-10 text-slate-500" />
            </div>
            <h3 className="text-xl font-outfit font-black text-white">Entity Not Found</h3>
            <p className="mt-2 text-sm font-medium text-indigo-200/60">No suppliers match your current matrix parameters.</p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
