export interface Dossier {
  id: string;
  name: string;
  scheme: string;
  date: string;
  status: string;
  hash: string;
  fraudStatus: string;
  aiScore: number;
  typedData: { name: string; income: string; id: string };
  extractedData: { name: string; income: string; id: string };
  financials: { bank: string; account: string; ifsc: string };
  documents: { title: string; filename: string; clarity: number }[];
  auditLog: { time: string; action: string }[];
}

const STORAGE_KEY = "aura_xx_mota_dossiers_v2";

export function getStoredDossiers(): Dossier[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    const initial: Dossier[] = [
      {
        id: "TG-2026-NFST-8902",
        name: "Ramesh Chandra Munda",
        scheme: "NFST",
        date: "2026-09-21",
        status: "Pending",
        hash: "e3b0c442...1c14",
        fraudStatus: "Clean",
        aiScore: 95,
        typedData: { name: "Ramesh Chandra Munda", income: "₹1,80,000", id: "4829 1092 3841" },
        extractedData: { name: "Ramesh C. Munda", income: "180000", id: "4829 1092 3841" },
        financials: { bank: "State Bank of India", account: "332244556677", ifsc: "SBIN0001234" },
        documents: [
          { title: "Identity Proof", filename: "govt_id.pdf", clarity: 94 },
          { title: "ST Certificate", filename: "st_cert.pdf", clarity: 96 }
        ],
        auditLog: [
          { time: "09:14 AM", action: "Application Submitted via PWA" },
          { time: "09:15 AM", action: "WASM Edge Clarity Check Passed (94%)" }
        ]
      }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(data);
}

export function saveDossier(newDossier: Dossier) {
  if (typeof window === "undefined") return;
  const current = getStoredDossiers();
  const updated = [newDossier, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("storage"));
}

export function updateDossierStatus(id: string, status: string) {
  if (typeof window === "undefined") return;
  const current = getStoredDossiers();
  const updated = current.map(d => d.id === id ? { ...d, status } : d);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("storage"));
}