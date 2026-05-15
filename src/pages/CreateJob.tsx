import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, PlusCircle, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function CreateJob() {
  const [formData, setFormData] = useState({ title: "", description: "" });
  const [criteria, setCriteria] = useState<any[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const handleSuggest = async () => {
    if (!formData.title || !formData.description) return;
    setSuggesting(true);
    try {
      const res = await fetch('/api/jobs/suggest-criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      
      if (data.error) {
        alert("Error de IA: " + data.details);
        return;
      }

      if (Array.isArray(data)) {
        setCriteria(data.map((c: any) => ({ ...c, id: Math.random().toString(36).substr(2, 9) })));
        setStep(2);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSuggesting(false);
    }
  };

  const handleSave = async () => {
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, criteria }),
    });
    if (res.ok) navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto py-4">
      <header className="mb-10 text-center">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Publicar Vacante</h2>
        <p className="text-slate-500 mt-2">Configura los detalles del puesto y deja que la IA defina los criterios.</p>
        
        <div className="flex items-center justify-center gap-4 mt-8">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-indigo-600' : 'text-slate-300'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200'}`}>1</span>
            <span className="text-sm font-semibold">Definición</span>
          </div>
          <div className="w-12 h-[2px] bg-slate-200" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-indigo-600' : 'text-slate-300'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200'}`}>2</span>
            <span className="text-sm font-semibold">Criterios IA</span>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6"
          >
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Título de la Vacante</label>
              <input 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400" 
                placeholder="Ej. Senior Frontend Developer"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Descripción del Puesto</label>
              <textarea 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl h-48 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 resize-none" 
                placeholder="Describe las responsabilidades, requisitos y cultura..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <button 
              onClick={handleSuggest}
              disabled={suggesting || !formData.title || !formData.description}
              className="w-full bg-indigo-600 text-white py-4 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all hover:translate-y-[-2px] active:translate-y-0"
            >
              {suggesting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  IA Analizando...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Sugerir Criterios con IA
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900 leading-tight">Criterios Generados</h3>
                <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded uppercase tracking-widest">Sugerencia IA</span>
              </div>
              
              <div className="space-y-3">
                {criteria.map((c, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={c.id} 
                    className="p-5 bg-slate-50 border border-slate-100 rounded-xl relative group hover:bg-white hover:border-indigo-100 transition-all"
                  >
                    <button 
                      onClick={() => setCriteria(prev => prev.filter(item => item.id !== c.id))}
                      className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>

                    <div className="flex flex-wrap gap-4 items-start">
                      <div className="flex-1 min-w-[200px] space-y-3">
                        <input 
                          value={c.name}
                          onChange={e => {
                            const newCriteria = [...criteria];
                            newCriteria[i].name = e.target.value;
                            setCriteria(newCriteria);
                          }}
                          className="bg-transparent font-bold text-slate-800 text-sm w-full outline-none focus:text-indigo-600"
                        />
                        <textarea 
                          value={c.description}
                          onChange={e => {
                            const newCriteria = [...criteria];
                            newCriteria[i].description = e.target.value;
                            setCriteria(newCriteria);
                          }}
                          className="bg-transparent text-[11px] text-slate-500 w-full outline-none focus:text-slate-800 resize-none h-12"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Peso</span>
                          <input 
                            type="number"
                            value={c.weight}
                            onChange={e => {
                              const newCriteria = [...criteria];
                              newCriteria[i].weight = parseInt(e.target.value) || 0;
                              setCriteria(newCriteria);
                            }}
                            className="w-12 h-8 rounded bg-white border border-slate-200 text-xs font-bold text-center outline-none focus:border-indigo-500"
                          />
                        </div>
                        <button 
                          onClick={() => {
                            const newCriteria = [...criteria];
                            newCriteria[i].isKiller = !newCriteria[i].isKiller;
                            setCriteria(newCriteria);
                          }}
                          className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded uppercase transition-all ${
                            c.isKiller ? 'text-red-500 bg-red-50' : 'text-slate-400 bg-slate-100'
                          }`}
                        >
                          <AlertCircle size={10} /> {c.isKiller ? "Killer" : "Normal"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                <button 
                  onClick={() => setCriteria([...criteria, { id: Date.now().toString(), name: "Nuevo Criterio", description: "Descripción del criterio...", weight: 10, isKiller: false }])}
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold text-sm hover:border-indigo-300 hover:text-indigo-500 transition-all flex items-center justify-center gap-2"
                >
                  <PlusCircle size={18} /> Añadir Criterio Manual
                </button>
              </div>

              <div className="flex gap-4 mt-10">
                <button 
                  onClick={() => setStep(1)} 
                  className="flex-1 flex items-center justify-center gap-2 text-slate-500 font-bold py-4 hover:bg-slate-50 rounded-xl transition-all"
                >
                  <ArrowLeft size={18} />
                  Volver
                </button>
                <button 
                  onClick={handleSave} 
                  className="flex-[2] bg-emerald-600 text-white py-4 rounded-xl hover:bg-emerald-700 font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all hover:translate-y-[-2px] active:translate-y-0"
                >
                  <CheckCircle2 size={18} />
                  Publicar Vacante
                </button>
              </div>
            </div>
            
            <div className="bg-indigo-50 p-4 rounded-xl flex gap-3 border border-indigo-100">
              <Sparkles className="text-indigo-600 shrink-0" size={20} />
              <p className="text-xs text-indigo-800 italic leading-relaxed">
                "He seleccionado estos criterios basándome en los estándares de la industria para el puesto de {formData.title}. Puedes ajustarlos manualmente si es necesario."
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

