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
  title: "LaunchPulse — 海外精选目录分发、高意向买家收件箱与美元归因平台",
  description:
    "基于标准 shadcn/ui 工业级架构打造的中国出海增长与投流归因平台：100+ 精选目录节奏投放、全网求购线索监听、边缘短链与美元级营收归因。",
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
      data-theme="vercel"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=localStorage.getItem('lp_locale')||'zh';if(l==='en'||l==='zh'||l==='ja'){document.documentElement.lang=l;}var m=document.cookie.match(/(?:^|; )active_theme=([^;]+)/);if(m&&m[1]){document.documentElement.setAttribute('data-theme',decodeURIComponent(m[1]));}}catch(e){}})();`,
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
