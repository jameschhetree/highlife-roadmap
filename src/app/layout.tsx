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
          // Applied before first paint so neither theme flashes on load.
          //
          // Only a stored choice sets data-theme. With nothing stored the
          // attribute stays off and the CSS falls through to
          // prefers-color-scheme, which is how the roadmap document behaved:
          // light by default, dark if the system is dark. This used to hard-code
          // dark, which meant the system preference could never win.
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('hl_theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}}catch(e){}",
          }}
        />
        <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
