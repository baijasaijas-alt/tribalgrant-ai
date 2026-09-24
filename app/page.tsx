import Link from "next/link";
import { Globe2, GraduationCap, ShieldCheck, ChevronRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-100 font-sans text-slate-900 z-0">
      
      {/* Premium Mesh Gradient Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-20">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-indigo-200/60 to-indigo-400/20 blur-[120px]"></div>
        <div className="absolute top-[10%] -right-[10%] w-[60%] h-[80%] rounded-full bg-gradient-to-bl from-emerald-200/50 to-emerald-400/20 blur-[140px]"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-blue-200/50 to-indigo-200/20 blur-[120px]"></div>
      </div>

      {/* Frosted Glass Top Navigation with Team AURA XX Branding */}
      <header className="sticky top-0 z-50 bg-white/40 backdrop-blur-2xl border-b border-white/50 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-700 flex items-center justify-center font-bold text-white shadow-md">
            TG
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900">TribalGrant <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md ml-1 font-bold">AURA XX</span></h1>
            <p className="text-[10px] text-indigo-700 uppercase tracking-widest font-bold">Ministry of Tribal Affairs</p>
          </div>
        </div>
        
        <Link 
          href="/admin" 
          className="text-xs font-bold text-slate-700 hover:text-indigo-700 bg-white/60 hover:bg-white border border-white shadow-sm px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
        >
          <ShieldCheck className="w-4 h-4 text-indigo-600" /> Evaluator Portal
        </Link>
      </header>

      {/* Main Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-20 lg:py-28">
        
        <div className="text-center max-w-4xl mb-16 animate-in slide-in-from-bottom-6 fade-in duration-700">
          <div className="inline-block mb-4 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-extrabold uppercase tracking-widest shadow-sm">
            Developed by Team AURA XX • SIH 2026
          </div>
          <h2 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 text-slate-900 drop-shadow-sm leading-tight">
            National Scholarship <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-emerald-600">
              Disbursal Platform
            </span>
          </h2>
          <p className="text-slate-600 text-lg lg:text-xl font-medium leading-relaxed max-w-2xl mx-auto">
            The official portal for seamless application, document verification, and direct benefit transfers for higher education fellowships.
          </p>
        </div>

        {/* Scheme Information Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl w-full mb-16 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-150">
          
          {/* NFST Card */}
          <div className="group bg-white/70 backdrop-blur-xl p-8 rounded-3xl border border-white/80 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-emerald-100">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">NFST Fellowship</h3>
            <p className="text-sm text-slate-600 mb-6 font-medium leading-relaxed">
              National Fellowship for ST Students pursuing MPhil and PhD. Requires an annual family income strictly below ₹6.0 Lakh.
            </p>
            <ul className="text-sm font-semibold text-slate-700 space-y-3 mb-8">
              <li className="flex items-center gap-2.5"><CheckCircleIcon className="w-5 h-5 text-emerald-500"/> Valid 12-Digit Govt ID[cite: 5]</li>
              <li className="flex items-center gap-2.5"><CheckCircleIcon className="w-5 h-5 text-emerald-500"/> ST Certificate & PG Marksheet[cite: 5]</li>
            </ul>
          </div>

          {/* NOS Card */}
          <div className="group bg-white/70 backdrop-blur-xl p-8 rounded-3xl border border-white/80 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-indigo-100">
              <Globe2 className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">NOS Scholarship</h3>
            <p className="text-sm text-slate-600 mb-6 font-medium leading-relaxed">
              National Overseas Scholarship for ST students studying abroad. Requires an annual family income strictly below ₹8.0 Lakh.
            </p>
            <ul className="text-sm font-semibold text-slate-700 space-y-3 mb-8">
              <li className="flex items-center gap-2.5"><CheckCircleIcon className="w-5 h-5 text-indigo-500"/> Valid Passport ID[cite: 5]</li>
              <li className="flex items-center gap-2.5"><CheckCircleIcon className="w-5 h-5 text-indigo-500"/> Foreign University Offer Letter[cite: 5]</li>
            </ul>
          </div>
        </div>

        {/* The Action Button */}
        <div className="text-center animate-in zoom-in-95 fade-in duration-700 delay-300">
          <Link 
            href="/apply"
            className="group inline-flex items-center gap-3 bg-indigo-700 text-white font-bold text-lg px-10 py-5 rounded-2xl shadow-xl hover:shadow-indigo-600/40 hover:bg-indigo-800 hover:-translate-y-1 transition-all"
          >
            Start Application 
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

      </main>
    </div>
  );
}

function CheckCircleIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}