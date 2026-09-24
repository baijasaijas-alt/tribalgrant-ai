import { NextResponse } from "next/server";
import { verifyDocumentHeuristics } from "@/lib/document-ai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const bucket = String(body.bucket || "").toLowerCase();
    const imageDataUrl = String(body.imageDataUrl || "");
    const ocrText = String(body.ocrText || "");
    const fileName = String(body.fileName || "");
    if (!bucket || !imageDataUrl) return NextResponse.json({ error: "Document image is required." }, { status: 400 });

    const fallback = verifyDocumentHeuristics({ bucket, ocrText, fileName });
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ analysis: fallback, provider: "local-rules" });

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return NextResponse.json({ analysis: fallback, provider: "local-rules" });
    const mimeType = match[1];
    const base64 = match[2];

    const prompt = `You are the document-intelligence layer of a scholarship verification system. Analyze this uploaded image and return ONLY JSON matching the schema below. The applicant selected the bucket "${bucket}". Do NOT trust that label. Identify what the image actually is. Reject selfies, faces, screenshots of people, blank images, random photos, and unrelated documents. For an Aadhaar/UIDAI card uploaded under income, classify it as identity_government_id and validForBucket=false. For an income certificate, require strong visual/textual evidence of income certificate/revenue authority/certificate number/annual income. For ST certificate, require Scheduled Tribe/community/caste certificate evidence. For academic, require marksheet/transcript/enrollment/university/course/marks evidence. Extract fields only when visibly supported. Do not invent values. OCR text from a separate OCR engine is provided as supplementary evidence; use the image as the primary evidence.

OCR_TEXT: ${ocrText.slice(0, 12000)}

Schema:
{"transcription":"Return the important visible text faithfully, preserving names, numbers, dates and certificate identifiers.","detectedType":"identity_government_id|st_certificate|income_certificate|academic_record|enrollment_proof|unknown|photo_or_selfie|blank_or_unreadable|other_document","confidence":0,"validForBucket":false,"verdict":"verified|mismatch|unreadable|not_a_document|review","reasons":[""],"fields":{"name":{"value":"","confidence":0,"evidence":""},"income":{"value":"","confidence":0,"evidence":""},"certificateNumber":{"value":"","confidence":0,"evidence":""},"governmentId":{"value":"","confidence":0,"evidence":""},"institution":{"value":"","confidence":0,"evidence":""},"course":{"value":"","confidence":0,"evidence":""},"issueDate":{"value":"","confidence":0,"evidence":""}},"visualSignals":[""]}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ inline_data: { mime_type: mimeType, data: base64 } }, { text: prompt }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              transcription: { type: "string" },
              detectedType: { type: "string" }, confidence: { type: "number" }, validForBucket: { type: "boolean" }, verdict: { type: "string" },
              reasons: { type: "array", items: { type: "string" } },
              fields: { type: "object", properties: {
                name: { type: "object", properties: { value:{type:"string"}, confidence:{type:"number"}, evidence:{type:"string"}}, required:["value","confidence","evidence"] },
                income: { type: "object", properties: { value:{type:"string"}, confidence:{type:"number"}, evidence:{type:"string"}}, required:["value","confidence","evidence"] },
                certificateNumber: { type: "object", properties: { value:{type:"string"}, confidence:{type:"number"}, evidence:{type:"string"}}, required:["value","confidence","evidence"] },
                governmentId: { type: "object", properties: { value:{type:"string"}, confidence:{type:"number"}, evidence:{type:"string"}}, required:["value","confidence","evidence"] },
                institution: { type: "object", properties: { value:{type:"string"}, confidence:{type:"number"}, evidence:{type:"string"}}, required:["value","confidence","evidence"] },
                course: { type: "object", properties: { value:{type:"string"}, confidence:{type:"number"}, evidence:{type:"string"}}, required:["value","confidence","evidence"] },
                issueDate: { type: "object", properties: { value:{type:"string"}, confidence:{type:"number"}, evidence:{type:"string"}}, required:["value","confidence","evidence"] }
              }, required:["name","income","certificateNumber","governmentId","institution","course","issueDate"] },
              visualSignals: { type: "array", items: { type: "string" } }
            },
            required:["transcription","detectedType","confidence","validForBucket","verdict","reasons","fields","visualSignals"]
          }
        }
      }),
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ analysis: fallback, provider: "local-rules", providerError: `Vision provider returned ${response.status}` });
    const payload = await response.json();
    const raw = payload?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text || "").join("") || "";
    const parsed = JSON.parse(raw);
    return NextResponse.json({ analysis: parsed, provider: "gemini" });
  } catch (error) {
    return NextResponse.json({ analysis: verifyDocumentHeuristics({ bucket: "unknown", ocrText: "", fileName: "" }), provider: "local-rules", error: error instanceof Error ? error.message : "Document AI failed." });
  }
}
