import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wildcard",
  description: "Multiplayer 3D shedding card game. Match colours and numbers, empty your hand first.",
};
export const viewport: Viewport = { themeColor: "#0b1020" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0b1020] antialiased">{children}</body>
    </html>
  );
}
