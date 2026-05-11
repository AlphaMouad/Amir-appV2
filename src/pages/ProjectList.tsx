import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getProjects, addProject, deleteProject } from '../services/api';
import { Project } from '../types';
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
      <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b border-white/[0.04]">
        <div>
          <h1 className="text-4xl font-playfair font-black tracking-[0.05em] text-white uppercase mb-2">Projects</h1>
          <p className="elite-text-silver tracking-wide">Manage your elite portfolio</p>
        </div>
        <button onClick={() => setIsCreating(!isCreating)} className="elite-button px-8 py-4 flex items-center justify-center uppercase tracking-[0.1em] text-xs">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </button>
      </motion.div>

      {isCreating && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="elite-card p-6 md:p-10 border border-[#D4AF37]/20 relative overflow-hidden"
        >
          <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-[#D4AF37]/5 blur-[80px] rounded-full pointer-events-none" />
          
          <h2 className="text-xl font-playfair font-black mb-8 text-white uppercase tracking-[0.1em] relative z-10">Initialize Portfolio Asset</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
            <div>
              <label className="block text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-2">Asset Name</label>
              <input 
                type="text" 
                required
                className="w-full bg-transparent border-b border-white/20 focus:border-[#D4AF37] pb-2 pt-1 text-sm text-white transition-colors outline-none placeholder:text-white/20"
                value={newProject.name} 
                onChange={e => setNewProject({...newProject, name: e.target.value})} 
                placeholder="e.g. Villa Horizon"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-2">Client Identity</label>
              <input 
                type="text" 
                required
                className="w-full bg-transparent border-b border-white/20 focus:border-[#D4AF37] pb-2 pt-1 text-sm text-white transition-colors outline-none placeholder:text-white/20"
                value={newProject.clientName} 
                onChange={e => setNewProject({...newProject, clientName: e.target.value})} 
                placeholder="e.g. John Doe"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-2">Contractor (Optional)</label>
              <input 
                type="text" 
                className="w-full bg-transparent border-b border-white/20 focus:border-[#D4AF37] pb-2 pt-1 text-sm text-white transition-colors outline-none placeholder:text-white/20"
                value={newProject.contractorName} 
                onChange={e => setNewProject({...newProject, contractorName: e.target.value})} 
                placeholder="e.g. AMG Building"
              />
            </div>
            <div className="md:col-span-3 flex space-x-6 pt-6">
              <button type="submit" className="elite-button px-10 py-3 uppercase text-xs tracking-[0.1em]">Deploy Asset</button>
              <button type="button" onClick={() => setIsCreating(false)} className="text-white/40 hover:text-white uppercase text-xs tracking-[0.1em] transition-colors">Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      <motion.div variants={container} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map(project => (
          <motion.div variants={item} key={project.id}>
            <div className="elite-card h-full flex flex-col group relative">
              <div className="p-8 flex-1 flex flex-col relative z-10">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-black border border-white/10 rounded-lg flex items-center justify-center group-hover:border-[#D4AF37]/40 transition-colors duration-500">
                      <Building2 className="h-5 w-5 text-[#D4AF37]" />
                    </div>
                    <div>
                      <h3 className="font-playfair font-black text-xl text-white line-clamp-1 uppercase tracking-[0.05em]">{project.name}</h3>
                      <p className="text-[9px] text-[#D4AF37] uppercase tracking-[0.2em] mt-1">{project.clientName}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-[10px] text-white/40 uppercase tracking-widest">
                      {project.createdAt ? format(project.createdAt, 'MMM d, yyyy') : '...'}
                    </div>
                    <div className={`px-3 py-1 text-[9px] uppercase tracking-widest border ${project.status === 'ongoing' ? 'border-[#D4AF37]/30 text-[#D4AF37] bg-[#D4AF37]/5' : 'border-white/10 text-white/40'}`}>
                      {project.status === 'ongoing' ? 'Active' : project.status}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-6 border-t border-white/[0.04]">
                    <Link to={`/projects/${project.id}`} className="flex-1 mr-4">
                      <button className="elite-button-outline w-full py-3 flex items-center justify-center uppercase text-[10px] tracking-[0.2em]">
                        Enter Matrix
                        <ArrowRight className="h-3 w-3 ml-2 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </Link>
                    <button className="h-10 w-10 flex items-center justify-center rounded border border-transparent hover:border-rose-500/30 text-white/20 hover:text-rose-500 transition-colors" onClick={() => {
                      if (confirm('Are you sure you want to delete this project?')) {
                        deleteProject(project.id);
                      }
                    }}>
                       <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#D4AF37]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            </div>
          </motion.div>
        ))}
        
        {projects.length === 0 && !isCreating && (
          <motion.div variants={item} className="col-span-full">
            <div className="flex flex-col items-center justify-center py-32 px-4 elite-card border border-dashed border-white/10 relative overflow-hidden group">
              <div className="h-20 w-20 bg-black border border-white/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-700 group-hover:border-[#D4AF37]/30">
                <Building2 className="h-8 w-8 text-white/20 group-hover:text-[#D4AF37] transition-colors duration-700" />
              </div>
              <h3 className="text-xl font-playfair font-black text-white uppercase tracking-[0.1em] relative z-10">Empty Portfolio</h3>
              <p className="mt-3 text-white/40 max-w-sm text-center relative z-10 text-xs tracking-wide">Initialize your first villa construction asset to begin financial tracking.</p>
              <button onClick={() => setIsCreating(true)} className="elite-button mt-10 px-10 py-4 uppercase text-xs tracking-[0.1em]">
                Initialize Asset
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
