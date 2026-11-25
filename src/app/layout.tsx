import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
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
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=localStorage.getItem('lp_locale')||'zh';if(l==='en'||l==='zh'||l==='ja'){document.documentElement.lang=l;}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider>
          <I18nProvider>{children}</I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
