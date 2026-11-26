import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import AmbientFrostStage from "@/components/frosted/AmbientFrostStage";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pulse.statementflow.win"),
  title: "LaunchPulse — 3-Wave SaaS Directory Distribution, Buyer Radar & Edge Attribution",
  description:
    "Post-launch distribution & revenue attribution workspace for SaaS founders: staggered 3-wave pacing across 100+ vetted directories, live HTTP 200 & dofollow verification, 24/7 Reddit/HN/GitHub buyer radar, and sub-10ms Cloudflare Edge shortlinks.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://pulse.statementflow.win" },
  openGraph: {
    title: "LaunchPulse — 3-Wave SaaS Directory Distribution & Edge Attribution",
    description:
      "Turn 100+ curated SaaS directories and buyer-intent threads into verifiable revenue with 3-wave pacing, live backlink checks, and sub-10ms /r/ edge shortlinks.",
    url: "https://pulse.statementflow.win",
    siteName: "LaunchPulse",
    images: [
      {
        url: "/og-launchpulse-v8.png",
        width: 1440,
        height: 900,
        alt: "LaunchPulse V8 — SaaS Distribution & Revenue Attribution Workspace",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LaunchPulse — 3-Wave SaaS Directory Distribution & Edge Attribution",
    description:
      "100+ curated SaaS directories paced across 3 waves, live HTTP 200 + dofollow verification, 12-point AEO scanner, and sub-10ms edge attribution.",
    images: ["/og-launchpulse-v8.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="launchpulse"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/misans@4.0.0/lib/Normal/MiSans-Regular.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/misans@4.0.0/lib/Normal/MiSans-Medium.min.css"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "SoftwareApplication",
                  name: "LaunchPulse",
                  applicationCategory: "BusinessApplication",
                  operatingSystem: "Web",
                  url: "https://pulse.statementflow.win",
                  description:
                    "100+ curated SaaS directory distribution, 24/7 Reddit/HN/GitHub buyer intent radar, and Cloudflare Edge revenue attribution.",
                  offers: {
                    "@type": "AggregateOffer",
                    lowPrice: "29",
                    highPrice: "299",
                    priceCurrency: "USD",
                    offerCount: "3",
                  },
                },
                {
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
                        text: "Cloudflare Edge nodes verify HTTP 200 status and dofollow attributes while connecting /r/ tracking shortlinks and a 1-line pixel to verifiable public reports.",
                      },
                    },
                  ],
                },
              ],
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('lp_locale');var n=(navigator.language||'').toLowerCase();var l=(s==='en'||s==='zh'||s==='ja')?s:(n.indexOf('zh')===0?'zh':n.indexOf('ja')===0?'ja':'en');document.documentElement.lang=l;}catch(e){}})();`,
          }}
        />
        <script src="/api/pixel.js" defer />
      </head>
      <body className="bg-background text-foreground antialiased relative min-h-screen">
        <ThemeProvider>
          <AmbientFrostStage />
          <div className="relative z-10 flex min-h-screen flex-col">
            <I18nProvider>{children}</I18nProvider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
