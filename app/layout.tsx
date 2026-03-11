import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relay Story Studio",
  description: "Branching relay-novel foundation for the Codex team project."
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
