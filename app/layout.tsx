import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cal on the mesh",
  description: "What Cal's Meshtastic radio in Olathe has been doing: health, transmissions, traffic and changes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
