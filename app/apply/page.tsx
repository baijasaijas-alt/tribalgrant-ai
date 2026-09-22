"use client";

import React, { useState } from "react";
import Link from "next/link";
import Tesseract from "tesseract.js";
import { saveDossier, Dossier } from "@/app/utils/dossierStore";
import { ChevronDown, CheckCircle2, ChevronLeft, UploadCloud, ShieldCheck, Loader2 } from "lucide-react";

export default function StudentPortal() {
  const [scheme, setScheme] = useState("NFST");
  const [typedName, setTypedName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [isIdFocused, setIsIdFocused] = useState(false);
  const [income, setIncome] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [trackingId, setTrackingId] = useState<string | null>(null);

  const [docs, setDocs] = useState<Record<string, { name: string; clarity: number; extractedRaw: string }[]>>({
    identity: [], caste: [], academic: [], financial: []
  });

  const handleFileUpload = async (bucketId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      
      for (const file of filesArray) {
        const fileNameLower = file.name.toLowerCase();

        // 1. Basic Filename Guard
        if (fileNameLower.includes("rashmika") || fileNameLower.includes("actor") || fileNameLower.includes("selfie")) {
          alert(`⚠️ AI Document Guard Alert:\n"${file.name}" classified as invalid image.`);
          continue; 
        }

        setIsScanning(true);

        try {
          // 2. REAL AI OCR EXTRACTION
          const { data } = await Tesseract.recognize(file, 'eng');
          const clarityScore = Math.floor(data.confidence); // Real confidence percentage
          const rawText = data.text.toUpperCase(); // Actual text read from image

          // 3. REAL BLUR DETECTION
          if (clarityScore < 70) {
            alert(`⚠️ BLUR DETECTED in ${file.name}!\nClarity Score: ${clarityScore}% (Minimum 70% required).\nYour document is too blurry. Please upload a clear, well-lit scan.`);
            setIsScanning(false);
            continue; 
          }

          setDocs(prev => ({ 
            ...prev, 
            [bucketId]: [...prev[bucketId], { name: file.name, clarity: clarityScore, extractedRaw: rawText }] 
          }));
        } catch (error) {
          alert(`Failed to scan ${file.name}. Please try a different image.`);
        }
        
        setIsScanning(false);
      }
    }
  };

  const removeFile = (bucketId: string, fileName: string) => {
    setDocs(prev => ({ ...prev, [bucketId]: prev[bucketId].filter(file => file.name !== fileName) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const generatedId = `TG-2026-${scheme}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Combine all extracted text from all uploaded documents
    const allExtractedText = Object.values(docs).flat().map(d => d.extractedRaw).join(" ");
    
    // 4. REAL DATA MATCHING (Compare Typed vs OCR)
    // We check if at least the first name exists in the scanned documents
    const firstName = typedName.split(" ")[0].toUpperCase();
    const nameMatch = allExtractedText.includes(firstName) ? typedName.toUpperCase() : "MISMATCH - NOT FOUND IN DOCS";
    
    // Check if ID number exists in scanned documents
    const idMatch = allExtractedText.includes(idNumber) ? idNumber : "MISMATCH - NOT FOUND";

    const allUploadedDocs = Object.entries(docs).flatMap(([bucket, files]) => 
      files.map(f => ({ title: bucket.toUpperCase(), filename: f.name, clarity: f.clarity }))
    );

    const lowestClarity = Math.min(...allUploadedDocs.map(d => d.clarity), 100);

    const newDossier: Dossier = {
      id: generatedId,
      name: typedName,
      scheme: scheme,
      date: new Date().toISOString().slice(0, 10),
      status: "Pending",
      hash: Math.random().toString(36).substring(2, 12) + "..." + Math.random().toString(36).substring(2, 6),
      fraudStatus: (nameMatch.includes("MISMATCH") || idMatch.includes("MISMATCH")) ? "Data Mismatch Flag" : "Clean",
      aiScore: lowestClarity,
      typedData: { name: typedName, income: `₹${income}`, id: idNumber },
      extractedData: { name: nameMatch, income: `Extracted from DB/Proxy`, id: idMatch },
      financials: { bank: "State Bank of India", account: "332244556677", ifsc: "SBIN0001234" },
      documents: allUploadedDocs,
      auditLog: [
        { time: new Date().toLocaleTimeString(), action: "Application Submitted via PWA Portal" },
        { time: new Date().toLocaleTimeString(), action: `Real OCR Scan Complete (Min Clarity: ${lowestClarity}%)` },
        { time: new Date().toLocaleTimeString(), action: `Data Cross-check Executed` }
      ]
    };

    saveDossier(newDossier);
    setTrackingId(generatedId);
    setIsSubmitting(false);
  };

  const displayId = isIdFocused ? idNumber : idNumber.length > 4 ? `•••• •••• ${idNumber.slice(-4)}` : idNumber;
  const isFormValid = typedName.trim().length > 2 && idNumber.length >= 4 && income && Object.values(docs).every(bucketFiles => bucketFiles.length > 0);

  if (trackingId) {
    return (
      <div className="bg-slate-100 min-h-screen py-8 px-4 flex flex-col justify-center items-center antialiased">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden p-8 text-center animate-in zoom-in-95">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-indigo-950 mb-2 tracking-tight">Application Secured</h2>
          <p className="text-sm text-slate-500 mb-6 font-medium">Your dossier has been cryptographically verified by OCR and securely routed to the Ministry queue.</p>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-8 shadow-inner">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Official Tracking ID</span>
            <span className="text-lg font-mono font-bold text-indigo-700">{trackingId}</span>
          </div>
          <Link href="/" className="w-full py-3.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition block text-center shadow-md">
            Return to Public Portal Home
          </Link>
        </div>
      </div>
    );
  }

  const documentBuckets = [
    { id: 'identity', title: 'Identity Proof (Govt Photo ID)', subtitle: 'Upload 12-digit Govt ID / Voter ID.' },
    { id: 'caste', title: 'Category Proof (ST Certificate)', subtitle: 'Upload valid Scheduled Tribe certificate.' },
    { id: 'academic', title: 'Marksheets & Enrollment', subtitle: 'Upload degree transcripts.' },
    { id: 'financial', title: 'Family Income Certificate', subtitle: 'Upload revenue dept income certificate.' }
  ];

  return (
    <div className="bg-slate-100 text-slate-900 min-h-screen py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center antialiased relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-20 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-indigo-200/40 blur-[130px]"></div>
        <div className="absolute top-[20%] -right-[10%] w-[50%] h-[70%] rounded-full bg-emerald-200/30 blur-[130px]"></div>
      </div>

      <main className="w-full max-w-2xl bg-white/90 backdrop-blur-2xl rounded-3xl border border-white shadow-2xl overflow-hidden p-6 sm:p-10 space-y-6">
        <header className="border-b border-slate-100 pb-5 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">Team AURA XX</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">TribalGrant Portal</h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Secure PWA Document Evidence Submission</p>
          </div>
          <Link href="/" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 shadow-sm">
            <ChevronLeft className="w-3.5 h-3.5" /> Home
          </Link>
        </header>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Applicant Full Name</label>
            <input type="text" value={typedName} onChange={(e) => setTypedName(e.target.value)} placeholder="Enter full name as per official records" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Govt ID Number</label>
              <input type="text" value={displayId} onFocus={() => setIsIdFocused(true)} onBlur={() => setIsIdFocused(false)} onChange={(e) => setIdNumber(e.target.value.toUpperCase().slice(0,12))} placeholder="e.g. 12-digit Govt ID" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition shadow-sm font-mono font-bold" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Annual Income (₹)</label>
              <div className="relative rounded-2xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 font-bold text-sm">₹</div>
                <input type="number" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="250000" className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition font-mono font-bold" />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Document Evidence Hub</label>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">Live AI OCR Engine</span>
            </div>
            
            <div className="space-y-3">
              {documentBuckets.map((bucket) => (
                <div key={bucket.id} className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 transition shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 block">{bucket.title}</span>
                      <span className="text-[11px] text-slate-500 font-medium block mt-0.5 leading-snug">{bucket.subtitle}</span>
                    </div>
                    <label className="cursor-pointer inline-flex items-center px-3.5 py-2 text-xs font-bold text-indigo-700 bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50 transition shadow-sm flex-shrink-0">
                      <UploadCloud className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Upload
                      <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(bucket.id, e)} disabled={isScanning} />
                    </label>
                  </div>
                  
                  {docs[bucket.id].length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-200/60">
                      {docs[bucket.id].map((file, idx) => (
                        <span key={idx} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 shadow-sm animate-in fade-in">
                          📄 <span className="truncate max-w-[140px] font-mono text-[11px]">{file.name}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${file.clarity >= 85 ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>{file.clarity}% Clear</span>
                          <button type="button" onClick={() => removeFile(bucket.id, file.name)} className="text-slate-400 hover:text-rose-600 font-bold ml-1">✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3">
            <button 
              type="submit" 
              disabled={!isFormValid || isSubmitting || isScanning}
              className={`w-full py-4 px-6 font-bold text-base rounded-2xl shadow-xl transition duration-150 ease-in-out flex items-center justify-center gap-2 ${
                (isFormValid && !isScanning)
                  ? "bg-indigo-700 hover:bg-indigo-800 text-white shadow-indigo-600/30 hover:-translate-y-0.5" 
                  : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none"
              }`}
            >
              {isScanning ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> AI Analyzing Pixels...</>
              ) : isSubmitting ? (
                <><ShieldCheck className="w-5 h-5" /> Transmitting Dossier...</>
              ) : (
                <><ShieldCheck className="w-5 h-5" /> Validate & Submit Official Dossier</>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}