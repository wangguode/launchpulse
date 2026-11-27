import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | LaunchPulse",
  alternates: { canonical: "/privacy" },
  openGraph: { url: "/privacy" },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
