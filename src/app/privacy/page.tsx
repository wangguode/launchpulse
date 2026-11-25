"use client";

import Link from "next/link";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import { ThemeModeToggle } from "@/components/themes/theme-mode-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 h-14 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-sm tracking-tight">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BrandMark className="size-4" tone="light" />
            </div>
            <span>LaunchPulse</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <LangSwitcher />
            <ThemeModeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-12 space-y-6">
        <Link href="/" className="text-xs text-primary hover:underline">
          {t.common.backToHome}
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t.legal.privacyTitle}</CardTitle>
            <CardDescription>{t.legal.lastUpdated}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <h2 className="text-base font-semibold text-foreground pt-2">{t.legal.privacyS1Title}</h2>
            <p>{t.legal.privacyS1Body}</p>
            <h2 className="text-base font-semibold text-foreground pt-2">{t.legal.privacyS2Title}</h2>
            <p>{t.legal.privacyS2Body}</p>
            <h2 className="text-base font-semibold text-foreground pt-2">{t.legal.privacyS3Title}</h2>
            <p>
              {t.legal.privacyS3BodyPrefix}{" "}
              <a href="mailto:hello@statementflow.win" className="text-primary hover:underline">
                hello@statementflow.win
              </a>
              {t.legal.privacyS3BodySuffix}
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
