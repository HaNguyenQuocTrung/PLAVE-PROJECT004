import type { Metadata, Viewport } from "next";

import { PublicFooter } from "@/components/PublicFooter";
import { PublicHeader } from "@/components/PublicHeader";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PLAVE – Học Toán theo nhịp riêng",
    template: "%s | PLAVE",
  },
  description:
    "PLAVE giúp học sinh Việt Nam học Toán theo nhịp riêng với bài học, luyện tập và lời giải rõ ràng.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "light",
  themeColor: "#f4f7fb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        <a className="skip-link" href="#main-content">
          Chuyển đến nội dung chính
        </a>
        <PublicHeader />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <PublicFooter />
      </body>
    </html>
  );
}
