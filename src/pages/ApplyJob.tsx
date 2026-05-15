import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Upload, CheckCircle2, AlertCircle, Briefcase, User, Mail, FileText, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function ApplyJob() {
  const { id } = useParams();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "" });
  const [cvFile, setCvFile] = useState<File | null>(null);

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then(res => res.json())
      .then(data => setJob(data))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cvFile) return;

    setSubmitting(true);
    
    // Simulate reading file as base64 for the demo/proxy
    const reader = new FileReader();
    reader.readAsDataURL(cvFile);
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      
      try {
        const res = await fetch(`/api/jobs/${id}/candidates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            cvBase64: base64
          })
        });

        if (res.ok) {
          setSubmitted(true);
        } else {
          alert("Error al enviar tu postulación. Inténtalo de nuevo.");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSubmitting(false);
      }
    };
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (!job || job.status === 'archived') return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
        <AlertCircle size={40} />
      </div>
      <h2 className="text-2xl font-bold text-slate-900">Esta vacante ya no está receptando candidatos</h2>
      <p className="text-slate-500 mt-2">La posición ha sido cerrada o el link ha expirado.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white md:bg-slate-50 flex flex-col items-center py-12 px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl"
      >
        <header className="mb-12 text-center">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-100">
            <Briefcase size={24} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{job.title}</h1>
          <p className="text-slate-500 mt-3 text-lg">Postúlate ahora para formar parte de RecruitFlow</p>
        </header>

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div 
              key="form"
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white md:p-10 md:rounded-3xl md:shadow-xl md:shadow-slate-200/50 md:border md:border-slate-100 space-y-8"
            >
              <section className="space-y-4">
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-indigo-500" />
                  Descripción del Puesto
                </h3>
                <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl text-sm border border-slate-100">
                  {job.description}
                </p>
              </section>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5 px-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <User size={14} /> Nombre Completo
                    </label>
                    <input 
                      required
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      placeholder="Juan Pérez"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5 px-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Mail size={14} /> Correo Electrónico
                    </label>
                    <input 
                      required
                      type="email"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      placeholder="juan@ejemplo.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5 px-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <FileText size={14} /> Cargar CV (PDF)
                    </label>
                    <div 
                      className={`relative group border-2 border-dashed rounded-xl p-8 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer ${
                        cvFile ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                      onClick={() => document.getElementById('cv-upload')?.click()}
                    >
                      <input 
                        id="cv-upload"
                        type="file" 
                        className="hidden" 
                        accept=".pdf"
                        onChange={e => setCvFile(e.target.files?.[0] || null)}
                      />
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                        cvFile ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                      }`}>
                        <Upload size={24} />
                      </div>
                      <div className="text-center">
                        <p className={`font-bold text-sm ${cvFile ? 'text-emerald-700' : 'text-slate-600 group-hover:text-indigo-700'}`}>
                          {cvFile ? cvFile.name : "Selecciona o arrastra tu PDF"}
                        </p>
                        {!cvFile && <p className="text-[11px] text-slate-400">Tamaño máximo 5MB</p>}
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  disabled={submitting || !cvFile || !formData.name || !formData.email}
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all hover:translate-y-[-2px]"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Procesando tu CV...
                    </>
                  ) : (
                    <>
                      Enviar Postulación <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-12 rounded-3xl shadow-xl border border-slate-100 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-3xl font-bold text-slate-900">¡Postulación Enviada!</h2>
              <p className="text-slate-500 text-lg">Hemos recibido tu CV correctamente. Nuestro equipo de RRHH revisará tu perfil con ayuda de nuestra IA y te contactaremos pronto.</p>
              <div className="pt-6">
                <button 
                  onClick={() => window.location.reload()}
                  className="text-indigo-600 font-bold hover:underline"
                >
                  Volver a intentar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-12 text-center text-slate-400 text-sm">
          Propulsado por <span className="font-bold text-slate-600">RecruitFlow AI</span>
        </footer>
      </motion.div>
    </div>
  );
}
