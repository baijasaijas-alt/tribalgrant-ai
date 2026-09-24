import { Dossier, Scheme } from "./types";
import { evaluateRules } from "./rules";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
function similarity(a: string, b: string) {
  const x = norm(a), y = norm(b); if (!x || !y) return 0; if (y.includes(x)) return 1;
  const aw=x.split(" ").filter(Boolean), bw=y.split(" ").filter(Boolean); const setA=new Set(aw), setB=new Set(bw);
  const overlap=[...setA].filter(w=>setB.has(w)).length; return overlap/Math.max(setA.size,setB.size);
}

export function verifyApplication(input: Pick<Dossier,"name"|"scheme"|"typedData"|"documents">): NonNullable<Dossier["verification"]> {
  const docs=input.documents; const allText=docs.map(d=>d.extractedRaw||"").join(" ");
  const nameScore=similarity(input.name, allText); const idValue=input.typedData.id.replace(/\s/g,"");
  const idPresent=Boolean(idValue)&&allText.replace(/\s/g,"").includes(idValue); const income=Number(input.typedData.income||0);
  const buckets=[...new Set(docs.map(d=>d.title.toLowerCase()))]; const rules=evaluateRules(input.scheme as Scheme,income,buckets);
  const mismatches=docs.filter(d=>d.ai?.validForBucket===false || d.ai?.verdict==="mismatch" || d.ai?.verdict==="not_a_document");
  const unreadable=docs.filter(d=>d.ai?.verdict==="unreadable");
  const checks=[
    {key:"documents",label:"Required document categories",status:rules.missing.length?"fail":"pass",detail:rules.missing.length?`Missing: ${rules.missing.join(", ")}`:"All configured categories present."},
    {key:"documentType",label:"AI document type validation",status:mismatches.length?"fail":unreadable.length?"review":"pass",detail:mismatches.length?mismatches.map(d=>`${d.filename}: ${d.ai?.detectedType}`).join("; "):"Each uploaded document matches its selected category."},
    {key:"name",label:"Applicant name evidence",status:nameScore>=.55?"pass":"review",detail:nameScore>=.55?"Applicant name is supported by OCR evidence.":"Applicant name could not be confidently matched."},
    {key:"id",label:"Government ID evidence",status:idPresent?"pass":"review",detail:idPresent?"Submitted 12-digit ID appears in OCR evidence.":"Submitted ID was not found in identity OCR evidence."},
    {key:"income",label:"Scheme income rule",status:rules.incomePass?"pass":"fail",detail:rules.incomePass?"Income satisfies the configured scheme rule.":"Income exceeds the configured scheme ceiling."},
    {key:"quality",label:"Document image quality",status:docs.every(d=>(d.clarity||0)>=55)?"pass":"review",detail:docs.every(d=>(d.clarity||0)>=55)?"All images meet the minimum focus gate.":"One or more images need a clearer capture."},
  ] as NonNullable<Dossier["verification"]>["checks"];
  const deficiencies=[...rules.missing.map(x=>`Upload the required ${x} document.`),...mismatches.map(d=>`${d.title}: ${d.ai?.reasons?.[0]||"Uploaded document does not match the required category."}`),...unreadable.map(d=>`${d.title}: image could not be read reliably.`),...(rules.incomePass?[]:["Income exceeds the configured scheme ceiling."]),...(nameScore<.55?["Confirm that the applicant name matches the submitted identity evidence."]:[]),...(!idPresent?["Confirm that the government ID number is visible in the identity document."]:[])];
  const passCount=checks.filter(c=>c.status==="pass").length; const confidence=Math.round(Math.max(0,Math.min(100,(passCount/checks.length)*100)));
  return {eligible:deficiencies.length===0,confidence,checks,deficiencies};
}
