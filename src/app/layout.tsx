import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pulse.statementflow.win"),
  title: "LaunchPulse — 产品上线后，把海外买家和外链带回来",
  description:
    "面向中国出海开发者与独立团队的精密增长指挥台：一次录入品牌资料，开启 100+ 精选目录自然节奏投放、全网求购线索监听与美元级营收归因。",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://pulse.statementflow.win",
  },
  openGraph: {
    title: "LaunchPulse — 海外精选目录分发、买家求购收件箱与美元级归因",
    description:
      "100+ 精选海外高权重目录分发、24/7 求购线索监听与原生回复精编、以及每条外链的美元级营收归因闭环。",
    url: "https://pulse.statementflow.win",
    siteName: "LaunchPulse",
    images: [
      {
        url: "/teardowns/certnudge-poster.png",
        width: 1280,
        height: 720,
        alt: "LaunchPulse 精密增长指挥台",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LaunchPulse — High-DR Directory Distribution & Buyer Intent Command Center",
    description:
      "Distribute your SaaS across 100+ curated directories, monitor live buying threads, and attribute every dollar back to the exact channel.",
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
    "100+ high-DR directory distribution, real-time buyer intent inbox, and dollar-level attribution for indie SaaS teams.",
  offers: [
    { "@type": "Offer", name: "Free Launch Audit", price: "0", priceCurrency: "USD" },
    { "@type": "Offer", name: "Launch Starter Pack", price: "39", priceCurrency: "USD" },
    { "@type": "Offer", name: "Growth Command Center", price: "29", priceCurrency: "USD" },
    { "@type": "Offer", name: "Done-For-You Flagship", price: "299", priceCurrency: "USD" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" data-theme="light" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('lp_theme')||'light';var r=m==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m;document.documentElement.setAttribute('data-theme',r);var l=localStorage.getItem('lp_locale')||'zh';if(l==='en'||l==='zh'||l==='ja'){document.documentElement.lang=l;}}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        />
      </head>
      <body className="bg-[var(--bg-frame)] text-[var(--ink-primary)] antialiased">
        <ThemeProvider>
          <I18nProvider>{children}</I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
