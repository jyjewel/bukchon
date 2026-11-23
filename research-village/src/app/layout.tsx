import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "연구자 마을",
  description: "6명이 함께 살아가는 작은 디지털 연구 마을",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,   // 아이폰이 16px 보다 작은 입력칸을 누를 때 화면을 확대하지 않게(손가락 두 개로 확대하는 건 아이폰에서 그대로 된다)
  viewportFit: "cover",
  themeColor: "#f8f4e8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- 정적 배포에서도 동작하도록 런타임에 불러온다 */}
        <link href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Jua&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
