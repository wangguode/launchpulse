import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service & Refund Policy | LaunchPulse",
  alternates: { canonical: "/terms" },
  openGraph: { url: "/terms" },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
