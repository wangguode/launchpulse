import type { Metadata } from "next";
import { getAllAudits } from "@/data/audits";
import HomeClient from "@/components/HomeClient";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

const HOME_FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Will submitting to 100 directories trigger a Google penalty?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. LaunchPulse paces submissions across 3 weekly waves on curated, high-DR software directories rather than automated link farms.",
      },
    },
    {
      "@type": "Question",
      name: "How does LaunchPulse verify backlinks and attribute revenue?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Cloudflare Edge nodes verify HTTP 200 status and dofollow attributes while connecting /r/ tracking shortlinks and a 1-line pixel to public attribution reports.",
      },
    },
  ],
};

export default function HomePage() {
  const sampleAudits = getAllAudits();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOME_FAQ_JSON_LD) }}
      />
      <HomeClient sampleAudits={sampleAudits} />
    </>
  );
}
