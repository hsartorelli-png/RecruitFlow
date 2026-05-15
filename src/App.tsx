import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, PlusCircle, Users, Briefcase, ChevronRight, Archive } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import CreateJob from "./pages/CreateJob";
import JobDetail from "./pages/JobDetail";
import ApplyJob from "./pages/ApplyJob";
import { motion } from "motion/react";

function SidebarItem({ to, icon: Icon, label }: { to: string, icon: any, label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link to={to}>
      <motion.div 
        whileHover={{ x: 4 }}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
          isActive 
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        }`}
      >
        <Icon size={20} className={isActive ? "text-white" : "text-slate-400"} />
        <span className="font-medium">{label}</span>
        {isActive && <ChevronRight size={16} className="ml-auto" />}
      </motion.div>
    </Link>
  );
}

function Sidebar() {
  const location = useLocation();
  const isApplyPage = location.pathname.startsWith('/apply');

  if (isApplyPage) return null;

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 shrink-0">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-indigo-100 shadow-xl">
            <Briefcase size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">RecruitFlow</h1>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">AI ATS System</p>
          </div>
        </div>

        <nav className="space-y-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-4">Recruiter Flow</p>
          <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <SidebarItem to="/create-job" icon={PlusCircle} label="Publicar Puesto" />
          
          <div className="pt-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-4">Talent Pool</p>
            <div className="flex items-center gap-3 px-4 py-3 text-slate-400 cursor-not-allowed opacity-50">
              <Users size={20} />
              <span className="font-medium">Candidatos</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 text-slate-400 cursor-not-allowed opacity-50">
              <Archive size={20} />
              <span className="font-medium">Histórico</span>
            </div>
          </div>
        </nav>
      </div>

      <div className="mt-auto p-8 border-t border-slate-100">
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-900 mb-1">IA Activa</p>
          <p className="text-[10px] text-slate-500 line-clamp-2">Modelos Gemini 1.5 Flash configurados para análisis de CV.</p>
        </div>
      </div>
    </aside>
  );
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen bg-[#F8FAFC] flex font-sans selection:bg-indigo-100 selection:text-indigo-900">
        <Sidebar />
        <main className="flex-1 min-h-screen">
          <Routes>
            <Route path="/" element={<div className="max-w-5xl mx-auto py-12 px-8"><Dashboard /></div>} />
            <Route path="/create-job" element={<div className="max-w-5xl mx-auto py-12 px-8"><CreateJob /></div>} />
            <Route path="/jobs/:id" element={<div className="max-w-5xl mx-auto py-12 px-8"><JobDetail /></div>} />
            <Route path="/apply/:id" element={<ApplyJob />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

