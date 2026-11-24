import type { MetadataRoute } from "next";
import { getAllAudits } from "@/data/audits";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://pulse.statementflow.win";
  const now = new Date();

  const auditEntries: MetadataRoute.Sitemap = getAllAudits().map((audit) => ({
    url: `${base}/audit/${audit.slug}`,
    lastModified: new Date(audit.scannedAt),
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    ...auditEntries,
    {
      url: `${base}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${base}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
