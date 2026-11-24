import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pulse.statementflow.win"),
  title: "LaunchPulse — 90s Launch Video Teardowns & 24/7 Buyer Intent Radar",
  description:
    "Built your AI SaaS, now wondering where the users are? Run a free passive SEO/AEO leak teardown and unlock live Reddit, Hacker News & GitHub buyers waiting for your tool.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://pulse.statementflow.win",
  },
  openGraph: {
    title: "LaunchPulse — Fix Launch Leaks & Find Waiting SaaS Buyers",
    description:
      "Personalized 90s teardown videos, ready-to-paste Cursor/Claude fix prompts (/llms.txt + JSON-LD), and 24/7 high-intent community buyer alerts.",
    url: "https://pulse.statementflow.win",
    siteName: "LaunchPulse",
    images: [
      {
        url: "/teardowns/certnudge-poster.png",
        width: 1280,
        height: 720,
        alt: "LaunchPulse Personalized SaaS Teardown & Buyer Intent Radar",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LaunchPulse — 90s SaaS Teardowns & Live Buyer Intent Radar",
    description:
      "Stop shipping into the void. Uncover hidden SEO/llms.txt leaks and reply to real developers actively asking for a tool like yours.",
    images: ["/teardowns/certnudge-poster.png"],
  },
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "LaunchPulse",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  url: "https://pulse.statementflow.win",
  description:
    "Automated launch readiness video teardowns, AI search visibility (/llms.txt) fixes, and 24/7 community buyer intent radar for SaaS founders.",
  offers: [
    {
      "@type": "Offer",
      name: "Free Launch Snapshot",
      price: "0",
      priceCurrency: "USD",
    },
    {
      "@type": "Offer",
      name: "One-Time Launch Fix Pack",
      price: "19",
      priceCurrency: "USD",
    },
    {
      "@type": "Offer",
      name: "Growth & Buyer Intent Radar Pro",
      price: "29",
      priceCurrency: "USD",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        />
      </head>
      <body className="font-[family-name:var(--font-sans)] bg-[#07090d] text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-200">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
