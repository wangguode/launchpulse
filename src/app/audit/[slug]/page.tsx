import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllAudits, getAuditBySlug } from "@/data/audits";
import WarRoomClient from "@/components/WarRoomClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllAudits().map((audit) => ({
    slug: audit.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const report = getAuditBySlug(slug);
  if (!report) {
    return { title: "Audit Not Found — LaunchPulse" };
  }

  return {
    title: `${report.productName} (${report.domain}) — Launch & Buyer Intent Teardown | LaunchPulse`,
    description: `Custom ${report.videoDurationSeconds}s launch teardown for ${report.productName}: ${report.leaks.length} SEO/AEO leaks detected + ${report.buyerLeads.length} live developer buyer threads.`,
    alternates: {
      canonical: `https://pulse.statementflow.win/audit/${report.slug}`,
    },
    openGraph: {
      title: `Prepared for ${report.productName}: ${report.videoDurationSeconds}s Teardown + ${report.buyerLeads.length} Live Buyers`,
      description: `Readiness Score: ${report.overallScore}/100. First 3 community buyer links unlocked free inside.`,
      url: `https://pulse.statementflow.win/audit/${report.slug}`,
      images: [
        {
          url: report.posterUrl,
          width: 1280,
          height: 720,
          alt: `${report.productName} Personalized Teardown`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${report.productName} Launch Teardown (${report.overallScore}/100)`,
      description: `Watch the ${report.videoDurationSeconds}s custom walkthrough & claim ${report.buyerLeads.length} waiting developer leads.`,
      images: [report.posterUrl],
    },
  };
}

export default async function AuditWarRoomPage({ params }: PageProps) {
  const { slug } = await params;
  const report = getAuditBySlug(slug);
  if (!report) {
    notFound();
  }

  return <WarRoomClient report={report} />;
}
