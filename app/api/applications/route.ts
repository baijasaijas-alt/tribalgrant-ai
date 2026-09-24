import { NextResponse } from "next/server";
import { getApplicationsAsync, saveApplication } from "@/lib/store";
import { Dossier } from "@/lib/types";
import { verifyApplication } from "@/lib/verify";

export async function GET() {
  try { return NextResponse.json({ applications: await getApplicationsAsync() }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load applications." }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const docs = Array.isArray(body.documents) ? body.documents : [];
    const govtId = String(body.typedData?.id || "").replace(/\D/g, "");
    if (!body.name || !body.scheme || !body.typedData?.whatsapp || !body.typedData?.email || !docs.length) return NextResponse.json({ error: "Name, email, WhatsApp number and documents are required." }, { status: 400 });
    if (!/^\d{12}$/.test(govtId)) return NextResponse.json({ error: "Government ID must contain exactly 12 digits." }, { status: 400 });

    const id = `TG-${new Date().getFullYear()}-${body.scheme}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const app: Dossier = {
      id, name: String(body.name).trim(), scheme: body.scheme,
      date: new Date().toISOString().slice(0, 10), status: "Pending", hash: body.hash || "", fraudStatus: "Review",
      aiScore: 0, typedData: { ...body.typedData, id: govtId },
      extractedData: body.extractedData || { name: "OCR REVIEW", income: "OCR REVIEW", id: "OCR REVIEW" },
      financials: { bank: "Not supplied", account: "Not supplied", ifsc: "Not supplied" }, documents: docs,
      auditLog: [{ time: new Date().toLocaleTimeString(), action: "Application submitted to AI document intelligence engine" }],
    };
    const verification = verifyApplication(app);
    app.verification = verification;
    app.aiScore = verification.confidence;
    app.fraudStatus = verification.deficiencies.length ? "Needs Review" : "Clean";
    await saveApplication(app);
    return NextResponse.json({ application: app });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Submission failed." }, { status: 500 }); }
}
