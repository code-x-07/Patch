import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from "next/font/google";
import { APP_NAME, DESCRIPTION, TAGLINE } from "@/lib/config";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const text = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: `${APP_NAME}: ${TAGLINE}`, template: `%s · ${APP_NAME}` },
  description: DESCRIPTION,
};

export const viewport: Viewport = {
  themeColor: "#060a14",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${text.variable}`}>
      <body className="atmosphere min-h-dvh">{children}</body>
    </html>
  );
}
