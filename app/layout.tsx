import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AlarmManager from "@/components/AlarmManager";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "지하철 도착 정보",
  description: "지하철 실시간 도착정보 조회",
  icons: {
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        {/* 깜빡임(FOUC) 방지를 위한 인라인 스크립트 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('theme');
                  if (!savedTheme) savedTheme = 'dark'; // 기본값
                  if (savedTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-background text-on-background font-body-md h-screen flex flex-col`}>
        <ThemeProvider>
          {children}
          <div style={{ display: "none" }}>
            <AlarmManager />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
