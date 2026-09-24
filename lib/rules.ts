import { Scheme } from "./types";

export const SCHEME_RULES: Record<Scheme, { incomeCeiling: number | null; required: string[] }> = {
  NFST: { incomeCeiling: null, required: ["identity", "caste", "academic"] },
  NOS: { incomeCeiling: 600000, required: ["identity", "caste", "academic", "financial"] },
};

export function evaluateRules(scheme: Scheme, income: number, buckets: string[]) {
  const rule = SCHEME_RULES[scheme];
  const missing = rule.required.filter((r) => !buckets.includes(r));
  const incomePass = rule.incomeCeiling === null || income <= rule.incomeCeiling;
  return { missing, incomePass, eligible: missing.length === 0 && incomePass };
}
