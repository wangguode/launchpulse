import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SaaS & AI Directory Finder — Filter High-DR Launch Sites | LaunchPulse",
  description:
    "Browse and filter high-DR SaaS, AI, and developer software directories by Domain Rating, dofollow status, and category.",
  alternates: { canonical: "/tools/directory-finder" },
  openGraph: { url: "/tools/directory-finder" },
};

export default function DirectoryFinderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
