import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

import { Providers } from "@/components/layout/Providers";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { AgeGate, RealityCheck } from "@/components/layout/AgeGate";
import { BetSlipDock } from "@/components/betting/BetSlip";
import { LiveTicker } from "@/components/betting/LiveTicker";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Rufescent Gaming — Sports Betting, Casino & Fantasy",
    template: "%s · Rufescent Gaming",
  },
  description:
    "Exchange and fixed odds across soccer, cricket, basketball, tennis and esports, plus a full casino and daily fantasy contests. 18+ only. Please gamble responsibly.",
  applicationName: "Rufescent Gaming",
  robots: { index: false, follow: false },
  // Lets an iOS home-screen shortcut open without Safari chrome, which is
  // also what gives the broadcast studio a normal-looking viewport.
  appleWebApp: {
    capable: true,
    title: "Rufescent",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#08070a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <Providers>
          <a href="#main" className="sr-focusable">
            Skip to main content
          </a>

          <AgeGate />
          <RealityCheck />

          <TopBar />
          <LiveTicker />

          {children}

          <Footer />

          <BetSlipDock />
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
