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
      url: `${base}/tools/directory-finder`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/tools/llms-txt-generator`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/tools/aeo-checker`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/report/demo-acmeflow`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
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
