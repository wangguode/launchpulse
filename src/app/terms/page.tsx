"use client";

import Link from "next/link";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import { ThemeModeToggle } from "@/components/themes/theme-mode-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <div className="sticky top-0 z-40 px-4 pt-3 sm:px-6">
        <header className="lp-frosted-topbar mx-auto flex h-14 max-w-4xl items-center justify-between rounded-2xl px-4 sm:px-5">
          <Link href="/" className="flex items-center gap-2.5 font-semibold text-[15px] tracking-tight">
            <div className="lp-btn-bevel flex size-8 items-center justify-center rounded-[10px]">
              <BrandMark className="size-4" tone="light" />
            </div>
            <span>LaunchPulse</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <LangSwitcher />
            <ThemeModeToggle />
          </div>
        </header>
      </div>
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10 space-y-6">
        <Link href="/" className="text-xs text-primary hover:underline">
          {t.common.backToHome}
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t.legal.termsTitle}</CardTitle>
            <CardDescription>{t.legal.lastUpdated}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <h2 className="text-base font-semibold text-foreground pt-2">{t.legal.termsS1Title}</h2>
            <p>{t.legal.termsS1Body}</p>
            <h2 className="text-base font-semibold text-foreground pt-2">{t.legal.termsS2Title}</h2>
            <p>
              {t.legal.termsS2BodyPrefix}{" "}
              <a href="mailto:hello@statementflow.win" className="text-primary hover:underline">
                hello@statementflow.win
              </a>{" "}
              {t.legal.termsS2BodySuffix}
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
