import type { Metadata } from "next";
import "./globals.css";
import "../styles/locale-timeline.css";

export const metadata: Metadata = {
  title: "OwnerOps — Staffing decision workbench",
  description: "Compare and review staffing recovery choices on one live schedule.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
