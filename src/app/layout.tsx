import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "UAX Journey Lab", template: "%s · UAX Journey Lab" },
  description: "Construyendo la experiencia del cliente: taller colaborativo de Customer Journey en tiempo real · Digital Business Intelligence (UAX).",
};

export const viewport: Viewport = {
  themeColor: "#0a2a52",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
