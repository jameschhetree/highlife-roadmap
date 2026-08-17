import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HighLife Roadmap",
  description: "HighLife Operating System 2026-2027",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <script
          // Applied before first paint so a light-mode user never sees a black
          // flash on load.
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('hl_theme');document.documentElement.dataset.theme=t==='light'?'light':'dark'}catch(e){document.documentElement.dataset.theme='dark'}",
          }}
        />
        <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
