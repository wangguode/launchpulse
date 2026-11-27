import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free /llms.txt Generator for SaaS & Developer Tools | LaunchPulse",
  description:
    "Generate a clean, standards-compliant /llms.txt Markdown manifest so AI answer engines accurately cite your product features, pricing, and documentation.",
  alternates: { canonical: "/tools/llms-txt-generator" },
  openGraph: { url: "/tools/llms-txt-generator" },
};

export default function LlmsGeneratorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
