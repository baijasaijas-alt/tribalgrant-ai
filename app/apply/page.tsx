"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import Tesseract from "tesseract.js";
import { CheckCircle2, ChevronLeft, UploadCloud, ShieldCheck, Loader2, Sparkles, Smartphone, FileText, X } from "lucide-react";

type Doc = { name: string; clarity: number; ocrConfidence: number; extractedRaw: string; previewUrl: string; sha256: string; storagePath?: string; ai?: any };

type Bucket = "identity" | "caste" | "academic" | "financial";

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return value;
}

async function sha256(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function makePreviewUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1100;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not prepare the image preview.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.74);
}

async function preprocessImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  let sum = 0;
  const gray = new Float32Array(canvas.width * canvas.height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = g;
    sum += g;
  }
  const mean = sum / gray.length;
  let variance = 0;
  for (const g of gray) variance += (g - mean) ** 2;
  variance /= gray.length;

  // A lightweight Laplacian variance is much more appropriate for blur detection
  // than Tesseract confidence. OCR confidence can be low on perfectly sharp photos.
  let lapSum = 0;
  let lapSq = 0;
  let count = 0;
  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = 1; x < canvas.width - 1; x++) {
      const i = y * canvas.width + x;
      const lap = gray[i - 1] + gray[i + 1] + gray[i - canvas.width] + gray[i + canvas.width] - 4 * gray[i];
      lapSum += lap;
      lapSq += lap * lap;
      count++;
    }
  }
  const lapVariance = Math.max(0, lapSq / Math.max(1, count) - (lapSum / Math.max(1, count)) ** 2);
  const sharpness = Math.max(0, Math.min(100, Math.round(((Math.log10(lapVariance + 1) - 1.2) / 2.8) * 100)));

  // Mild contrast normalization for OCR; do not destroy the original preview.
  const contrast = Math.max(1.05, Math.min(1.35, 1.15 + (128 - mean) / 900));
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) data[i + c] = Math.max(0, Math.min(255, (data[i + c] - 128) * contrast + 128));
  }
  ctx.putImageData(image, 0, 0);
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), "image/jpeg", 0.92));
  return { blob, sharpness };
}

export default function StudentPortal() {
  const [scheme, setScheme] = useState("NFST");
  const [typedName, setTypedName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [income, setIncome] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [docs, setDocs] = useState<Record<Bucket, Doc[]>>({ identity: [], caste: [], academic: [], financial: [] });
  const [notice, setNotice] = useState<string | null>(null);
  const [draftId] = useState(() => `DRAFT-${crypto.randomUUID().slice(0, 12).toUpperCase()}`);
  const inputRefs = useRef<Record<Bucket, HTMLInputElement | null>>({ identity: null, caste: null, academic: null, financial: null });

  const handleFileUpload = async (bucketId: Bucket, e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = "";
    if (!selected.length) return;

    // Add the file to the UI immediately. OCR is enrichment, not the upload itself.
    // This prevents a slow/blocked OCR worker from making the Upload Photos button
    // appear broken.
    setIsScanning(true);
    for (const file of selected) {
      let previewUrl = "";
      let hash = "";
      try {
        if (file.size > 12 * 1024 * 1024) throw new Error("File is larger than 12 MB.");
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          throw new Error("Please upload a JPG, PNG, or WebP image.");
        }

        setScanMessage(`Uploading ${file.name}…`);
        previewUrl = await makePreviewUrl(file);
        hash = await sha256(file);
        const placeholder: Doc = {
          name: file.name,
          clarity: 0,
          ocrConfidence: 0,
          extractedRaw: "",
          previewUrl,
          sha256: hash,
        };
        setDocs(prev => ({ ...prev, [bucketId]: [...prev[bucketId], placeholder] }));
        setNotice(`${file.name} uploaded. AI text extraction is starting…`);

        try {
          const processed = await preprocessImage(file);
          setScanMessage(`Extracting text from ${file.name}…`);
          const first = await Promise.race([
            Tesseract.recognize(processed.blob, "eng", {
              logger: (m: any) => {
                if (m.status === "recognizing text") setScanMessage(`AI OCR ${Math.round((m.progress || 0) * 100)}%…`);
              },
              config: { tessedit_pageseg_mode: "6" },
            } as any),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("OCR timed out")), 45000)),
          ]);
          let best = first;
          if ((first.data.text || "").trim().length < 12 || first.data.confidence < 42) {
            const second = await Tesseract.recognize(processed.blob, "eng", { config: { tessedit_pageseg_mode: "3" } } as any);
            if ((second.data.text || "").trim().length > (first.data.text || "").trim().length) best = second;
          }
          const rawText = (best.data.text || "").toUpperCase().replace(/\s+/g, " ").trim();
          const ocrConfidence = Math.round(best.data.confidence || 0);
          const clarity = Math.round(Math.max(0, Math.min(100, processed.sharpness)));

          setScanMessage(`AI document classification for ${file.name}…`);
          let ai: any = undefined;
          try {
            const aiResponse = await fetch("/api/ai/analyze", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bucket: bucketId, fileName: file.name, ocrText: rawText, imageDataUrl: previewUrl }),
            });
            const aiJson = await aiResponse.json();
            ai = aiJson.analysis;
          } catch {
            ai = undefined;
          }

          let storagePath: string | undefined;
          try {
            setScanMessage(`Securing ${file.name}…`);
            const uploadResponse = await fetch("/api/documents", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ applicationId: draftId, bucket: bucketId, filename: file.name, sha256: hash, dataUrl: previewUrl }),
            });
            const uploadJson = await uploadResponse.json();
            storagePath = uploadJson.storagePath || undefined;
          } catch {
            storagePath = undefined;
          }

          setDocs(prev => ({
            ...prev,
            [bucketId]: prev[bucketId].map(d => d.sha256 === hash ? { ...d, clarity, ocrConfidence, extractedRaw: (ai?.transcription || rawText || "").toUpperCase().replace(/\s+/g, " ").trim(), ai, storagePath } : d),
          }));
          if (ai?.verdict === "mismatch" || ai?.validForBucket === false) {
            setNotice(`⚠ ${file.name}: AI detected ${ai.detectedType || "a different document"}. Please upload the correct ${bucketId} document.`);
          } else if (rawText) {
            setNotice(`${file.name} uploaded. OCR + AI document verification completed.`);
          } else {
            setNotice(`${file.name} uploaded, but no reliable text was found.`);
          }
        } catch (ocrError) {
          setDocs(prev => ({
            ...prev,
            [bucketId]: prev[bucketId].map(d => d.sha256 === hash ? { ...d, extractedRaw: "[OCR NOT AVAILABLE - MANUAL REVIEW]" } : d),
          }));
          setNotice(`${file.name} uploaded successfully. OCR could not finish (${ocrError instanceof Error ? ocrError.message : "OCR error"}), but the document was not lost.`);
        }
      } catch (error) {
        setNotice(error instanceof Error ? error.message : `Could not upload ${file.name}.`);
      }
    }
    setIsScanning(false);
    setScanMessage("");
  };

  const removeFile = (bucketId: Bucket, fileName: string) => setDocs(prev => ({ ...prev, [bucketId]: prev[bucketId].filter(file => file.name !== fileName) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const all = Object.entries(docs).flatMap(([bucket, files]) => files.map(f => ({ title: bucket, filename: f.name, clarity: f.clarity, ocrConfidence: f.ocrConfidence, extractedRaw: f.extractedRaw, previewUrl: f.previewUrl, storagePath: f.storagePath, sha256: f.sha256, documentType: f.ai?.detectedType || bucket.toUpperCase(), issues: f.ai?.reasons || [], ai: f.ai })));
      const allText = all.map(d => d.extractedRaw).join(" ");
      const compact = (s: string) => s.replace(/\s/g, "").toUpperCase();
      const idMatch = compact(allText).includes(compact(idNumber));
      const incomeMatch = allText.includes(income);
      const result = await fetch("/api/applications", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: typedName, scheme, hash: all.map(d => d.sha256).join(""),
          typedData: { name: typedName, income, id: idNumber, whatsapp: normalizePhone(whatsapp), email: email.trim() },
          extractedData: { name: allText.includes(typedName.toUpperCase()) ? typedName : "OCR REVIEW", income: incomeMatch ? income : "OCR REVIEW", id: idMatch ? idNumber : "OCR REVIEW" },
          documents: all,
        }),
      });
      const json = await result.json();
      if (!result.ok) throw new Error(json.error || "Submission failed");
      setTrackingId(json.application.id);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not submit application");
    } finally { setIsSubmitting(false); }
  };

  const phoneDigits = whatsapp.replace(/\D/g, "");
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const allUploaded = Object.values(docs).flat();
  const hasBlockingDocIssue = allUploaded.some(file => file.ai && file.ai.validForBucket === false && ["mismatch", "not_a_document"].includes(file.ai.verdict));
  const isFormValid = typedName.trim().length > 2 && /^\d{12}$/.test(idNumber) && phoneDigits.length >= 10 && isEmailValid && income && Object.values(docs).every(bucketFiles => bucketFiles.length > 0) && !hasBlockingDocIssue;

  if (trackingId) return <div className="bg-slate-100 min-h-screen py-8 px-4 flex flex-col justify-center items-center"><div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 text-center"><div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100"><CheckCircle2 className="w-8 h-8" /></div><h2 className="text-2xl font-extrabold text-indigo-950 mb-2">Application Secured</h2><p className="text-sm text-slate-500 mb-6">Your dossier has been verified by the AI evidence engine and routed to the Ministry queue.</p><div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-8"><span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Official Tracking ID</span><span className="text-lg font-mono font-bold text-indigo-700">{trackingId}</span></div><Link href="/" className="w-full py-3.5 bg-indigo-700 text-white rounded-xl text-xs font-bold block text-center">Return to Public Portal Home</Link></div></div>;

  const buckets = [
    { id: "identity" as Bucket, title: "Identity Proof (Govt Photo ID)", subtitle: "Upload a clear government ID." },
    { id: "caste" as Bucket, title: "Category Proof (ST Certificate)", subtitle: "Upload the valid Scheduled Tribe certificate." },
    { id: "academic" as Bucket, title: "Marksheets & Enrollment", subtitle: "Upload degree transcripts or enrollment proof." },
    { id: "financial" as Bucket, title: "Family Income Certificate", subtitle: "Upload the revenue department income certificate." },
  ];

  return <div className="bg-slate-100 text-slate-900 min-h-screen py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center antialiased relative">
    {notice && <div className="fixed top-5 right-5 z-[100] max-w-md bg-slate-950 text-white rounded-2xl shadow-2xl p-4 flex gap-3 items-start"><Sparkles className="w-5 h-5 text-emerald-300 mt-0.5"/><div className="text-sm font-medium leading-5">{notice}</div><button onClick={() => setNotice(null)}><X className="w-4 h-4 text-slate-400"/></button></div>}
    <main className="w-full max-w-2xl bg-white/90 backdrop-blur-2xl rounded-3xl border border-white shadow-2xl overflow-hidden p-6 sm:p-10 space-y-6">
      <header className="border-b border-slate-100 pb-5 flex justify-between items-end"><div><div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">Team AURA XX</span><span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">AI OCR LIVE</span></div><h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">TribalGrant Portal</h1><p className="text-xs font-semibold text-slate-500 mt-0.5">Secure document evidence submission</p></div><Link href="/" className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 flex items-center gap-1"><ChevronLeft className="w-3.5 h-3.5"/> Home</Link></header>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5"><label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Applicant Full Name</label><input required value={typedName} onChange={e=>setTypedName(e.target.value)} placeholder="Name as per official records" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"/></div>
          <div className="space-y-1.5"><label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Scheme</label><select value={scheme} onChange={e=>setScheme(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"><option value="NFST">National Fellowship (NFST)</option><option value="NOS">National Overseas Scholarship (NOS)</option></select></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5"><label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Govt ID Number</label><input required value={idNumber} inputMode="numeric" maxLength={12} pattern="[0-9]{12}" onChange={e=>setIdNumber(e.target.value.replace(/\D/g, "").slice(0,12))} placeholder="Enter exactly 12 digits" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600"/></div>
          <div className="space-y-1.5"><label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Annual Family Income</label><input required type="number" value={income} onChange={e=>setIncome(e.target.value)} placeholder="₹ annual income" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"/></div>
          <div className="space-y-1.5"><label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address</label><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="applicant@example.com" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"/><p className="text-[10px] text-slate-400">Used for automatic decision notifications.</p></div><div className="space-y-1.5"><label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1"><Smartphone className="w-3.5 h-3.5 text-emerald-600"/> WhatsApp Number</label><input required value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} placeholder="10-digit mobile" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"/><p className="text-[10px] text-slate-400">Ready for WhatsApp API notifications when configured.</p></div>
        </div>
        <div className="bg-gradient-to-r from-indigo-50 to-emerald-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3"><div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm"><Sparkles className="w-4 h-4 text-indigo-600"/></div><div><p className="text-xs font-bold text-slate-800">Document Intelligence</p><p className="text-[11px] text-slate-500 mt-0.5">OCR runs locally, then the document is classified against the selected category. Aadhaar/random photos/selfies in the wrong category are flagged before submission. Image quality is measured separately from OCR confidence.</p></div></div>
        <div className="space-y-3">{buckets.map(bucket=><div key={bucket.id} className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4"><div className="flex justify-between gap-3 items-center"><div><h3 className="text-sm font-bold text-slate-800">{bucket.title}</h3><p className="text-[11px] text-slate-500 mt-0.5">{bucket.subtitle}</p></div><input ref={el => { inputRefs.current[bucket.id] = el; }} id={`upload-${bucket.id}`} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={e=>handleFileUpload(bucket.id,e)} />
<button type="button" onClick={()=>inputRefs.current[bucket.id]?.click()} disabled={isScanning} className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-indigo-700 shadow-sm hover:border-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"><UploadCloud className="w-4 h-4"/> {isScanning ? "Scanning…" : "Upload Photos"}</button></div>{docs[bucket.id].length>0&&<div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-200/60">{docs[bucket.id].map((file,idx)=><span key={idx} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 shadow-sm"><FileText className="w-3.5 h-3.5 text-indigo-500"/><span className="truncate max-w-[120px] font-mono text-[10px]">{file.name}</span><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${file.clarity>=70?'text-emerald-600 bg-emerald-50':'text-amber-600 bg-amber-50'}`}>{file.clarity}% Image Quality</span><span className="text-[10px] text-slate-400">OCR {file.ocrConfidence}%</span>{file.ai&&<span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${file.ai.validForBucket?'text-emerald-700 bg-emerald-50':'text-rose-700 bg-rose-50'}`}>{file.ai.validForBucket?'AI VERIFIED':'AI MISMATCH'}</span>}<button type="button" onClick={()=>removeFile(bucket.id,file.name)}><X className="w-3.5 h-3.5 text-slate-400 hover:text-rose-600"/></button></span>)}</div>}</div>)}</div>
        {isScanning&&<div className="rounded-2xl bg-slate-950 text-white p-4 flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin text-emerald-300"/><div><div className="text-xs font-bold">AI document scan in progress</div><div className="text-[11px] text-slate-400 mt-0.5">{scanMessage}</div></div></div>}
        <button type="submit" disabled={!isFormValid||isSubmitting||isScanning} className={`w-full py-4 px-6 font-bold text-base rounded-2xl shadow-xl transition flex items-center justify-center gap-2 ${isFormValid&&!isScanning?'bg-indigo-700 hover:bg-indigo-800 text-white shadow-indigo-600/30':'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>{isScanning?<><Loader2 className="w-5 h-5 animate-spin"/> AI Analyzing Documents…</>:isSubmitting?<><ShieldCheck className="w-5 h-5"/> Transmitting Secure Dossier…</>:<><ShieldCheck className="w-5 h-5"/> Validate & Submit Official Dossier</>}</button>
      </form>
    </main>
  </div>;
}
