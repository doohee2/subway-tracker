import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AlarmManager from "@/components/AlarmManager";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "지하철 도착 정보",
  description: "서울시 지하철 실시간 도착정보 조회",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} bg-background text-on-background font-body-md h-screen flex flex-col`}>
        {children}
        <div style={{ display: "none" }}>
          <AlarmManager />
        </div>
      </body>
    </html>
  );
}
