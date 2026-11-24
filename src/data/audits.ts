import rawAudits from "./generated-audits.json";
import type { StartupAuditReport } from "@/types/audit";

const AUDITS = rawAudits as StartupAuditReport[];

export function getAllAudits(): StartupAuditReport[] {
  return AUDITS;
}

export function getAuditBySlug(slug: string): StartupAuditReport | undefined {
  return AUDITS.find((item) => item.slug === slug);
}
