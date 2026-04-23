import type { ReactNode } from 'react';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';

// Locale layout: validates the locale segment only.
// <html>, <body>, lang, dir, and NextIntlClientProvider
// are all owned by the root layout (src/app/layout.tsx).
export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  return <>{children}</>;
}
