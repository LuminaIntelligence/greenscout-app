import type { Metadata } from "next";
import "./globals.css";

// T-001 minimal root layout. T-002 will introduce Tailwind + Gabarito font
// loading via `next/font/google` (see SPEC §8.2). The Geist defaults that
// `create-next-app` ships with were intentionally removed so they cannot be
// mistaken for the GreenScout design system later on.

export const metadata: Metadata = {
  title: "GreenScout",
  description:
    "Interne Anwendung für GreenScout-Berater zur Erstellung von PV-Machbarkeitsstudien.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
