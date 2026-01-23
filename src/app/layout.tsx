import type { Metadata, Viewport } from "next";
import { Inter, Merriweather } from "next/font/google";
import { AuthWrapper } from "@/components/AuthWrapper";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  weight: ["400", "700", "900"],
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#030712" },
  ],
};

export const metadata: Metadata = {
  title: "NYT Reader - Your Personal New York Times Feed",
  description:
    "A personalized New York Times reading experience with AI-powered recommendations",
  icons: {
    icon: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NYT Reader",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function setTheme() {
                  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  document.documentElement.classList.toggle('dark', isDark);
                }
                setTheme();
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', setTheme);
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${merriweather.variable} font-sans antialiased`}
      >
        <AuthWrapper>{children}</AuthWrapper>
      </body>
    </html>
  );
}
