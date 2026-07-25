import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VLN arXiv 监测台",
  description: "每日自动监测视觉语言导航 (VLN) / 无人机 VLN 方向的 arXiv 论文，含中文总结与推荐度评分。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
