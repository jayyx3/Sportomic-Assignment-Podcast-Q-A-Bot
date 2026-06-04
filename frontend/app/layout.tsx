import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "🎙️ Podcast Q&A Bot — Elon Musk × Nikhil Kamath",
  description: "Ask questions and get answers directly with corresponding YouTube timestamp from the Elon Musk × Nikhil Kamath podcast (People by WTF Ep. 16).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className={`${inter.className} bg-gray-950 text-white min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
