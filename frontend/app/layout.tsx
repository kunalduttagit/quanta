import type { Metadata } from "next";
import "./globals.css";
import { LayoutShell } from "./components/LayoutShell";

export const metadata: Metadata = {
  title: "QuantaTrack",
  description:
    "A clean, fast internal ticket management system for managing and tracking issues across teams and domains.",
  keywords: ["ticket", "issue tracker", "project management"],
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="theme-color" content="#1C1C1E" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
