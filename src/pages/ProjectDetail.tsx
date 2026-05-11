import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getProjects, getTrades, addTrade, updateTrade, getPayments, addPayment } from '../services/api';
import { Project, Trade, Payment } from '../types';
import { ArrowLeft, Plus, AlertCircle, Trash2, Wallet, Building2 } from 'lucide-react';
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

  if (!project) return <div className="p-8 text-[#D4AF37] font-playfair uppercase tracking-widest text-xs">Loading Elite Matrix...</div>;

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
      <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b border-white/[0.04]">
        <div className="flex items-center space-x-6">
          <Link to="/projects">
            <button className="h-12 w-12 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-4xl font-playfair font-black text-white uppercase tracking-[0.05em]">{project.name}</h1>
            <p className="text-[10px] font-medium text-white/40 mt-2 uppercase tracking-[0.2em]">
              Identity: <span className="text-[#D4AF37]">{project.clientName}</span> {project.contractorName ? `// Contractor: ${project.contractorName}` : ''}
            </p>
          </div>
        </div>
      </motion.div>
      
      <motion.div variants={container} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <motion.div variants={item}>
           <div className="elite-card p-8 relative overflow-hidden group">
            <div className="pb-4 relative z-10 border-b border-white/[0.04] mb-6">
              <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Project Budget</h3>
            </div>
            <div className="relative z-10">
              <div className="text-4xl font-playfair font-black text-white tracking-tight">€ {totalBudget.toLocaleString()}</div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          </div>
        </motion.div>
        
        <motion.div variants={item}>
         <div className="elite-card p-8 relative overflow-hidden group">
          <div className="pb-4 relative z-10 border-b border-white/[0.04] mb-6">
            <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Advances Paid</h3>
          </div>
          <div className="relative z-10">
            <div className="text-4xl font-playfair font-black text-[#D4AF37] tracking-tight drop-shadow-[0_0_15px_rgba(212,175,55,0.2)]">€ {totalAdvances.toLocaleString()}</div>
            <div className="flex items-center gap-4 mt-6">
              <div className="flex-1 bg-white/5 h-1 rounded-full overflow-hidden border border-white/10">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${totalAdvances / totalBudget > 0.75 ? 'bg-rose-500' : 'bg-[#D4AF37]'}`}
                    style={{ width: `${Math.min(100, (totalAdvances / (totalBudget || 1)) * 100)}%` }}
                  ></div>
              </div>
              <p className="text-[10px] font-black text-[#D4AF37] w-10 text-right tracking-widest">
                {totalBudget > 0 ? ((totalAdvances / totalBudget) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
         </div>
        </motion.div>
      </motion.div>

      <motion.div variants={item} className="flex flex-col md:flex-row items-start md:items-center justify-between mt-12 gap-4">
        <h2 className="text-2xl font-playfair font-black text-white uppercase tracking-[0.1em]">Ledger Matrix</h2>
        <button onClick={() => setAddingTrade(!addingTrade)} className="elite-button px-8 py-4 flex items-center justify-center uppercase tracking-[0.1em] text-[10px]">
          <Plus className="h-4 w-4 mr-2" /> Initialize Trade
        </button>
      </motion.div>

      {addingTrade && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <div className="elite-card p-8 md:p-10 relative overflow-hidden mb-8 border-[#D4AF37]/20">
            <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-[#D4AF37]/5 blur-[80px] rounded-full pointer-events-none" />
            <div className="relative z-10">
              <form onSubmit={handleAddTrade} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                 <div>
                    <label className="block text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-2">Designation</label>
                    <input required placeholder="e.g. Travaux Plombier" className="w-full bg-transparent border-b border-white/20 focus:border-[#D4AF37] pb-2 pt-1 text-sm text-white transition-colors outline-none placeholder:text-white/20"
                      value={newTrade.designation} onChange={e => setNewTrade({...newTrade, designation: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-2">Supplier Entity</label>
                    <input placeholder="Supplier Name" className="w-full bg-transparent border-b border-white/20 focus:border-[#D4AF37] pb-2 pt-1 text-sm text-white transition-colors outline-none placeholder:text-white/20"
                      value={newTrade.supplierName} onChange={e => setNewTrade({...newTrade, supplierName: e.target.value})} />
                 </div>
                  <div>
                    <label className="block text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-2">Budget Allocation</label>
                    <input type="number" required placeholder="0" className="w-full bg-transparent border-b border-white/20 focus:border-[#D4AF37] pb-2 pt-1 text-sm text-white transition-colors outline-none placeholder:text-white/20"
                      value={newTrade.amount || ''} onChange={e => setNewTrade({...newTrade, amount: Number(e.target.value)})} />
                 </div>
                 <div className="flex items-end space-x-6 pt-2">
                    <button type="submit" className="elite-button px-10 py-3 uppercase text-[10px] tracking-[0.1em]">Deploy</button>
                    <button type="button" onClick={() => setAddingTrade(false)} className="text-white/40 hover:text-white uppercase text-[10px] tracking-[0.1em] transition-colors pb-3">Cancel</button>
                 </div>
              </form>
            </div>
          </div>
        </motion.div>
      )}

      {/* Mobile view for trades */}
      <div className="md:hidden space-y-4">
        {trades.length === 0 ? (
          <div className="text-center py-16 font-medium text-white/40 text-[10px] uppercase tracking-[0.2em] elite-card border-dashed border-white/10">No trades initialized yet.</div>
        ) : (
          trades.map(trade => {
            const ratio = trade.amount > 0 ? trade.totalAdvances / trade.amount : 0;
            const isWarning = ratio > 0.75;
            
            return (
              <div key={trade.id} className={`elite-card p-6 flex flex-col gap-6 relative overflow-hidden ${selectedTrade?.id === trade.id ? 'border-[#D4AF37]/50 shadow-[0_0_30px_rgba(212,175,55,0.15)]' : ''}`}>
                {isWarning && <div className="absolute top-0 left-0 bottom-0 w-1 bg-rose-500" />}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-playfair font-black text-white text-lg uppercase tracking-[0.05em]">{trade.designation}</h3>
                    <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#D4AF37] mt-1">{trade.supplierName || 'Unknown Entity'}</p>
                  </div>
                  <button className={`px-4 py-2 text-[9px] uppercase tracking-[0.1em] font-bold rounded border transition-colors ${selectedTrade?.id === trade.id ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-transparent text-white/40 border-white/10 hover:border-white/30 hover:text-white'}`} onClick={() => setSelectedTrade(selectedTrade?.id === trade.id ? null : trade)}>
                    {selectedTrade?.id === trade.id ? 'Close' : 'Matrix'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 bg-black/40 rounded p-4 border border-white/[0.02]">
                  <div>
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-1">Budget</p>
                    <p className="font-bold text-white text-sm">€ {trade.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-1">Advances</p>
                    <p className="font-bold text-[#D4AF37] text-sm">€ {trade.totalAdvances.toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-white/5 h-1 rounded-full overflow-hidden border border-white/10">
                      <div className={`h-full rounded-full ${isWarning ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.5)]'}`} style={{ width: `${Math.min(100, ratio * 100)}%` }}></div>
                    </div>
                    <span className={`text-[9px] tracking-widest w-10 text-right font-black ${isWarning ? 'text-rose-400' : 'text-[#D4AF37]'}`}>
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
      <motion.div variants={item} className="hidden md:flex elite-card overflow-hidden flex-col">
        <div className="px-10 py-6 border-b border-white/[0.04] bg-black/40">
          <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">Financial Ledger by Trade</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="px-10 py-6 text-[9px] font-bold text-[#D4AF37] uppercase tracking-[0.2em]">Designation</th>
                <th className="px-10 py-6 text-[9px] font-bold text-[#D4AF37] uppercase tracking-[0.2em]">Supplier Entity</th>
                <th className="px-10 py-6 text-[9px] font-bold text-[#D4AF37] uppercase tracking-[0.2em] text-right">Budget</th>
                <th className="px-10 py-6 text-[9px] font-bold text-[#D4AF37] uppercase tracking-[0.2em] text-right">Advances</th>
                <th className="px-10 py-6 text-[9px] font-bold text-[#D4AF37] uppercase tracking-[0.2em]">Risk Level</th>
                <th className="px-10 py-6 text-right text-[9px] font-bold text-[#D4AF37] uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {trades.length === 0 ? (
                <tr><td colSpan={6} className="px-10 py-20 text-center text-[10px] uppercase tracking-[0.2em] text-white/40">No trades initialized in ledger.</td></tr>
              ) : trades.map((trade) => {
                const ratio = trade.amount > 0 ? trade.totalAdvances / trade.amount : 0;
                const isWarning = ratio > 0.75;
                
                return (
                  <tr key={trade.id} className={`transition-colors duration-500 ${selectedTrade?.id === trade.id ? 'bg-[#D4AF37]/5' : 'hover:bg-white/[0.02]'} ${isWarning && selectedTrade?.id !== trade.id ? 'bg-rose-500/[0.02]' : ''}`}>
                    <td className="px-10 py-6 whitespace-nowrap font-playfair font-black text-lg text-white tracking-[0.05em] uppercase">{trade.designation}</td>
                    <td className="px-10 py-6 whitespace-nowrap text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">{trade.supplierName || '-'}</td>
                    <td className="px-10 py-6 whitespace-nowrap text-sm text-white font-bold text-right">€ {trade.amount.toLocaleString()}</td>
                    <td className="px-10 py-6 whitespace-nowrap text-sm text-[#D4AF37] font-bold text-right">€ {trade.totalAdvances.toLocaleString()}</td>
                    <td className="px-10 py-6 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-24 bg-white/5 border border-white/5 h-1 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] ${isWarning ? 'bg-rose-500' : 'bg-[#D4AF37]'}`} style={{ width: `${Math.min(100, ratio * 100)}%` }}></div>
                        </div>
                        <span className={`text-[9px] tracking-widest font-black w-10 ${isWarning ? 'text-rose-400' : 'text-[#D4AF37]'}`}>
                          {Math.round(ratio * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-6 whitespace-nowrap text-right text-sm">
                      <button className={`px-6 py-2 text-[9px] uppercase tracking-[0.1em] font-bold transition-all border ${selectedTrade?.id === trade.id ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-transparent text-white/40 border-white/10 hover:text-white hover:border-white/30'}`} onClick={() => setSelectedTrade(selectedTrade?.id === trade.id ? null : trade)}>
                        {selectedTrade?.id === trade.id ? 'Close Matrix' : 'Manage'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {selectedTrade && (
         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
         <div className="mt-12 elite-card border-[#D4AF37]/30 shadow-[0_0_40px_rgba(212,175,55,0.1)] relative overflow-hidden">
           <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-[#D4AF37]/5 blur-[120px] rounded-full pointer-events-none" />
           <div className="bg-black/40 border-b border-white/[0.04] relative z-10 px-10 py-8">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded bg-black border border-white/10 flex items-center justify-center text-[#D4AF37]">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-playfair font-black text-white uppercase tracking-[0.05em]">{selectedTrade.designation}</h2>
                    <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-[9px] mt-2">Payment Matrix / Advance Records</p>
                  </div>
                </div>
                <button onClick={() => setAddingPayment(!addingPayment)} className="bg-white text-black hover:bg-white/90 border border-transparent shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all px-8 py-4 uppercase text-[10px] tracking-[0.1em] font-bold flex items-center justify-center">
                  <Plus className="h-4 w-4 mr-2" /> Record Advance
                </button>
             </div>
           </div>
           
           <div className="pt-10 px-10 pb-10 relative z-10">
             {addingPayment && (
                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} onSubmit={handleAddPayment} className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12 p-8 border border-white/10 rounded-lg bg-black/40">
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
                    <button type="submit" disabled={isSavingPayment} className="bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed px-10 py-4 uppercase text-[10px] tracking-[0.1em] font-bold shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all">
                      {isSavingPayment ? 'Processing...' : 'Confirm Transfer'}
                    </button>
                    <button type="button" onClick={() => { setAddingPayment(false); setReceiptFile(null); }} disabled={isSavingPayment} className="text-white/40 hover:text-white uppercase text-[10px] tracking-[0.1em] transition-colors pb-3">Cancel</button>
                  </div>
                </motion.form>
             )}

             <div className="space-y-4">
               {payments.length === 0 ? (
                 <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 text-center py-16 border border-dashed border-white/10 rounded-lg bg-black/20">No transfers recorded in this ledger.</p>
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
         </div>
         </motion.div>
      )}

    </motion.div>
  );
}
