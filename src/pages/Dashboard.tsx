import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Users, Clock, ArrowUpRight, Search, Archive } from "lucide-react";
import { motion } from "motion/react";

export default function Dashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'active' | 'archived'>('active');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [jobsRes, metricsRes] = await Promise.all([
        fetch(`/api/jobs?status=${view}`),
        fetch('/api/metrics')
      ]);
      const jobsData = await jobsRes.json();
      const metricsData = await metricsRes.json();
      setJobs(Array.isArray(jobsData) ? jobsData : []);
      setMetrics(metricsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [view]);

  const handleArchive = async (id: string) => {
    if (!confirm("¿Seguro que quieres archivar esta vacante? Dejará de recibir postulaciones.")) return;
    try {
      await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !metrics) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10 pb-20"
    >
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Panel de Control</h2>
          <p className="text-slate-500 mt-1">Gestiona tus vacantes y candidatos asistidos por IA.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setView('active')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'active' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Activas
          </button>
          <button 
            onClick={() => setView('archived')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'archived' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Histórico
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Vacantes Activas", value: metrics?.activeJobsCount || 0, icon: Briefcase, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Finalizadas", value: metrics?.archivedJobsCount || 0, icon: Archive, color: "text-slate-600", bg: "bg-slate-100" },
          { label: "Candidatos", value: metrics?.totalCandidates || 0, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Match Promedio", value: (metrics?.avgFit || 0) + "%", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((stat, i) => (
          <div key={i} className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h4 className="text-2xl font-bold text-slate-900">{stat.value}</h4>
            </div>
            <div className={`p-3 ${stat.bg} ${stat.color} rounded-xl`}>
              <stat.icon size={20} />
            </div>
          </div>
        ))}
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-900 text-lg uppercase tracking-tight">
            {view === 'active' ? 'Vacantes Recientes' : 'Vacantes Archivadas'}
          </h3>
          {view === 'active' && (
            <Link to="/create-job" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              Nueva Vacante <ArrowUpRight size={14} />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4">
          {jobs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Briefcase size={32} />
              </div>
              <p className="text-slate-500">No hay vacantes en esta sección.</p>
              {view === 'active' && <Link to="/create-job" className="text-indigo-600 font-semibold mt-2 inline-block">Crea tu primera vacante</Link>}
            </div>
          ) : (
            jobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-500 hover:shadow-md transition-all duration-200 p-6">
                  <div className="flex items-center justify-between">
                    <Link to={`/jobs/${job.id}`} className="flex-1 flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <Briefcase size={24} />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{job.title}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                          <span className="flex items-center gap-1"><Users size={14} /> Candidatos en revisión</span>
                          <span>•</span>
                          <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </Link>
                    
                    <div className="flex items-center gap-4">
                       <button 
                        onClick={() => handleArchive(job.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        title={view === 'active' ? "Archivar vacante" : "Eliminar permanentemente"}
                       >
                         <Archive size={20} />
                       </button>
                       <Link to={`/jobs/${job.id}`} className="text-slate-300 group-hover:text-indigo-300 group-hover:translate-x-1 transition-all">
                        <ArrowUpRight size={24} />
                       </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>
    </motion.div>
  );
}

