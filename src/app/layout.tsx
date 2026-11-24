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
  title: "LaunchPulse — 50+ High-DR Directory Distribution & 24/7 Buyer Intent Radar",
  description:
    "Stop shipping into the void. Distribute your SaaS to 50+ high-DR directories ($39) and unlock fresh (<45d) Hacker News, Reddit & GitHub buyers actively looking for your tool.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://pulse.statementflow.win",
  },
  openGraph: {
    title: "LaunchPulse — 50+ High-DR Directory Backlinks & Live SaaS Buyers",
    description:
      "50+ high-DR directory submissions ($39), 24/7 fresh community buyer intent radar ($29/mo), plus free bonus SEO & /llms.txt audits.",
    url: "https://pulse.statementflow.win",
    siteName: "LaunchPulse",
    images: [
      {
        url: "/teardowns/certnudge-poster.png",
        width: 1280,
        height: 720,
        alt: "LaunchPulse 50+ Directory Distribution & Buyer Intent Radar",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LaunchPulse — 50+ Directory Distribution & 24/7 Buyer Intent Radar",
    description:
      "Stop shipping into the void. Get 50+ high-DR directory backlinks and reply to real developers actively asking for a tool like yours.",
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
    "50+ high-DR directory distribution, 24/7 fresh community buyer intent radar, and passive SEO/AEO launch diagnostics for SaaS founders.",
  offers: [
    {
      "@type": "Offer",
      name: "Free Traffic Snapshot",
      price: "0",
      priceCurrency: "USD",
    },
    {
      "@type": "Offer",
      name: "50+ Directory Distribution Blitz",
      price: "39",
      priceCurrency: "USD",
    },
    {
      "@type": "Offer",
      name: "24/7 Buyer Intent Radar Pro",
      price: "29",
      priceCurrency: "USD",
    },
    {
      "@type": "Offer",
      name: "Done-For-You Growth Sprint",
      price: "299",
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
