import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  weight: ["400", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Strot — Client Intelligence for Freelancers & Agencies",
  description:
    "Discover leads, research businesses, detect opportunities, and organize everything in one workspace — before you ever send an outreach message.",
  openGraph: {
    title: "Strot — Client Intelligence Platform",
    description:
      "AI-powered lead discovery across Google Maps, GitHub, Product Hunt, and the web.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={kanit.variable}>
      <body>{children}</body>
    </html>
  );
}
