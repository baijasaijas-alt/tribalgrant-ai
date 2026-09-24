import { Dossier } from "./types";
import { dbInsertApplication, dbSelectApplications, dbUpdateApplication, dbSelectDocuments, dbInsertAudit, storageSignedUrl, supabaseConfigured } from "./supabase";

type Store = { applications: Dossier[] };
const g = globalThis as typeof globalThis & { __tribalgrantStore?: Store };
if (!g.__tribalgrantStore) g.__tribalgrantStore = { applications: [] };

function rowToDossier(row: any, documents: any[] = []): Dossier {
  const data = row.data || row;
  return {
    ...data,
    id: row.id || data.id,
    date: data.date || String(row.created_at || "").slice(0,10),
    status: row.status || data.status || "Pending",
    documents: documents.length ? documents.map((d: any) => ({
      ...d.data,
      title: d.bucket || d.data?.title,
      filename: d.filename || d.data?.filename,
      storagePath: d.storage_path,
      previewUrl: d.preview_url || d.data?.previewUrl,
    })) : (data.documents || []),
    auditLog: data.auditLog || [],
  } as Dossier;
}

export async function getApplicationsAsync(): Promise<Dossier[]> {
  if (!supabaseConfigured()) return g.__tribalgrantStore!.applications;
  const rows = await dbSelectApplications();
  const apps: Dossier[] = [];
  for (const row of rows || []) {
    const docs = await dbSelectDocuments(row.id);
    const mapped = rowToDossier(row, docs);
    for (const doc of mapped.documents) {
      if (!doc.previewUrl && doc.storagePath) doc.previewUrl = await storageSignedUrl(doc.storagePath) || undefined;
    }
    apps.push(mapped);
  }
  return apps;
}

export async function getApplicationAsync(id: string): Promise<Dossier | null> {
  const apps = await getApplicationsAsync();
  return apps.find(a => a.id === id) || null;
}

export function getApplications() { return g.__tribalgrantStore!.applications; }

export async function saveApplication(app: Dossier) {
  if (!supabaseConfigured()) { g.__tribalgrantStore!.applications.unshift(app); return app; }
  await dbInsertApplication({ id: app.id, name: app.name, scheme: app.scheme, status: app.status, data: { ...app, documents: app.documents.map(d => ({ ...d, previewUrl: undefined })) }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  for (const doc of app.documents) {
    const { dbInsertDocument } = await import("./supabase");
    await dbInsertDocument({ application_id: app.id, bucket: doc.title, filename: doc.filename, storage_path: (doc as any).storagePath || null, data: { ...doc, previewUrl: undefined }, extracted_text: doc.extractedRaw || "", document_type: doc.documentType, created_at: new Date().toISOString() });
  }
  await dbInsertAudit({ application_id: app.id, action: "Application submitted to AI verification service", created_at: new Date().toISOString() });
  return app;
}

export async function updateApplicationAsync(id: string, patch: Partial<Dossier>) {
  if (!supabaseConfigured()) return updateApplication(id, patch);
  const existing = await getApplicationAsync(id);
  if (!existing) return null;
  const merged = { ...existing, ...patch };
  await dbUpdateApplication(id, { status: merged.status, data: { ...merged, documents: merged.documents.map(d => ({ ...d, previewUrl: undefined })) }, updated_at: new Date().toISOString() });
  if (patch.auditLog?.length) {
    const last = patch.auditLog[patch.auditLog.length - 1];
    await dbInsertAudit({ application_id: id, action: last.action, created_at: new Date().toISOString() });
  }
  return merged;
}

export function updateApplication(id: string, patch: Partial<Dossier>) {
  const item = getApplications().find((a) => a.id === id);
  if (!item) return null;
  Object.assign(item, patch);
  return item;
}
