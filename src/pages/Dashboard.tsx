import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Users, Clock, ArrowUpRight, Search } from "lucide-react";
import { motion } from "motion/react";

export default function Dashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/jobs')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setJobs(data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Panel de Control</h2>
          <p className="text-slate-500 mt-1">Gestiona tus vacantes y candidatos asistidos por IA.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar vacante..." 
            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-64"
          />
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Vacantes Activas", value: jobs.length, icon: Briefcase, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Candidatos Totales", value: "24", icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Tiempo para Contratar", value: "12d", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((stat, i) => (
          <div key={i} className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h4 className="text-2xl font-bold text-slate-900">{stat.value}</h4>
            </div>
            <div className={`p-3 ${stat.bg} ${stat.color} rounded-xl`}>
              <stat.icon size={24} />
            </div>
          </div>
        ))}
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-900 text-lg uppercase tracking-tight">Vacantes Recientes</h3>
          <Link to="/create-job" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            Nueva Vacante <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {jobs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Briefcase size={32} />
              </div>
              <p className="text-slate-500">No hay vacantes configuradas aún.</p>
              <Link to="/create-job" className="text-indigo-600 font-semibold mt-2 inline-block">Crea tu primera vacante</Link>
            </div>
          ) : (
            jobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link 
                  to={`/jobs/${job.id}`} 
                  className="group block p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-500 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <Briefcase size={24} />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{job.title}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                          <span className="flex items-center gap-1"><Users size={14} /> 0 candidatos</span>
                          <span>•</span>
                          <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-slate-300 group-hover:text-indigo-300 group-hover:translate-x-1 transition-all">
                      <ArrowUpRight size={24} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </section>
    </motion.div>
  );
}

