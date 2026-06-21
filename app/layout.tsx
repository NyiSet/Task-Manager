import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { InvitationDialog } from "@/components/invitation-dialog";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "WorkBoard",
  description: "A modern team task board for planning and shipping work.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <InvitationDialog />
        </ThemeProvider>
      </body>
    </html>
  );
}
