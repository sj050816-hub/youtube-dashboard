import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "유튜브 트렌딩 분석기",
  description: "Youtube Trend Analyzer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}