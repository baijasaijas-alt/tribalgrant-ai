export type Scheme = "NFST" | "NOS";
export type ApplicationStatus = "Pending" | "Approved" | "Rejected" | "Needs Review";

export type AIField = { value: string; confidence: number; evidence?: string };
export type DocumentAI = {
  transcription?: string;
  detectedType: string;
  confidence: number;
  validForBucket: boolean;
  verdict: "verified" | "mismatch" | "unreadable" | "not_a_document" | "review";
  reasons: string[];
  fields: Record<string, AIField>;
  visualSignals: string[];
};

export interface DocumentEvidence {
  title: string;
  filename: string;
  clarity: number;
  ocrConfidence?: number;
  extractedRaw: string;
  previewUrl?: string;
  storagePath?: string;
  sha256: string;
  documentType: string;
  issues: string[];
  ai?: DocumentAI;
}

export interface Dossier {
  id: string;
  name: string;
  scheme: Scheme;
  date: string;
  status: ApplicationStatus;
  hash: string;
  fraudStatus: string;
  aiScore: number;
  typedData: { name: string; income: string; id: string; whatsapp: string; email: string };
  extractedData: { name: string; income: string; id: string };
  financials: { bank: string; account: string; ifsc: string };
  documents: DocumentEvidence[];
  auditLog: { time: string; action: string }[];
  verification?: {
    eligible: boolean;
    confidence: number;
    checks: { key: string; label: string; status: "pass" | "fail" | "review"; detail: string }[];
    deficiencies: string[];
  };
}
