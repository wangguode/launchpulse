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
  title: "LaunchPulse — 海外精选目录分发、高意向买家雷达与美元归因平台",
  description:
    "专为出海 SaaS 与独立开发者打造的增长与归因工作台：100+ 海外高权重目录节奏分发、24/7 Reddit/HN/GitHub 买家意图捕手、边缘归因短链与可核验公开战报。",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://pulse.statementflow.win" },
  openGraph: {
    title: "LaunchPulse — 海外精选目录分发与美元归因增长平台",
    description:
      "100+ 精选海外高权重目录分发、24/7 买家求购收件箱、边缘归因短链与可核验公开战报。",
    url: "https://pulse.statementflow.win",
    siteName: "LaunchPulse",
    images: [{ url: "/teardowns/certnudge-poster.png", width: 1280, height: 720, alt: "LaunchPulse" }],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh"
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
            __html: `(function(){try{var l=localStorage.getItem('lp_locale')||'zh';if(l==='en'||l==='zh'||l==='ja'){document.documentElement.lang=l;}}catch(e){}})();`,
          }}
        />
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
