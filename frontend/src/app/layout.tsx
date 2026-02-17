import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ToastContainer from "@/components/Toast";
import BottomNav from "@/components/BottomNav";
import InactivityTimeout from "@/components/InactivityTimeout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cricket Betting Platform",
  description: "Agent-based cricket betting platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastContainer />
        <InactivityTimeout />
        <div className="pb-14 sm:pb-0">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
