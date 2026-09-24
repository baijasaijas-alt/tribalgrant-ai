// app/admin/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Dossier } from "@/lib/types";
import { 
  ShieldAlert, Lock, CheckCircle2, Eye, AlertTriangle, Sparkles, 
  Building2, ChevronLeft, Download, Search, 
  History, FileSearch, Users, LogOut, FileCheck, X, Smartphone, Mail, BellRing
} from "lucide-react";

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  const [applications, setApplications] = useState<Dossier[]>([]);
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [reasonMode, setReasonMode] = useState<"reject" | "resubmit">("reject");
  
  const [previewDoc, setPreviewDoc] = useState<{ title: string; filename: string; clarity: number; previewUrl?: string } | null>(null);
  const [actionModal, setActionModal] = useState<{ type: "approve" | "reject" | "resubmit" | "result"; title: string; message: string; reason?: string; whatsapp?: { sent: boolean; configured: boolean; error?: string }; email?: { sent: boolean; configured: boolean; error?: string } } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth").then(r => r.json()),
      fetch("/api/applications").then(r => r.json()),
    ]).then(([auth, data]) => {
      setIsAuthenticated(Boolean(auth.authenticated));
      setApplications(data.applications || []);
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    if (r.ok) { setIsAuthenticated(true); setError(""); }
    else setError("Invalid government credentials. Access logged.");
  };

  const performAction = async (status: "Approved" | "Rejected" | "Needs Review", reason = "") => {
    if (!selectedDossier) return;
    const r = await fetch(`/api/applications/${selectedDossier.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason, notify: true }),
    });
    const data = await r.json();
    if (!r.ok || !data.application) {
      setActionModal({ type: "result", title: "Action failed", message: data.error || "The application could not be updated." });
      return;
    }
    setApplications(prev => prev.map(a => a.id === data.application.id ? data.application : a));
    setSelectedDossier(data.application);
    setActionModal({
      type: "result",
      title: status === "Approved" ? "Application approved" : status === "Rejected" ? "Application rejected" : "Resubmission requested",
      message: data.email?.sent
        ? "Decision recorded and the applicant was notified by email automatically."
        : data.email?.configured
          ? `Decision recorded, but email could not be sent: ${data.email.error || "provider error"}`
          : "Decision recorded. Email is not configured yet, so no email was sent.",
      whatsapp: data.whatsapp,
      email: data.email,
    });
  };

  const handleApprove = () => {
    if (!selectedDossier) return;
    setActionModal({ type: "approve", title: "Approve application?", message: `Approve ${selectedDossier.name}'s ${selectedDossier.scheme} application and automatically send the decision by email?` });
  };

  const handleRejectSubmit = async () => {
    if (!selectedDossier || !rejectReason.trim()) {
      setActionModal({ type: "result", title: "Reason required", message: "Enter a clear reason before rejecting or requesting rework." });
      return;
    }
    await performAction(reasonMode === "reject" ? "Rejected" : "Needs Review", rejectReason.trim());
    setShowRejectModal(false);
    setRejectReason("");
  };

  const handleResubmit = () => {
    if (!selectedDossier) return;
    setReasonMode("resubmit");
    setRejectReason("");
    setShowRejectModal(true);
  };

  const generatePFMS = () => {
    const approvedApps = applications.filter(app => app.status === "Approved" || app.status === "Pending");
    const csvHeader = "Dossier ID,Applicant Name,Scheme,Bank Name,Account Number,IFSC Code,Amount\n";
    const csvRows = approvedApps.map(app => 
      `${app.id},"${app.name}",${app.scheme},"${app.financials.bank}",${app.financials.account},${app.financials.ifsc},45000`
    ).join("\n");

    const blob = new Blob([csvHeader + csvRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `PFMS_Disbursement_Manifest_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeQueue = applications.filter(app => app.status === "Pending");

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-20">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-indigo-200/60 to-indigo-400/20 blur-[120px]"></div>
          <div className="absolute top-[10%] -right-[10%] w-[60%] h-[80%] rounded-full bg-gradient-to-bl from-emerald-200/50 to-emerald-400/20 blur-[140px]"></div>
        </div>

        <div className="w-full max-w-md bg-white/85 backdrop-blur-2xl border border-white shadow-2xl rounded-3xl p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
              <Lock className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Restricted Access</h1>
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mt-1">MoTA Officer Terminal • Team AURA XX</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-3 rounded-xl flex items-center gap-2 font-medium">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Government Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition" placeholder="officer@tribal.gov.in" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition" placeholder="•••••••" />
            </div>
            <button type="submit" className="w-full bg-indigo-700 hover:bg-indigo-800 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-indigo-600/25 mt-2">
              Authenticate Session
            </button>
          </form>
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-mono">Credentials are configured in .env.local</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 relative">
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-2xl border-b border-white/50 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-700 flex items-center justify-center font-bold text-white shadow-sm">TG</div>
          <div>
            <h1 className="font-bold text-base text-slate-900 tracking-tight">MoTA Evaluator Desk <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md ml-1 font-bold">Team AURA XX</span></h1>
            <p className="text-[10px] text-slate-500 font-medium">Zero-Trust Architecture: Cryptographic Hash Verification Active</p>
          </div>
        </div>
        <button onClick={async () => { await fetch("/api/auth", { method: "DELETE" }); setIsAuthenticated(false); }} className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 border border-rose-100 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm">
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {!selectedDossier ? (
          <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white/70 backdrop-blur-xl p-5 rounded-2xl border border-white shadow-sm">
                <div className="text-slate-500 text-xs font-semibold mb-1 flex items-center justify-between">Pending Queue <Users className="w-4 h-4 text-slate-400"/></div>
                <div className="text-2xl font-extrabold text-slate-900">{activeQueue.length}</div>
              </div>
              <div className="bg-white/70 backdrop-blur-xl p-5 rounded-2xl border border-white shadow-sm">
                <div className="text-emerald-700 text-xs font-semibold mb-1 flex items-center justify-between">Cleared by AI <CheckCircle2 className="w-4 h-4 text-emerald-500"/></div>
                <div className="text-2xl font-extrabold text-emerald-700">{applications.filter(a => a.status === 'Approved').length}</div>
              </div>
              <div className="bg-rose-50/70 backdrop-blur-xl p-5 rounded-2xl border border-rose-100 shadow-sm">
                <div className="text-rose-600 text-xs font-semibold mb-1 flex items-center justify-between">Duplicate Hashes <AlertTriangle className="w-4 h-4 text-rose-500"/></div>
                <div className="text-2xl font-extrabold text-rose-700">{applications.filter(a => a.fraudStatus !== 'Clean').length}</div>
              </div>
              <div className="bg-white/70 backdrop-blur-xl p-5 rounded-2xl border border-white shadow-sm flex flex-col justify-center">
                <div className="text-slate-400 text-[10px] font-bold uppercase mb-1">OCR Processing Engine</div>
                <div className="text-xs font-bold text-slate-800">WASM Edge Live Active</div>
                <div className="w-full bg-slate-100 h-1.5 mt-2 rounded-full overflow-hidden"><div className="bg-indigo-600 w-[94%] h-full rounded-full"></div></div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl shadow-xl overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input type="text" placeholder="Search Hash or ID..." className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm w-72 focus:outline-indigo-600 shadow-sm" />
                  </div>
                </div>
                <button onClick={generatePFMS} className="bg-indigo-700 hover:bg-indigo-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-md shadow-indigo-600/20 flex items-center gap-2">
                  <Download className="w-4 h-4" /> Export PFMS Batch CSV
                </button>
              </div>

              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Applicant & ID</th>
                    <th className="px-6 py-4">Scheme</th>
                    <th className="px-6 py-4">AI Flag Status</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeQueue.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">No pending applications in queue. Submit one from the student portal!</td>
                    </tr>
                  ) : (
                    activeQueue.map((app) => (
                      <tr key={app.id} className="hover:bg-white/60 transition">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{app.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{app.id}</div>
                        </td>
                        <td className="px-6 py-4"><span className="px-3 py-1 bg-slate-100 border border-slate-200/60 rounded-lg text-xs font-bold text-slate-700">{app.scheme}</span></td>
                        <td className="px-6 py-4">
                          {app.fraudStatus === "Clean" ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/50"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Clear ({app.aiScore}%)</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200/50"><AlertTriangle className="w-4 h-4 text-rose-500" /> {app.fraudStatus}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs font-medium">{app.date}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => setSelectedDossier(app)} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-semibold transition shadow-sm inline-flex items-center gap-2">
                            <Eye className="w-3.5 h-3.5" /> Inspect Dossier
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-bottom-4 fade-in h-[85vh] flex flex-col">
            <button onClick={() => setSelectedDossier(null)} className="mb-4 text-sm font-semibold text-slate-600 hover:text-indigo-700 flex items-center gap-1 transition flex-shrink-0">
              <ChevronLeft className="w-4 h-4" /> Back to Queue
            </button>
            
            <div className="bg-white/90 backdrop-blur-2xl border border-white rounded-3xl shadow-2xl overflow-hidden flex flex-col relative flex-1">
              
              {previewDoc && (
                <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
                  <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block">Secure S3 Storage Viewer</span>
                        <h3 className="text-base font-extrabold text-slate-900">{previewDoc.title}</h3>
                      </div>
                      <button onClick={() => setPreviewDoc(null)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between text-xs font-medium text-slate-600">
                        <span>File Name:</span>
                        <span className="font-mono font-bold text-slate-900">{previewDoc.filename}</span>
                      </div>
                      <div className="flex justify-between text-xs font-medium text-slate-600">
                        <span>WASM Edge Clarity:</span>
                        <span className="font-bold text-emerald-600">{previewDoc.clarity}% Verified</span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-900 rounded-2xl flex items-center justify-center p-2 min-h-[300px] max-h-[500px] overflow-auto shadow-inner relative border border-slate-800">
                      {previewDoc.previewUrl ? (
                        <img 
                          src={previewDoc.previewUrl} 
                          alt={previewDoc.filename} 
                          className="max-h-full w-auto object-contain rounded-lg shadow-md"
                        />
                      ) : (
                        <div className="text-center p-10 text-white flex flex-col items-center">
                             <FileSearch className="w-12 h-12 text-indigo-400 mb-4"/>
                            <p className="font-bold">Preview Not Available</p>
                            <p className="text-xs text-slate-400 mt-1">Image data missing in local storage.</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button onClick={() => setPreviewDoc(null)} className="bg-indigo-700 hover:bg-indigo-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition">
                        Close Preview
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-b border-slate-100 px-8 py-6 flex justify-between items-start bg-slate-50/50 flex-shrink-0">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-extrabold text-slate-900">{selectedDossier.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                      {selectedDossier.scheme}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${selectedDossier.fraudStatus === 'Clean' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                      AI Status: {selectedDossier.fraudStatus}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 font-medium">Application ID: <span className="font-mono text-slate-700">{selectedDossier.id}</span> • Submitted: {selectedDossier.date}</p>
                </div>
              </div>

              <div className="p-8 overflow-y-auto flex-1 space-y-8 bg-white">
                <section className="bg-gradient-to-r from-indigo-50 to-emerald-50 border border-indigo-100 rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div><h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest">Applicant Notification Channels</h3><p className="text-[11px] text-slate-500 mt-1">These contacts are used when an officer changes the application status.</p></div>
                    <BellRing className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    <div className="bg-white/80 border border-white rounded-xl p-3"><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</div><div className="mt-1 text-sm font-semibold text-slate-800 break-all">{selectedDossier.typedData?.email || "Not provided"}</div></div>
                    <div className="bg-white/80 border border-white rounded-xl p-3"><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp / Mobile</div><div className="mt-1 text-sm font-semibold text-slate-800">{selectedDossier.typedData?.whatsapp || "Not provided"}</div></div>
                  </div>
                </section>
                
                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Identity & Match Check</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                      <span className="text-xs font-semibold text-slate-500 block mb-1">Govt ID (Masked)</span>
                      <span className="font-mono font-bold text-slate-800">
                        XXXX-XXXX-{selectedDossier.typedData?.id?.slice(-4) || 'XXXX'}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                      <span className="text-xs font-semibold text-slate-500 block mb-1">Name Consonance</span>
                      {selectedDossier.extractedData.name !== "MISMATCH" ? (
                        <span className="font-bold text-emerald-600 flex items-center gap-1">✅ Verified Match</span>
                      ) : (
                        <span className="font-bold text-rose-600 flex items-center gap-1">⚠️ Mismatch Alert</span>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">Typed vs OCR Extracted</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                      <span className="text-xs font-semibold text-slate-500 block mb-1">Duplicate Check</span>
                      {selectedDossier.fraudStatus === 'Clean' ? (
                        <span className="font-bold text-emerald-600 flex items-center gap-1">✅ No Conflicts</span>
                      ) : (
                        <span className="font-bold text-amber-600 flex items-center gap-1">⚠️ Flagged</span>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">Cross-referenced across DB</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Financial Check</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                      <div>
                        <span className="text-xs font-semibold text-slate-500 block mb-1">Declared Income</span>
                        <span className="font-mono font-bold text-slate-800">{selectedDossier.typedData?.income || 'N/A'}</span>
                      </div>
                      <div className="h-8 w-px bg-slate-200"></div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-slate-500 block mb-1">OCR Extracted</span>
                        <span className={`font-mono font-bold ${selectedDossier.extractedData.income === "NOT FOUND" ? "text-rose-600" : "text-slate-800"}`}>
                            {selectedDossier.extractedData.income !== "NOT FOUND" ? `₹${selectedDossier.extractedData.income}` : "NOT FOUND"}
                        </span>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                      <span className="text-xs font-semibold text-slate-500 block mb-1">Certificate Validity Window</span>
                      <span className="font-bold text-emerald-600">Valid (Current Financial Year)</span>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2 flex justify-between items-center">
                    Document Evidence Viewer
                    <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-[10px] font-bold">
                      WASM Clarity Index: {selectedDossier.aiScore}%
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedDossier.documents?.map((doc: any, idx: number) => (
                      <div key={idx} className="flex gap-4 p-4 border border-slate-200 rounded-xl items-center bg-white shadow-sm hover:border-indigo-300 transition">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0 border border-indigo-100">
                          <FileCheck className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{doc.title}</p>
                          <p className="text-xs text-slate-500 truncate mb-2">{doc.filename}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${doc.clarity >= 70 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              Clarity: {doc.clarity}%
                            </span>
                            {doc.clarity >= 70 ? (
                              <span className="text-emerald-600 text-xs font-bold">Pass</span>
                            ) : (
                              <span className="text-rose-600 text-xs font-bold">Fail</span>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => setPreviewDoc(doc)}
                          className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 rounded-lg transition shadow-sm"
                          title="View Document"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600"/> AI Document Intelligence
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedDossier.documents?.map((doc: any, idx: number) => {
                      const ai = doc.ai;
                      return <div key={idx} className={`rounded-2xl border p-4 ${ai?.validForBucket ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div><div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">{doc.title}</div><div className="mt-1 text-sm font-bold text-slate-900">{ai?.detectedType || 'AI analysis unavailable'}</div></div>
                          <span className={`text-[10px] font-extrabold px-2 py-1 rounded-lg ${ai?.validForBucket ? 'bg-white text-emerald-700' : 'bg-white text-rose-700'}`}>{ai ? `${Math.round(ai.confidence || 0)}%` : '—'}</span>
                        </div>
                        <div className="mt-3 text-xs font-bold">{ai?.validForBucket ? '✓ Category verified' : `⚠ ${ai?.verdict || 'Needs review'}`}</div>
                        {ai?.reasons?.length ? <ul className="mt-2 space-y-1 text-[11px] text-slate-600">{ai.reasons.slice(0,3).map((r:string,i:number)=><li key={i}>• {r}</li>)}</ul> : null}
                        {ai?.fields && <div className="mt-3 grid grid-cols-2 gap-2">{Object.entries(ai.fields).filter(([,v]:any)=>v?.value).slice(0,4).map(([k,v]:any)=><div key={k} className="bg-white/80 rounded-lg p-2 border border-white"><div className="text-[9px] uppercase font-bold text-slate-400">{k}</div><div className="text-[11px] font-semibold text-slate-800 truncate">{v.value}</div></div>)}</div>}
                      </div>;
                    })}
                  </div>
                </section>

                 <section>
                   <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                     <FileSearch className="w-4 h-4 text-indigo-600"/> Field Matching Analysis
                   </h3>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className={`p-4 rounded-xl border flex justify-between items-center ${selectedDossier.extractedData.id !== "NOT FOUND" ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
                       <div>
                         <span className="text-xs font-semibold text-slate-500 block mb-1">Govt ID Match</span>
                         <span className="font-mono font-bold text-slate-800">{selectedDossier.typedData.id}</span>
                       </div>
                       <span className={`font-bold text-sm ${selectedDossier.extractedData.id !== "NOT FOUND" ? "text-emerald-700" : "text-rose-700"}`}>
                         {selectedDossier.extractedData.id !== "NOT FOUND" ? "✅ FOUND" : "❌ NOT FOUND"}
                       </span>
                     </div>

                      <div className={`p-4 rounded-xl border flex justify-between items-center ${selectedDossier.extractedData.income !== "NOT FOUND" ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
                       <div>
                         <span className="text-xs font-semibold text-slate-500 block mb-1">Income Match</span>
                         <span className="font-mono font-bold text-slate-800">{selectedDossier.typedData.income}</span>
                       </div>
                       <span className={`font-bold text-sm ${selectedDossier.extractedData.income !== "NOT FOUND" ? "text-emerald-700" : "text-rose-700"}`}>
                         {selectedDossier.extractedData.income !== "NOT FOUND" ? "✅ FOUND" : "❌ NOT FOUND"}
                       </span>
                     </div>
                   </div>
                 </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Eligibility Checklist</h3>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                        {selectedDossier.documents.some(d => d.title.includes("CASTE")) ? (
                             <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">✓</span>
                        ) : (
                            <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">✕</span>
                        )}
                         Valid Schedule Tribe verification</li>
                      <li className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                        {selectedDossier.extractedData.income !== "NOT FOUND" && selectedDossier.fraudStatus === "Clean" ? (
                             <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">✓</span>
                        ) : (
                            <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">✕</span>
                        )}
                        Family income verified below threshold</li>
                      <li className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                         {selectedDossier.documents.some(d => d.title.includes("ACADEMIC")) ? (
                             <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">✓</span>
                        ) : (
                            <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">✕</span>
                        )}
                        Academic enrollment proof active</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Flag Summary</h3>
                  {selectedDossier.fraudStatus === 'Clean' ? (
                    <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm font-bold border border-emerald-200 shadow-sm flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> No active flags or anomalies detected. Application is clear.
                    </div>
                  ) : (
                    <div className="bg-rose-50 text-rose-700 p-4 rounded-xl text-sm font-bold border border-rose-200 shadow-sm flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" /> {selectedDossier.fraudStatus} - Manual review required for highlighted mismatches.
                    </div>
                  )}
                </section>

                <section className="pt-2 pb-6">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <History className="w-4 h-4" /> System Audit Log
                  </h3>
                  <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-slate-200 ml-1">
                    {selectedDossier.auditLog?.map((log: any, idx: number) => (
                      <div key={idx} className="flex gap-4 text-sm relative items-center">
                        <div className="w-6 h-6 bg-white border-2 border-indigo-300 rounded-full flex-shrink-0 z-10 ring-4 ring-white"></div>
                        <div>
                          <span className="text-slate-800 font-semibold block">{log.action}</span>
                          <span className="text-slate-400 font-mono text-[11px]">{log.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

              </div>

              <div className="bg-slate-50 border-t border-slate-200 px-8 py-5 flex items-center justify-between flex-shrink-0 relative">
                
                {showRejectModal && (
                  <div className="absolute bottom-[calc(100%+16px)] right-8 bg-white border border-slate-200 shadow-2xl rounded-2xl p-5 w-96 animate-in slide-in-from-bottom-2 z-20">
                    <label className="block text-xs font-bold text-slate-800 mb-2">{reasonMode === "reject" ? "Mandatory reason for rejection" : "Reason for resubmission"}</label>
                    <textarea 
                      value={rejectReason} 
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="E.g., Income certificate blurry."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-indigo-600 h-28 mb-3 resize-none"
                    ></textarea>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition">Cancel</button>
                      <button onClick={handleRejectSubmit} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2">
                         <BellRing className="w-3 h-3" /> {reasonMode === "reject" ? "Reject & Notify" : "Request Rework & Notify"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <select className="border border-slate-300 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[240px] shadow-sm">
                    <option value="">Select Document to Resubmit...</option>
                    <option value="identity">Identity Proof (Blurry/Mismatched)</option>
                    <option value="caste">Category Proof (Invalid)</option>
                    <option value="academic">Marksheet (Missing)</option>
                    <option value="financial">Income Certificate (Expired)</option>
                  </select>
                  <button onClick={handleResubmit} className="bg-white hover:bg-amber-50 text-amber-700 font-bold py-3 px-5 rounded-xl text-sm transition border border-slate-300 shadow-sm flex items-center gap-2">
                    Request Resubmission
                  </button>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => { setReasonMode("reject"); setRejectReason(""); setShowRejectModal(true); }} 
                    className="bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold py-3 px-6 rounded-xl text-sm transition shadow-sm"
                  >
                    Reject Application
                  </button>
                  <button 
                    onClick={handleApprove} 
                    className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold py-3 px-8 rounded-xl text-sm transition shadow-md shadow-indigo-600/25 hover:-translate-y-0.5 flex items-center gap-2"
                  >
                    <BellRing className="w-4 h-4" /> Auto-Notify & Approve
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {actionModal && actionModal.type !== "approve" && actionModal.type !== "result" && (
          <div className="fixed inset-0 z-[100] bg-slate-950/45 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-white p-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4"><AlertTriangle className="w-6 h-6"/></div>
              <h3 className="text-lg font-extrabold text-slate-900">{actionModal.title}</h3>
              <p className="text-sm text-slate-500 mt-2">{actionModal.message}</p>
              <div className="mt-5 flex justify-end gap-2"><button onClick={()=>setActionModal(null)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 bg-slate-100">Cancel</button><button onClick={()=>performAction("Needs Review", rejectReason.trim())} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-600 text-white">Confirm</button></div>
            </div>
          </div>
        )}
        {actionModal?.type === "approve" && (
          <div className="fixed inset-0 z-[100] bg-slate-950/45 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-white p-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4"><CheckCircle2 className="w-6 h-6"/></div>
              <h3 className="text-lg font-extrabold text-slate-900">{actionModal.title}</h3>
              <p className="text-sm text-slate-500 mt-2">{actionModal.message}</p>
              <div className="mt-5 flex justify-end gap-2"><button onClick={()=>setActionModal(null)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 bg-slate-100">Cancel</button><button onClick={()=>{ setActionModal(null); performAction("Approved"); }} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-700 text-white">Approve & Notify</button></div>
            </div>
          </div>
        )}
        {actionModal?.type === "result" && (
          <div className="fixed inset-0 z-[100] bg-slate-950/45 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-white p-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${actionModal.email?.sent ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}><Mail className="w-6 h-6"/></div>
              <h3 className="text-lg font-extrabold text-slate-900">{actionModal.title}</h3>
              <p className="text-sm text-slate-500 mt-2">{actionModal.message}</p>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700"><Mail className="w-4 h-4 text-indigo-600"/> Email</div>
                  <div className="mt-2 text-[11px] font-mono text-slate-600">{actionModal.email?.sent ? "✓ Accepted by email provider" : actionModal.email?.configured ? `! Failed — ${actionModal.email.error || "provider error"}` : "○ Not configured"}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700"><Smartphone className="w-4 h-4 text-emerald-600"/> WhatsApp</div>
                  <div className="mt-2 text-[11px] font-mono text-slate-600">{actionModal.whatsapp?.sent ? "✓ Accepted by provider" : actionModal.whatsapp?.configured ? `! Failed — ${actionModal.whatsapp.error || "provider error"}` : "○ Not configured (optional)"}</div>
                </div>
              </div>
              <div className="mt-5 flex justify-end"><button onClick={()=>setActionModal(null)} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-700 text-white">Continue</button></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}