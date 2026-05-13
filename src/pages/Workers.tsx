import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getProjects, getAllPayments } from '../services/api';
import { Project, Payment } from '../types';
import { Search, Users, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { LazyImage } from '../components/ui/LazyImage';
import ImageLightbox from '../components/ui/ImageLightbox';
import { motion, AnimatePresence } from 'motion/react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.09 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 26 } },
};

export default function Workers() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let projectsLoaded = false;
    let paymentsLoaded = false;
    
    const check = () => { if (projectsLoaded && paymentsLoaded) setLoading(false); };

    const unsubProjects = getProjects(user.uid, (data) => { 
      setProjects(data); 
      projectsLoaded = true; 
      check(); 
    }, (e) => { console.error(e); setLoading(false); });

    const unsubPayments = getAllPayments(user.uid, (data) => { 
      setPayments(data); 
      paymentsLoaded = true; 
      check(); 
    }, (e) => { console.error(e); setLoading(false); });

    return () => { unsubProjects(); unsubPayments(); };
  }, [user]);

  const workers = useMemo(() => {
    const grouped = new Map<string, { name: string; totalPaid: number; payments: (Payment & { projectName: string })[] }>();
    
    payments.forEach(payment => {
      // Only process labor expenses that have worker names attached
      if (payment.type !== 'labor_expense') return;
      const name = payment.workerNames?.trim();
      if (!name) return;

      if (!grouped.has(name)) {
        grouped.set(name, { name, totalPaid: 0, payments: [] });
      }
      const entry = grouped.get(name)!;
      
      const amt = Number(payment.amount);
      entry.totalPaid = Number((entry.totalPaid + (isNaN(amt) ? 0 : amt)).toFixed(2));
      
      const project = projects.find(p => p.id === payment.projectId);
      entry.payments.push({ ...payment, projectName: project?.name || 'Unknown Project' });
    });

    return Array.from(grouped.values()).sort((a, b) => b.totalPaid - a.totalPaid);
  }, [payments, projects]);

  const filteredWorkers = useMemo(() => {
    if (!search) return workers;
    const s = search.toLowerCase();
    return workers.filter((w) => w.name.toLowerCase().includes(s));
  }, [workers, search]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-48 gap-5">
        <div className="w-10 h-10 border-t-2 border-r-2 border-[#D4AF37] rounded-full animate-spin" />
        <span className="font-playfair text-[10px] uppercase tracking-[0.3em] animate-pulse-soft" style={{ color: 'rgba(212,175,55,0.5)' }}>
          {t('auth_loading')}
        </span>
      </div>
    );
  }



  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-10">
      {/* Header */}
      <motion.div
        variants={item}
        className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6"
        style={{ borderBottom: '1px solid var(--card-border)' }}
      >
        <div>
          <h1 className="text-4xl font-playfair font-black uppercase tracking-[0.05em] text-foreground mb-2">
            {(t as any)('workers_title') || 'Labor Force'}
          </h1>
          <p className="elite-text-silver tracking-wide">
            {(t as any)('workers_subtitle') || 'Manage teams, track payroll, and monitor labor expenses globally'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-0 top-1/2 -translate-y-1/2" style={{ color: 'rgba(128,128,128,0.4)' }} />
            <input
              type="text"
              placeholder={(t as any)('workers_search') || 'Search workers...'}
              className="elite-input pl-7 uppercase tracking-[0.08em]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </motion.div>

      <motion.div variants={container} className="space-y-6">
        {filteredWorkers.length === 0 && (
          <motion.div variants={item} className="text-center py-20 rounded-2xl" style={{ border: '1px dashed var(--card-border)', background: 'rgba(128,128,128,0.02)' }}>
            <Users size={32} className="mx-auto mb-4" style={{ color: 'var(--icon-muted)' }} />
            <h3 className="font-playfair font-black text-xl text-foreground uppercase tracking-widest mb-2">
              {(t as any)('workers_no_workers') || 'No Workers Found'}
            </h3>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: 'var(--text-silver)' }}>
              {(t as any)('workers_no_workers_sub') || 'No labor expenses match your search'}
            </p>
          </motion.div>
        )}

        <AnimatePresence>
          {filteredWorkers.map((worker) => {
            const isExpanded = selectedWorker === worker.name;
            return (
              <motion.div variants={item} key={worker.name} layout>
                <div className="elite-card overflow-hidden group">
                  <div
                    className="p-7 md:p-9 relative z-10 transition-colors duration-300 cursor-pointer"
                    style={{ background: isExpanded ? 'rgba(212,175,55,0.03)' : 'rgba(128,128,128,0.05)', borderBottom: isExpanded ? '0px' : '1px solid var(--card-border)' }}
                    onClick={() => setSelectedWorker(isExpanded ? null : worker.name)}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                        <div
                          className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-500"
                          style={{ border: isExpanded ? '1px solid var(--elite-gold)' : '1px solid var(--card-border)' }}
                        >
                          <Users size={22} className="transition-colors duration-500" style={{ color: isExpanded ? 'var(--elite-gold)' : 'var(--icon-muted)' }} />
                        </div>
                        <div>
                          <h2 className="text-2xl md:text-3xl font-playfair font-black text-foreground uppercase tracking-[0.04em]">
                            {worker.name}
                          </h2>
                          <p className="text-[9px] font-bold uppercase tracking-[0.2em] mt-1.5" style={{ color: 'var(--elite-gold)' }}>
                            {worker.payments.length} {(t as any)('workers_payments') || 'Payments'}
                          </p>
                        </div>
                      </div>

                      <div
                        className="flex gap-8 items-center p-5 rounded-xl"
                        style={{ background: 'var(--body-bg-start)', border: '1px solid var(--card-border)' }}
                      >
                        <div className="text-right">
                          <p className="text-[9px] uppercase tracking-[0.2em] font-bold mb-1.5" style={{ color: 'var(--text-silver)' }}>
                            {(t as any)('workers_total_paid') || 'Total Paid'}
                          </p>
                          <p className="text-2xl font-playfair font-black text-[#f87171]">€ {worker.totalPaid.toLocaleString()}</p>
                        </div>
                        <div className="w-px h-10" style={{ background: 'var(--card-border)' }} />
                        <button
                          className="px-5 py-2 text-[9px] uppercase tracking-[0.1em] font-bold transition-all duration-200 rounded-lg shrink-0"
                          style={isExpanded
                            ? { background: 'var(--elite-gold)', color: 'var(--primary-foreground)', border: '1px solid var(--elite-gold)' }
                            : { background: 'transparent', color: 'var(--text-silver)', border: '1px solid var(--card-border)' }
                          }
                        >
                          {isExpanded ? t('detail_close') : t('detail_manage')}
                        </button>
                      </div>
                    </div>
                  </div>
                  <PaymentPanel 
                    worker={worker} 
                    isExpanded={isExpanded} 
                    setLightboxSrc={setLightboxSrc} 
                    t={t} 
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </motion.div>
  );
}

const PaymentPanel = ({ 
  worker, 
  isExpanded, 
  setLightboxSrc, 
  t 
}: { 
  worker: { name: string; totalPaid: number; payments: (Payment & { projectName: string })[] }; 
  isExpanded: boolean; 
  setLightboxSrc: (src: string | null) => void; 
  t: any; 
}) => {
  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div
            className="p-7 md:p-10 relative overflow-hidden"
            style={{ background: 'rgba(128,128,128,0.05)', borderTop: '1px solid rgba(212,175,55,0.2)' }}
          >
            <div className="mb-6">
              <h4 className="font-playfair font-black text-foreground text-2xl uppercase tracking-[0.04em]">
                {(t as any)('workers_payments') || 'Payments'}
              </h4>
            </div>

            <div className="space-y-3 relative z-10">
              {worker.payments.map((payment) => {
                return (
                  <div key={payment.id} className="flex flex-col p-6 rounded-xl transition-colors duration-200"
                    style={{ border: '1px solid var(--card-border)', background: 'var(--card-border)' }}
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center shrink-0"
                          style={{ border: '1px solid var(--card-border)', color: '#D4AF37' }}>
                          <Wallet size={16} />
                        </div>
                        <div>
                          <p className="font-playfair font-black text-foreground uppercase tracking-[0.04em]">
                            {payment.projectName}
                          </p>
                          <p className="text-[9px] font-bold uppercase tracking-[0.2em] mt-1" style={{ color: '#D4AF37' }}>
                            {payment.date instanceof Date ? format(payment.date, 'MMM d, yyyy') : '—'}
                            {payment.designation && <span style={{ color: 'var(--text-silver)' }}> · {payment.designation}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-playfair font-black text-2xl" style={{ color: '#f87171' }}>
                          € {payment.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {payment.receiptUrl && (
                      <button
                        className="mt-4 w-32 h-32 rounded-xl overflow-hidden group relative text-left"
                        style={{ border: '1px solid var(--card-border)' }}
                        onClick={() => setLightboxSrc(payment.receiptUrl!)}
                      >
                        <LazyImage src={payment.receiptUrl} alt={t('img_receipt')} className="w-full h-full" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
