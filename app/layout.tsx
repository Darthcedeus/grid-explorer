import type { Metadata } from "next";
import "./globals.css";
import {ThemeProvider} from "@/components/grid/theme-provider";

export const metadata: Metadata = {
  title: "Netherlands Grid Explorer",
  description: "Explore Dutch generation, demand and physical electricity flows with traceable sources.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased"><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
