import type { Metadata } from "next";

import { ThemeToggle } from "@/components/theme/theme-toggle";

import "./globals.css";

export const metadata: Metadata = {
  title: "AllMe",
  description:
    "Personal operating system for notes, calendar, finance, and progress.",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html data-theme="dark" lang="en" suppressHydrationWarning>
      <body>
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
