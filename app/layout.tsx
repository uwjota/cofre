import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Cofre — Seu espaço, suas ideias",
  description:
    "Organize seu dia. Conecte suas ideias. Seu dashboard pessoal e segundo cérebro.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
