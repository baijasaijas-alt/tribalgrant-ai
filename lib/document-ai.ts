import { DocumentAI } from "./types";

const patterns: Record<string, RegExp[]> = {
  identity: [/aadhaar/i, /uidai/i, /unique identification/i, /government of india/i, /pan card/i, /passport/i, /driving licence/i, /driving license/i],
  caste: [/scheduled tribe/i, /\bst\b/i, /tribe/i, /caste certificate/i, /community certificate/i, /revenue/i, /tahsildar/i, /tehsildar/i],
  financial: [/income certificate/i, /annual income/i, /family income/i, /income from all sources/i, /tahsildar/i, /tehsildar/i, /revenue department/i, /certificate no/i],
  academic: [/marksheet/i, /mark sheet/i, /transcript/i, /university/i, /college/i, /semester/i, /percentage/i, /cgpa/i, /enrollment/i, /enrolment/i, /degree/i],
};

function score(text: string, list: RegExp[]) { return list.reduce((n, p) => n + (p.test(text) ? 1 : 0), 0); }

export function verifyDocumentHeuristics(input: { bucket: string; ocrText: string; fileName: string }): DocumentAI {
  const text = `${input.ocrText} ${input.fileName}`.trim();
  const scores = Object.fromEntries(Object.entries(patterns).map(([k, p]) => [k, score(text, p)]));
  const identityStrong = scores.identity >= 2 || /\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/.test(text.replace(/[^a-z0-9 -]/gi, ""));
  if (!text || text.includes("[OCR NOT AVAILABLE")) return { detectedType:"unknown", confidence:20, validForBucket:false, verdict:"unreadable", reasons:["No reliable text evidence was extracted."], fields:{}, visualSignals:["OCR evidence unavailable"] };
  if (identityStrong && input.bucket === "financial") return { detectedType:"identity_government_id", confidence:97, validForBucket:false, verdict:"mismatch", reasons:["The document contains strong identity-document signals, not income-certificate evidence.","An Aadhaar/UIDAI-style identity number or terminology was detected."], fields:{}, visualSignals:["Identity document terminology detected"] };
  if (identityStrong && input.bucket === "caste") return { detectedType:"identity_government_id", confidence:93, validForBucket:false, verdict:"mismatch", reasons:["The uploaded document appears to be a government identity document, not an ST certificate."], fields:{}, visualSignals:["Government identity signals"] };
  if (identityStrong && input.bucket === "academic") return { detectedType:"identity_government_id", confidence:93, validForBucket:false, verdict:"mismatch", reasons:["The uploaded document appears to be a government identity document, not an academic record."], fields:{}, visualSignals:["Government identity signals"] };
  const targetScore = scores[input.bucket] || 0;
  const detected = Object.entries(scores).sort((a,b)=>b[1]-a[1])[0]?.[0] || "unknown";
  if (targetScore >= 2) return { detectedType: bucketToType(input.bucket), confidence: Math.min(95, 65 + targetScore*8), validForBucket:true, verdict:"verified", reasons:[`Detected multiple ${bucketLabel(input.bucket)} signals in the document text.`], fields: extractBasicFields(text), visualSignals:[`${bucketLabel(input.bucket)} terminology detected`] };
  if (detected !== input.bucket && (scores[detected] || 0) >= 2) return { detectedType: bucketToType(detected), confidence: 82, validForBucket:false, verdict:"mismatch", reasons:[`The strongest document signals match ${bucketLabel(detected)}, not ${bucketLabel(input.bucket)}.`], fields: extractBasicFields(text), visualSignals:[`Detected ${bucketLabel(detected)} signals`] };
  return { detectedType:"other_document", confidence:55, validForBucket:false, verdict:"review", reasons:[`The document does not contain enough evidence to verify it as ${bucketLabel(input.bucket)}.`], fields:extractBasicFields(text), visualSignals:["Insufficient category-specific evidence"] };
}

function bucketLabel(b:string){ return b === "identity" ? "government identity" : b === "caste" ? "ST certificate" : b === "financial" ? "income certificate" : "academic record"; }
function bucketToType(b:string){ return b === "identity" ? "identity_government_id" : b === "caste" ? "st_certificate" : b === "financial" ? "income_certificate" : "academic_record"; }
function field(value:string, confidence:number, evidence:string){ return { value, confidence, evidence }; }
function extractBasicFields(text:string){
  const income = text.match(/(?:annual|family)?\s*income[^₹0-9]{0,20}(?:₹\s*)?([0-9][0-9,]{2,})/i)?.[1] || "";
  const id = text.match(/\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/)?.[0] || "";
  const cert = text.match(/(?:certificate|cert)\s*(?:no|number|#)?\s*[:.-]?\s*([A-Z0-9\/-]{5,})/i)?.[1] || "";
  return { name:field("",0,""), income:field(income.replace(/,/g,""), income?80:0, income?"income pattern":""), certificateNumber:field(cert, cert?70:0, cert?"certificate number pattern":""), governmentId:field(id, id?90:0, id?"12-digit identity pattern":"") };
}
