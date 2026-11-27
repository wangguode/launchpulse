import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "100+ Curated SaaS & AI Directories Index (DR 45–91) | LaunchPulse",
  description:
    "Verified index of 100+ high-authority software, AI, and indie founder directories organized into 3 anti-sandbox submission waves.",
  alternates: { canonical: "/directories" },
  openGraph: { url: "/directories" },
};

export default function DirectoriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
