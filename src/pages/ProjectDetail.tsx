import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getProjects, getTrades, addTrade, updateTrade, getPayments, addPayment } from '../services/api';
import { Project, Trade, Payment } from '../types';
import { Button } from '../components/ui/button';
import { ArrowLeft, Plus, AlertCircle, Trash2, Wallet, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { format } from 'date-fns';
import { ImageUpload } from '../components/ui/ImageUpload';
import { LazyImage } from '../components/ui/LazyImage';
import { checkAndSendAlert } from '../services/email';
import { motion } from 'motion/react';

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

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  
  const [addingTrade, setAddingTrade] = useState(false);
  const [newTrade, setNewTrade] = useState({ designation: '', amount: 0, supplierName: '', quantity: 1 });
  
  const [addingPayment, setAddingPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: 0, date: new Date().toISOString().substring(0, 10), designation: '' });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    
    const unsubP = getProjects(user.uid, (projs) => {
      const p = projs.find(x => x.id === id);
      if (p) setProject(p);
    }, console.error);

    const unsubT = getTrades(id, user.uid, (data) => {
      setTrades(data);
    }, console.error);

    return () => {
      unsubP();
      unsubT();
    };
  }, [user, id]);

  useEffect(() => {
    if (!user || !id || !selectedTrade) return;
    const unsub = getPayments(id, selectedTrade.id, user.uid, setPayments, console.error);
    return () => unsub();
  }, [user, id, selectedTrade]);

  if (!project) return <div className="p-8 text-amber-400 font-playfair">Loading Elite Matrix...</div>;

  const totalBudget = trades.reduce((sum, t) => sum + t.amount, 0);
  const totalAdvances = trades.reduce((sum, t) => sum + t.totalAdvances, 0);

  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !newTrade.designation) return;
    
    await addTrade(id, {
      designation: newTrade.designation,
      amount: Number(newTrade.amount),
      quantity: Number(newTrade.quantity),
      supplierName: newTrade.supplierName,
      totalAdvances: 0,
      ownerId: user.uid
    });
    
    setAddingTrade(false);
    setNewTrade({ designation: '', amount: 0, supplierName: '', quantity: 1 });
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
        ownerId: user.uid
      }, receiptFile);
      
      await updateTrade(id, selectedTrade.id, {
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

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-10"
    >
      <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-white/5">
        <div className="flex items-center space-x-4">
          <Link to="/projects">
            <Button variant="ghost" size="icon" className="text-amber-400 hover:text-white hover:bg-white/10 rounded-xl h-12 w-12 border border-white/5 bg-black/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-playfair font-black text-white tracking-tight">{project.name}</h1>
            <p className="text-sm font-medium text-stone-300/60 mt-1 uppercase tracking-widest">
              Identity: <span className="text-amber-200 font-bold">{project.clientName}</span> {project.contractorName ? `// Contractor: ${project.contractorName}` : ''}
            </p>
          </div>
        </div>
      </motion.div>
      
      <motion.div variants={container} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <motion.div variants={item}>
           <Card className="glass-card overflow-hidden group">
            <CardHeader className="pb-2 relative z-10 border-b border-white/5 mb-4">
              <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Project Budget</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-playfair font-black text-white tracking-tight">€ {totalBudget.toLocaleString()}</div>
            </CardContent>
            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </Card>
        </motion.div>
        
        <motion.div variants={item}>
         <Card className="glass-card overflow-hidden group">
          <CardHeader className="pb-2 relative z-10 border-b border-white/5 mb-4">
            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Advances Paid</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-playfair font-black text-white tracking-tight">€ {totalAdvances.toLocaleString()}</div>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1 bg-white/5 h-2 rounded-full overflow-hidden border border-white/10">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(79,70,229,0.5)] ${totalAdvances / totalBudget > 0.75 ? 'bg-gradient-to-r from-rose-600 to-rose-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'}`}
                    style={{ width: `${Math.min(100, (totalAdvances / (totalBudget || 1)) * 100)}%` }}
                  ></div>
              </div>
              <p className="text-xs font-black text-amber-200 w-8 text-right">
                {totalBudget > 0 ? ((totalAdvances / totalBudget) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
         </Card>
        </motion.div>
      </motion.div>

      <motion.div variants={item} className="flex flex-col md:flex-row items-start md:items-center justify-between mt-10 gap-4">
        <h2 className="text-2xl font-playfair font-black text-white tracking-tight">Ledger Matrix</h2>
        <Button onClick={() => setAddingTrade(!addingTrade)} className="bg-amber-700 hover:bg-amber-600 text-white rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all px-6">
          <Plus className="h-4 w-4 mr-2" /> <span className="font-bold">Initialize Trade</span>
        </Button>
      </motion.div>

      {addingTrade && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <Card className="glass-card border-amber-600/30 shadow-[0_0_30px_rgba(79,70,229,0.1)] relative overflow-hidden mb-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-700/10 blur-[100px] rounded-full pointer-events-none" />
            <CardContent className="pt-6 relative z-10">
              <form onSubmit={handleAddTrade} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <div>
                    <label className="block text-[10px] font-bold text-amber-200 uppercase tracking-[0.2em] mb-2">Designation</label>
                    <input required placeholder="e.g. Travaux Plombier" className="w-full text-sm border border-white/10 rounded-xl p-3.5 bg-black/40 text-white focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-none transition-all placeholder:text-slate-600 shadow-inner"
                      value={newTrade.designation} onChange={e => setNewTrade({...newTrade, designation: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-amber-200 uppercase tracking-[0.2em] mb-2">Supplier Entity</label>
                    <input placeholder="Supplier Name" className="w-full text-sm border border-white/10 rounded-xl p-3.5 bg-black/40 text-white focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-none transition-all placeholder:text-slate-600 shadow-inner"
                      value={newTrade.supplierName} onChange={e => setNewTrade({...newTrade, supplierName: e.target.value})} />
                 </div>
                  <div>
                    <label className="block text-[10px] font-bold text-amber-200 uppercase tracking-[0.2em] mb-2">Budget Allocation</label>
                    <input type="number" required placeholder="0" className="w-full text-sm border border-white/10 rounded-xl p-3.5 bg-black/40 text-white focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-none transition-all placeholder:text-slate-600 shadow-inner"
                      value={newTrade.amount || ''} onChange={e => setNewTrade({...newTrade, amount: Number(e.target.value)})} />
                 </div>
                 <div className="flex items-end space-x-3 pt-2">
                    <Button type="submit" className="bg-amber-700 hover:bg-amber-600 text-white rounded-xl px-8 font-bold shadow-[0_0_15px_rgba(79,70,229,0.3)]">Deploy</Button>
                    <Button type="button" variant="ghost" onClick={() => setAddingTrade(false)} className="rounded-xl text-slate-400 hover:text-white hover:bg-white/5">Cancel</Button>
                 </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Mobile view for trades */}
      <div className="md:hidden space-y-4">
        {trades.length === 0 ? (
          <div className="text-center py-12 font-medium text-slate-500 text-sm glass-card border-dashed border-white/10">No trades initialized yet.</div>
        ) : (
          trades.map(trade => {
            const ratio = trade.amount > 0 ? trade.totalAdvances / trade.amount : 0;
            const isWarning = ratio > 0.75;
            
            return (
              <div key={trade.id} className={`glass-card p-5 flex flex-col gap-4 relative overflow-hidden ${selectedTrade?.id === trade.id ? 'border-amber-600 shadow-[0_0_20px_rgba(79,70,229,0.2)]' : ''}`}>
                {isWarning && <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-rose-400 to-rose-600" />}
                <div className="flex justify-between items-start pl-2">
                  <div>
                    <h3 className="font-playfair font-black text-white text-lg">{trade.designation}</h3>
                    <p className="text-[11px] font-medium tracking-widest uppercase text-stone-300/60 mt-1">{trade.supplierName || 'Unknown Entity'}</p>
                  </div>
                  <Button variant="outline" size="sm" className={`h-8 text-xs font-bold rounded-lg border-white/10 ${selectedTrade?.id === trade.id ? 'bg-amber-700 text-white' : 'bg-white/5 text-slate-300'}`} onClick={() => setSelectedTrade(selectedTrade?.id === trade.id ? null : trade)}>
                    {selectedTrade?.id === trade.id ? 'Close' : 'Matrix'}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4 pl-2 bg-black/20 rounded-xl p-4 border border-white/5">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Budget</p>
                    <p className="font-bold text-white text-base">€ {trade.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Advances</p>
                    <p className="font-bold text-white text-base">€ {trade.totalAdvances.toLocaleString()}</p>
                  </div>
                </div>
                <div className="pl-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-white/5 h-2 rounded-full overflow-hidden border border-white/10">
                      <div className={`h-full rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] ${isWarning ? 'bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-gradient-to-r from-amber-700 to-amber-400 shadow-[0_0_10px_rgba(79,70,229,0.5)]'}`} style={{ width: `${Math.min(100, ratio * 100)}%` }}></div>
                    </div>
                    <span className={`text-[10px] tracking-wider w-8 text-right ${isWarning ? 'text-rose-400 font-black' : 'text-amber-200 font-bold'}`}>
                      {Math.round(ratio * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop view for trades */}
      <motion.div variants={item} className="hidden md:flex glass-card overflow-hidden flex-col">
        <div className="px-8 py-5 border-b border-white/10 bg-white/5">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Financial Ledger by Trade</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead className="bg-black/20">
              <tr className="border-b border-white/5">
                <th className="px-8 py-5 text-[10px] font-bold text-amber-200 uppercase tracking-[0.2em]">Designation</th>
                <th className="px-8 py-5 text-[10px] font-bold text-amber-200 uppercase tracking-[0.2em]">Supplier Entity</th>
                <th className="px-8 py-5 text-[10px] font-bold text-amber-200 uppercase tracking-[0.2em] text-right">Budget</th>
                <th className="px-8 py-5 text-[10px] font-bold text-amber-200 uppercase tracking-[0.2em] text-right">Advances</th>
                <th className="px-8 py-5 text-[10px] font-bold text-amber-200 uppercase tracking-[0.2em]">Risk Level</th>
                <th className="px-8 py-5 text-right text-[10px] font-bold text-amber-200 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium text-sm bg-black/10">
              {trades.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-12 text-center text-sm font-medium text-slate-500 border-dashed border-white/10">No trades initialized in ledger.</td></tr>
              ) : trades.map((trade) => {
                const ratio = trade.amount > 0 ? trade.totalAdvances / trade.amount : 0;
                const isWarning = ratio > 0.75;
                
                return (
                  <tr key={trade.id} className={`transition-colors duration-300 ${selectedTrade?.id === trade.id ? 'bg-amber-600/10' : 'hover:bg-white/5'} ${isWarning && selectedTrade?.id !== trade.id ? 'bg-rose-500/5' : ''}`}>
                    <td className="px-8 py-5 whitespace-nowrap font-playfair font-bold text-base text-white">{trade.designation}</td>
                    <td className="px-8 py-5 whitespace-nowrap text-sm font-medium tracking-wide text-stone-300/60 uppercase">{trade.supplierName || '-'}</td>
                    <td className="px-8 py-5 whitespace-nowrap text-sm text-white font-bold text-right">€ {trade.amount.toLocaleString()}</td>
                    <td className="px-8 py-5 whitespace-nowrap text-sm text-slate-300 font-medium text-right">€ {trade.totalAdvances.toLocaleString()}</td>
                    <td className="px-8 py-5 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-white/5 border border-white/5 h-2 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] ${isWarning ? 'bg-gradient-to-r from-rose-600 to-rose-400' : 'bg-gradient-to-r from-amber-700 to-amber-400'}`} style={{ width: `${Math.min(100, ratio * 100)}%` }}></div>
                        </div>
                        <span className={`text-[10px] tracking-wider font-bold w-8 ${isWarning ? 'text-rose-400' : 'text-amber-200'}`}>
                          {Math.round(ratio * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-right text-sm">
                      <Button variant="outline" size="sm" className={`h-9 px-4 text-xs font-bold rounded-xl border-white/10 transition-all ${selectedTrade?.id === trade.id ? 'bg-amber-700 text-white border-transparent shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-black/20 text-slate-300 hover:text-white hover:bg-white/10'}`} onClick={() => setSelectedTrade(selectedTrade?.id === trade.id ? null : trade)}>
                        {selectedTrade?.id === trade.id ? 'Close Matrix' : 'Manage'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {selectedTrade && (
         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
         <Card className="mt-8 glass-card border-amber-600/30 shadow-[0_0_40px_rgba(79,70,229,0.15)] relative overflow-hidden">
           <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-amber-700/5 blur-[120px] rounded-full pointer-events-none" />
           <CardHeader className="bg-black/20 border-b border-white/5 relative z-10 px-8 py-6">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-600/10 border border-amber-600/20 flex items-center justify-center text-amber-400">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-playfair font-black text-white">{selectedTrade.designation}</CardTitle>
                    <CardDescription className="text-stone-300/60 font-medium uppercase tracking-widest text-[10px] mt-1">Payment Matrix / Advance Records</CardDescription>
                  </div>
                </div>
                <Button onClick={() => setAddingPayment(!addingPayment)} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all px-6 py-5">
                  <Plus className="h-4 w-4 mr-2" /> <span className="font-bold">Record Advance</span>
                </Button>
             </div>
           </CardHeader>
           
           <CardContent className="pt-8 px-8 relative z-10">
             {addingPayment && (
                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} onSubmit={handleAddPayment} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 p-6 border border-emerald-500/20 rounded-2xl bg-emerald-500/5 shadow-inner">
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-300 uppercase tracking-[0.2em] mb-2">Timestamp</label>
                    <input type="date" required className="w-full bg-black/40 backdrop-blur-md border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3.5 text-sm text-white transition-all outline-none"
                      value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-300 uppercase tracking-[0.2em] mb-2">Amount Transferred</label>
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
                    <Button type="submit" disabled={isSavingPayment} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-8 font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                      {isSavingPayment ? 'Processing...' : 'Confirm Transfer'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => { setAddingPayment(false); setReceiptFile(null); }} disabled={isSavingPayment} className="rounded-xl text-slate-400 hover:text-white hover:bg-white/5">Cancel</Button>
                  </div>
                </motion.form>
             )}

             <div className="space-y-4">
               {payments.length === 0 ? (
                 <p className="text-sm font-medium text-slate-500 text-center py-8 border border-dashed border-white/10 rounded-2xl bg-black/10">No transfers recorded in this ledger.</p>
               ) : (
                 payments.map(payment => (
                   <div key={payment.id} className="flex flex-col p-6 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors shadow-lg">
                     <div className="flex justify-between items-start">
                       <div className="flex items-center space-x-5">
                         <div className="h-12 w-12 rounded-xl bg-amber-600/10 text-amber-400 flex items-center justify-center border border-amber-600/20 shadow-inner">
                           <Wallet className="h-6 w-6" />
                         </div>
                         <div>
                           <p className="text-base font-playfair font-bold text-white">Advance Transferred</p>
                           <p className="text-xs font-medium uppercase tracking-widest text-stone-300/60 mt-1">{format(payment.date, 'MMM d, yyyy')} {payment.designation ? `// ${payment.designation}` : ''}</p>
                         </div>
                       </div>
                       <span className="font-playfair font-black text-2xl text-emerald-400 tracking-tight drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">€ {payment.amount.toLocaleString()}</span>
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
           </CardContent>
         </Card>
         </motion.div>
      )}

    </motion.div>
  );
}
