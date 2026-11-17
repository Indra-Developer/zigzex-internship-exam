import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZIGZEX Internship Examination",
  description: "Lightweight internship entrance examination platform for ZIGZEX IT Services Private Limited.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
