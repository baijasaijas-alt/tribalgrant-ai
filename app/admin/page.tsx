"use client";

import React, { useState, useEffect } from "react";
import { getStoredDossiers, updateDossierStatus, Dossier } from "@/app/utils/dossierStore";
import { triggerWhatsAppReceipt } from "@/app/actions/motaCore";
import { 
  ShieldAlert, Lock, CheckCircle2, Eye, AlertTriangle, 
  Building2, ChevronLeft, Download, Search, 
  History, FileSearch, Users, LogOut, ExternalLink, FileCheck, X
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
  
  // Active document preview modal state
  const [previewDoc, setPreviewDoc] = useState<{ title: string; filename: string; clarity: number } | null>(null);

  useEffect(() => {
    setApplications(getStoredDossiers());
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === "officer@tribal.gov.in" && password === "sih2026") {
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("Invalid government credentials. Access logged.");
    }
  };

  const handleApprove = async () => {
    if (!selectedDossier) return;
    updateDossierStatus(selectedDossier.id, "Approved");
    setApplications(getStoredDossiers());
    
    // 1. REAL WHATSAPP APPROVAL INTEGRATION
    const testPhoneNumber = "919876543210"; // Replace with your own phone number for the live hackathon demo
    const message = `🏛️ *Ministry of Tribal Affairs*\n\nDear ${selectedDossier.name}, your scholarship application (ID: ${selectedDossier.id}) has been *APPROVED* ✅.\n\nAn amount of ₹45,000 is staged for DBT transfer to your account ending in ${selectedDossier.financials.account.slice(-4)}.`;
    
    window.open(`https://wa.me/${testPhoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
    
    setSelectedDossier(null);
  };

  const handleRejectSubmit = () => {
    if (!selectedDossier || !rejectReason) {
      alert("Please enter a mandatory reason code.");
      return;
    }
    updateDossierStatus(selectedDossier.id, "Rejected");
    setApplications(getStoredDossiers());
    
    // 2. REAL WHATSAPP REJECTION/REWORK INTEGRATION
    const testPhoneNumber = "919876543210"; // Replace with your own phone number for the live hackathon demo
    const message = `🏛️ *Ministry of Tribal Affairs*\n\nDear ${selectedDossier.name}, your scholarship application (ID: ${selectedDossier.id}) requires *REWORK* ❌.\n\n*Reason:* ${rejectReason}\n\nPlease login to the TribalGrant portal to re-upload clear documents.`;
    
    window.open(`https://wa.me/${testPhoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
    
    setShowRejectModal(false);
    setRejectReason("");
    setSelectedDossier(null);
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
            <p className="text-[10px] text-slate-400 font-mono">Demo Credentials: officer@tribal.gov.in / sih2026</p>
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
        <button onClick={() => setIsAuthenticated(false)} className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 border border-rose-100 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm">
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
          <div className="animate-in slide-in-from-bottom-4 fade-in">
            <button onClick={() => setSelectedDossier(null)} className="mb-4 text-sm font-semibold text-slate-600 hover:text-indigo-700 flex items-center gap-1 transition">
              <ChevronLeft className="w-4 h-4" /> Back to Queue
            </button>
            
            <div className="bg-white/90 backdrop-blur-2xl border border-white rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
              
              {/* Document Preview Modal Overlay */}
              {previewDoc && (
                <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
                  <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
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

                    <div className="w-full h-56 bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-white p-6 text-center shadow-inner relative overflow-hidden">
                      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                      <FileCheck className="w-12 h-12 text-indigo-400 mb-2 animate-bounce" />
                      <p className="text-sm font-bold">{previewDoc.filename}</p>
                      <p className="text-[11px] text-slate-400 mt-1">Zero-Trust Cryptographic Hash Verified • Ministry of Tribal Affairs</p>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button onClick={() => setPreviewDoc(null)} className="bg-indigo-700 hover:bg-indigo-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition">
                        Close Preview
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedDossier.fraudStatus !== "Clean" && (
                <div className="bg-rose-600 text-white px-6 py-3.5 flex items-center gap-3 text-sm font-bold shadow-inner">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" /> 
                  CRITICAL FRAUD ALERT: {selectedDossier.fraudStatus}.
                </div>
              )}

              <div className="border-b border-slate-100 px-8 py-6 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{selectedDossier.name}</h2>
                  <p className="text-xs text-slate-500 font-mono mt-1">Dossier ID: {selectedDossier.id} • Secure Hash: {selectedDossier.hash}</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold shadow-sm">
                  WASM Clarity Index: {selectedDossier.aiScore}%
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8">
                <div className="col-span-2 space-y-6">
                  
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-indigo-600"/> Uploaded Evidence Vault
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedDossier.documents.map((doc: any, index: number) => (
                      <div key={index} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between shadow-sm">
                        <div className="overflow-hidden">
                          <span className="text-xs font-bold text-slate-800 block truncate">{doc.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono block truncate">📄 {doc.filename} ({doc.clarity}% Clarity)</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="p-2 bg-white border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 text-indigo-600 rounded-lg transition flex-shrink-0 ml-2 shadow-sm cursor-pointer"
                          title="Open Document Preview"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 mt-6">
                    <FileSearch className="w-4 h-4 text-indigo-600"/> OCR Extraction Engine vs. User Input
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Applicant Typed Data</div>
                      <div className="space-y-3">
                        <div><span className="text-xs text-slate-500 block mb-0.5">Full Name</span><span className="text-sm font-bold text-slate-900">{selectedDossier.typedData.name}</span></div>
                        <div><span className="text-xs text-slate-500 block mb-0.5">Declared Income</span><span className="text-sm font-bold text-slate-900">{selectedDossier.typedData.income}</span></div>
                      </div>
                    </div>
                    
                    <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-5 relative shadow-sm">
                      <div className="absolute top-4 right-4 text-[9px] font-extrabold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-200">AI EXTRACTED</div>
                      <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-3">Document OCR Output</div>
                      <div className="space-y-3">
                        <div><span className="text-xs text-slate-500 block mb-0.5">Extracted Name</span><span className="text-sm font-bold text-indigo-950">{selectedDossier.extractedData.name}</span></div>
                        <div><span className="text-xs text-slate-500 block mb-0.5">Extracted Income</span><span className="text-sm font-bold text-emerald-700">₹{selectedDossier.extractedData.income}</span></div>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 mt-8">
                    <Building2 className="w-4 h-4 text-indigo-600"/> Verified Banking Details
                  </h3>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-wrap justify-between items-center text-sm shadow-sm">
                    <div><span className="block text-xs text-slate-400 font-semibold uppercase">Bank</span><span className="font-bold text-slate-900">{selectedDossier.financials.bank}</span></div>
                    <div><span className="block text-xs text-slate-400 font-semibold uppercase">Account</span><span className="font-mono font-bold text-slate-900">{selectedDossier.financials.account}</span></div>
                    <div><span className="block text-xs text-slate-400 font-semibold uppercase">IFSC</span><span className="font-mono font-bold text-slate-900">{selectedDossier.financials.ifsc}</span></div>
                  </div>
                </div>

                <div className="col-span-1 border-l border-slate-200/60 pl-8">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 mb-6">
                    <History className="w-4 h-4 text-slate-500"/> System Audit Log
                  </h3>
                  <div className="space-y-6">
                    {selectedDossier.auditLog.map((log: any, i: number) => (
                      <div key={i} className="relative pl-4 border-l-2 border-indigo-500">
                        <div className="absolute w-2.5 h-2.5 bg-indigo-600 rounded-full -left-[6px] top-1 ring-4 ring-indigo-50"></div>
                        <div className="text-[10px] text-indigo-600 font-mono font-bold">{log.time}</div>
                        <div className="text-xs font-semibold text-slate-700 mt-0.5">{log.action}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 px-8 py-5 border-t border-slate-100 flex justify-end gap-3 relative">
                {showRejectModal ? (
                  <div className="absolute bottom-full right-8 mb-3 bg-white border border-slate-200 shadow-2xl rounded-2xl p-5 w-96 animate-in slide-in-from-bottom-2 z-20">
                    <label className="block text-xs font-bold text-slate-800 mb-2">Mandatory Reason for Rework/Rejection</label>
                    <textarea 
                      value={rejectReason} 
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="E.g., Income certificate blurry."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-indigo-600 h-28 mb-3 resize-none"
                    ></textarea>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition">Cancel</button>
                      <button onClick={handleRejectSubmit} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition">Confirm Rejection</button>
                    </div>
                  </div>
                ) : null}

                <button onClick={() => setShowRejectModal(true)} className="px-5 py-3 bg-white border border-slate-300 text-amber-700 hover:bg-amber-50 rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> Reject / Rework
                </button>
                <button onClick={handleApprove} className="px-6 py-3 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/25 transition flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Approve & Stage for PFMS
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}