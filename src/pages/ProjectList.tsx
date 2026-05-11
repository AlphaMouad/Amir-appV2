import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getProjects, addProject, deleteProject } from '../services/api';
import { Project } from '../types';
import { Button } from '../components/ui/button';
import { Plus, Building2, Trash2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
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

export default function ProjectList() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', clientName: '', contractorName: '' });

  useEffect(() => {
    if (!user) return;
    const unsub = getProjects(user.uid, setProjects, console.error);
    return () => unsub();
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newProject.name || !newProject.clientName) return;
    
    await addProject({
      name: newProject.name,
      clientName: newProject.clientName,
      contractorName: newProject.contractorName,
      status: 'ongoing',
      ownerId: user.uid
    });
    
    setNewProject({ name: '', clientName: '', contractorName: '' });
    setIsCreating(false);
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-white/5">
        <div>
          <h1 className="text-4xl font-playfair font-black tracking-tight text-white mb-2">Projects</h1>
          <p className="text-stone-300/60 font-medium">Manage your elite portfolio</p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)} className="bg-amber-700 hover:bg-amber-600 text-white rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all px-6 py-5">
          <Plus className="h-5 w-5 mr-2" />
          <span className="font-bold">New Project</span>
        </Button>
      </motion.div>

      {isCreating && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass-card p-6 md:p-8 border border-amber-600/30 shadow-[0_0_30px_rgba(79,70,229,0.1)] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-700/10 blur-[100px] rounded-full pointer-events-none" />
          
          <h2 className="text-2xl font-playfair font-black mb-6 text-white relative z-10">Initialize Portfolio Asset</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            <div>
              <label className="block text-xs font-bold text-amber-200 uppercase tracking-widest mb-2">Asset Name</label>
              <input 
                type="text" 
                required
                className="w-full bg-black/40 backdrop-blur-md border border-white/10 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-xl p-3.5 text-sm text-white transition-all outline-none placeholder:text-slate-600 shadow-inner"
                value={newProject.name} 
                onChange={e => setNewProject({...newProject, name: e.target.value})} 
                placeholder="e.g. Villa Horizon"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-200 uppercase tracking-widest mb-2">Client Identity</label>
              <input 
                type="text" 
                required
                className="w-full bg-black/40 backdrop-blur-md border border-white/10 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-xl p-3.5 text-sm text-white transition-all outline-none placeholder:text-slate-600 shadow-inner"
                value={newProject.clientName} 
                onChange={e => setNewProject({...newProject, clientName: e.target.value})} 
                placeholder="e.g. John Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-200 uppercase tracking-widest mb-2">Contractor (Optional)</label>
              <input 
                type="text" 
                className="w-full bg-black/40 backdrop-blur-md border border-white/10 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-xl p-3.5 text-sm text-white transition-all outline-none placeholder:text-slate-600 shadow-inner"
                value={newProject.contractorName} 
                onChange={e => setNewProject({...newProject, contractorName: e.target.value})} 
                placeholder="e.g. AMG Building"
              />
            </div>
            <div className="md:col-span-3 flex space-x-4 pt-4 border-t border-white/5 mt-2">
              <Button type="submit" className="bg-amber-700 hover:bg-amber-600 text-white rounded-xl px-8 font-bold shadow-[0_0_15px_rgba(79,70,229,0.3)]">Deploy Asset</Button>
              <Button type="button" variant="ghost" onClick={() => setIsCreating(false)} className="rounded-xl text-slate-400 hover:text-white hover:bg-white/5">Cancel</Button>
            </div>
          </form>
        </motion.div>
      )}

      <motion.div variants={container} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map(project => (
          <motion.div variants={item} key={project.id}>
            <div className="glass-card overflow-hidden group h-full flex flex-col">
              <div className="p-6 md:p-8 flex-1 flex flex-col relative">
                <div className="flex items-start justify-between mb-8 relative z-10">
                  <div className="flex items-center space-x-4">
                    <div className="h-14 w-14 bg-gradient-to-br from-amber-600/20 to-amber-700/20 border border-amber-600/30 text-amber-400 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.15)] group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-500">
                      <Building2 className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="font-playfair font-black text-xl text-white line-clamp-1 group-hover:text-amber-200 transition-colors">{project.name}</h3>
                      <p className="text-xs font-medium text-stone-300/60 uppercase tracking-widest mt-1">{project.clientName}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                      Started {project.createdAt ? format(project.createdAt, 'MMM d, yyyy') : '...'}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest shadow-inner ${project.status === 'ongoing' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-white/5 text-slate-400 border border-white/10'}`}>
                      {project.status === 'ongoing' ? 'Active' : project.status}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-6 border-t border-white/5">
                    <Link to={`/projects/${project.id}`} className="flex-1 mr-4">
                      <Button variant="outline" className="w-full justify-between border-white/10 hover:border-amber-600/50 hover:bg-amber-600/10 text-white rounded-xl transition-all duration-300 h-12 bg-black/20">
                        <span className="font-bold tracking-wide">Enter Matrix</span>
                        <ArrowRight className="h-4 w-4 ml-2 text-amber-400 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="rounded-xl h-12 w-12 hover:bg-rose-500/10 hover:border-rose-500/20 border border-transparent text-slate-500 hover:text-rose-400 transition-all duration-300" onClick={() => {
                      if (confirm('Are you sure you want to delete this project?')) {
                        deleteProject(project.id);
                      }
                    }}>
                       <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-stone-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </div>
            </div>
          </motion.div>
        ))}
        
        {projects.length === 0 && !isCreating && (
          <motion.div variants={item} className="col-span-full">
            <div className="flex flex-col items-center justify-center py-24 px-4 glass-card border border-dashed border-white/20 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-amber-600/5 to-transparent opacity-50" />
              <div className="h-24 w-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                <Building2 className="h-10 w-10 text-slate-500" />
              </div>
              <h3 className="text-2xl font-playfair font-black text-white tracking-tight relative z-10">Empty Portfolio</h3>
              <p className="mt-2 text-stone-300/60 max-w-sm text-center relative z-10 font-medium">Initialize your first villa construction asset to begin financial tracking.</p>
              <Button onClick={() => setIsCreating(true)} className="mt-8 rounded-xl px-8 py-6 bg-amber-700 hover:bg-amber-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] relative z-10">
                <Plus className="h-5 w-5 mr-2" />
                <span className="font-bold tracking-wide">Create Asset</span>
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
