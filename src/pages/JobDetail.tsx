import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Briefcase, Users, Target, ArrowLeft, Upload, CheckCircle2, ChevronRight, Star } from "lucide-react";
import { motion } from "motion/react";

export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/jobs/${id}`).then(res => res.json()),
      fetch(`/api/jobs/${id}/candidates`).then(res => res.json())
    ]).then(([jobData, candidateData]) => {
      setJob(jobData);
      setCandidates(candidateData);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );
  
  if (!job) return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-bold text-slate-900">Puesto no encontrado</h2>
      <Link to="/" className="text-indigo-600 mt-4 block">Volver al Dashboard</Link>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      <header className="flex flex-col gap-4">
        <Link to="/" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors w-fit">
          <ArrowLeft size={16} /> Volver al listado
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">Abierta</span>
              <span className="text-slate-400 text-sm">{new Date(job.createdAt).toLocaleDateString()}</span>
            </div>
            <h2 className="text-4xl font-bold text-slate-900 tracking-tight">{job.title}</h2>
            <p className="text-slate-500 mt-3 max-w-2xl leading-relaxed">{job.description}</p>
          </div>
          <button className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
            <Upload size={18} /> Subir CV (Manual)
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <main className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Users size={20} className="text-indigo-500" />
                Candidatos en Proceso ({candidates.length})
              </h3>
              <div className="flex gap-2">
                <select className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none">
                  <option>Mejor Fit</option>
                  <option>Más Reciente</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {candidates.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 italic">No hay candidatos postulados para esta vacante.</p>
                </div>
              ) : (
                candidates.map((candidate, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={candidate.id} 
                    className="group p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-500 transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold">
                          {candidate.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{candidate.name}</h4>
                          <p className="text-xs text-slate-400 font-medium">{candidate.email} • Aplicado hace 2 días</p>
                        </div>
                      </div>
                      <div className={`flex flex-col items-end`}>
                        <div className={`flex items-center gap-1 font-mono font-bold text-lg ${
                          candidate.fitScore > 80 ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {candidate.fitScore}<span className="text-xs opacity-50">%</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Match Score</span>
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-slate-600 text-sm leading-relaxed italic truncate">
                        "{candidate.summary}"
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </section>
        </main>

        <aside className="space-y-8">
          <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Target size={18} className="text-indigo-500" />
              Criterios IA
            </h3>
            <div className="space-y-3">
              {job.criteria?.map((c: any) => (
                <div key={c.id} className="p-4 bg-slate-50 rounded-xl group hover:bg-white border border-transparent hover:border-indigo-100 transition-all">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-800 text-sm">{c.name}</span>
                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">{c.weight}%</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight line-clamp-2">
                    {c.description}
                  </p>
                  {c.isKiller && (
                    <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-red-500 uppercase tracking-tighter">
                      <Star size={10} fill="currentColor" /> Critico para la vacante
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-indigo-600 p-6 rounded-2xl text-white shadow-xl shadow-indigo-200">
            <h4 className="font-bold mb-2">Asistente de Reclutamiento</h4>
            <p className="text-sm text-indigo-100 leading-relaxed mb-4">
              ¿Quieres que redacte un correo para los mejores candidatos de esta lista?
            </p>
            <button className="w-full bg-white text-indigo-600 py-3 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
               Generar Mensajes <ChevronRight size={16} />
            </button>
          </section>
        </aside>
      </div>
    </motion.div>
  );
}

