import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CLIPFORGE AI — Turn videos into Shorts",
  description: "Create vertical short-form clips from videos you own or are licensed to use.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
