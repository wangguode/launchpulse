import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free 12-Point AEO & AI Search Readiness Checker | LaunchPulse",
  description:
    "Audit your SaaS website for ChatGPT Search, Perplexity, and Claude citations: /llms.txt, JSON-LD SoftwareApplication schema, sitemap.xml, and security headers.",
  alternates: { canonical: "/tools/aeo-checker" },
  openGraph: { url: "/tools/aeo-checker" },
};

export default function AeoCheckerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
