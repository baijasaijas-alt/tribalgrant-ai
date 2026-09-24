const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

export function supabaseConfigured() { return Boolean(url && key); }
export function supabaseConfig() { return { url: url!, key: key! }; }

async function sbFetch(path: string, init: RequestInit = {}) {
  if (!url || !key) throw new Error("Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local.");
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${key}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${url}${path}`, { ...init, headers, cache: "no-store" });
const text = await response.text();

if (!response.ok) {
  console.error("SUPABASE ERROR:", response.status, text);
}
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(data?.message || data?.error_description || data?.error || text || `Supabase returned ${response.status}`);
  return data;
}

export async function dbSelectApplications() {
  return sbFetch(`/rest/v1/applications?select=*&order=created_at.desc`);
}
export async function dbInsertApplication(row: any) {
  return sbFetch(`/rest/v1/applications`, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
}
export async function dbUpdateApplication(id: string, patch: any) {
  return sbFetch(`/rest/v1/applications?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) });
}
export async function dbInsertDocument(row: any) {
  return sbFetch(`/rest/v1/documents`, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
}
export async function dbSelectDocuments(applicationId: string) {
  return sbFetch(`/rest/v1/documents?application_id=eq.${encodeURIComponent(applicationId)}&select=*&order=created_at.asc`);
}
export async function dbInsertAudit(row: any) {
  return sbFetch(`/rest/v1/audit_logs`, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
}

export async function storageUploadBase64(path: string, dataUrl: string) {
  if (!url || !key) throw new Error("Supabase is not configured.");
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data.");
  const mime = match[1];
  const bytes = Uint8Array.from(Buffer.from(match[2], "base64"));
  const response = await sbFetch(`/storage/v1/object/scholarship-documents/${path}`, {
    method: "POST",
    headers: { "Content-Type": mime, "x-upsert": "true" },
    body: bytes,
  });
  return { path, response };
}

export async function storageSignedUrl(path: string, expiresIn = 3600) {
  if (!url || !key) return null;
  try {
    const result = await sbFetch(`/storage/v1/object/sign/scholarship-documents/${path}`, {
      method: "POST",
      body: JSON.stringify({ expiresIn }),
    });
    if (result?.signedURL) return `${url}/storage/v1${result.signedURL}`;
    if (result?.signedUrl) return `${url}/storage/v1${result.signedUrl}`;
  } catch {}
  return null;
}
