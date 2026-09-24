export type EmailResult = {
  sent: boolean;
  configured: boolean;
  messageId?: string;
  error?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "TribalGrant AI <onboarding@resend.dev>";

  if (!apiKey) {
    return { sent: false, configured: false, error: "Email provider is not configured. Add RESEND_API_KEY in the server environment." };
  }
  if (!isValidEmail(to)) {
    return { sent: false, configured: true, error: "Applicant email address is invalid." };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to.trim()],
        subject,
        html,
      }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { sent: false, configured: true, error: data?.message || data?.name || `Email provider returned ${response.status}.` };
    }
    return { sent: true, configured: true, messageId: data?.id };
  } catch (error) {
    return { sent: false, configured: true, error: error instanceof Error ? error.message : "Email request failed." };
  }
}

export function buildDecisionEmail(input: {
  name: string;
  scheme: string;
  id: string;
  status: "Approved" | "Rejected" | "Needs Review";
  reason?: string;
}) {
  const name = escapeHtml(input.name);
  const scheme = escapeHtml(input.scheme);
  const id = escapeHtml(input.id);
  const reason = escapeHtml(input.reason || "Please sign in to the applicant portal for details.");
  const statusLabel = input.status === "Approved" ? "Approved" : input.status === "Rejected" ? "Rejected" : "Action Required";
  const accent = input.status === "Approved" ? "#059669" : input.status === "Rejected" ? "#e11d48" : "#d97706";
  const title = input.status === "Approved" ? "Your scholarship application has been approved" : input.status === "Rejected" ? "Your scholarship application has been rejected" : "Action is required on your scholarship application";
  const subject = `TribalGrant AI — ${statusLabel} — ${input.id}`;

  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a"><div style="max-width:620px;margin:40px auto;padding:0 16px"><div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,.08)"><div style="padding:28px 30px;background:linear-gradient(135deg,#eef2ff,#ecfdf5)"><div style="font-size:11px;font-weight:800;letter-spacing:2px;color:#4f46e5;text-transform:uppercase">TribalGrant AI</div><h1 style="margin:10px 0 0;font-size:25px;line-height:1.25">${title}</h1></div><div style="padding:30px"><p style="font-size:15px">Dear <strong>${name}</strong>,</p><p style="font-size:14px;line-height:1.7">Your <strong>${scheme}</strong> application has been updated by the evaluating officer.</p><div style="margin:24px 0;padding:18px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc"><div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px">Application ID</div><div style="margin-top:6px;font-family:monospace;font-size:16px;font-weight:800">${id}</div><div style="margin-top:14px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px">Status</div><div style="margin-top:6px;font-size:16px;font-weight:800;color:${accent}">${statusLabel}</div></div>${input.status !== "Approved" ? `<div style="padding:16px;border-left:4px solid ${accent};background:#fff7ed;border-radius:8px"><div style="font-size:11px;font-weight:800;text-transform:uppercase;color:#64748b">Officer note</div><div style="margin-top:6px;font-size:14px;line-height:1.6">${reason}</div></div>` : ""}<p style="font-size:13px;line-height:1.7;color:#475569;margin-top:24px">Please use the official TribalGrant portal to view your application and any next steps.</p><p style="font-size:12px;color:#94a3b8;margin-top:28px">This is an automated notification. Please do not reply to this email.</p></div></div></div></body></html>`;
  return { subject, html };
}
