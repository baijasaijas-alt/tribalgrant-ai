import { NextResponse } from "next/server";
import { getApplicationAsync, updateApplicationAsync } from "@/lib/store";
import { sendWhatsApp } from "@/lib/whatsapp";
import { buildDecisionEmail, sendEmail } from "@/lib/email";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await getApplicationAsync(id);
  if (!existing) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  const body = await req.json();
  const status = body.status;
  if (!["Pending", "Approved", "Rejected", "Needs Review"].includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const reason = String(body.reason || "").trim();
  if ((status === "Rejected" || status === "Needs Review") && !reason) return NextResponse.json({ error: "A reason is required for this decision." }, { status: 400 });
  const actionText = status === "Approved" ? "Officer approved application" : status === "Rejected" ? `Officer rejected application — ${reason}` : status === "Needs Review" ? `Officer requested resubmission — ${reason}` : "Officer changed application status";
  const audit = [...existing.auditLog, { time: new Date().toLocaleTimeString(), action: actionText }];
  const app = await updateApplicationAsync(id, { status, auditLog: audit });
  if (!app) return NextResponse.json({ error: "Application update failed" }, { status: 500 });
  const message = status === "Approved" ? `TribalGrant: Dear ${app.name}, your ${app.scheme} application (${app.id}) has been approved by the evaluating officer.` : status === "Rejected" ? `TribalGrant: Dear ${app.name}, your ${app.scheme} application (${app.id}) was rejected. Reason: ${reason}` : `TribalGrant: Dear ${app.name}, action is required on your ${app.scheme} application (${app.id}). ${reason}`;
  const shouldNotify = body.notify !== false;
  const whatsapp = shouldNotify ? await sendWhatsApp(app.typedData.whatsapp, message) : { sent:false, configured:false, error:"Notification skipped." };
  const emailTemplate = buildDecisionEmail({ name: app.name, scheme: app.scheme, id: app.id, status, reason });
  const email = shouldNotify ? await sendEmail(app.typedData.email, emailTemplate.subject, emailTemplate.html) : { sent:false, configured:false, error:"Notification skipped." };
  const events = [
    whatsapp.sent ? { time:new Date().toLocaleTimeString(), action:`WhatsApp notification accepted by provider${whatsapp.messageId ? ` (${whatsapp.messageId})` : ""}` } : null,
    email.sent ? { time:new Date().toLocaleTimeString(), action:`Email notification accepted by provider${email.messageId ? ` (${email.messageId})` : ""}` } : null,
  ].filter(Boolean) as {time:string;action:string}[];
  if (events.length) await updateApplicationAsync(id, { auditLog: [...audit, ...events] });
  return NextResponse.json({ application: await getApplicationAsync(id), whatsapp, email });
}
