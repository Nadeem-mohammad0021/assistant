import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { NotificationToast } from "@/components/NotificationToast";
import { Sparkles, Star, Zap } from 'lucide-react';
import SchemaMarkup from '@/components/SchemaMarkup';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ✅ Dynamic Metadata Function
export async function generateMetadata({ params, searchParams }: { params: any; searchParams: any }): Promise<Metadata> {
  // Default title & description
  let title = 'KYNEX.dev - Personal AI Workspace with Long-Term Memory';
  let description =
    'Your personal AI assistant workspace with long-term memory. Chat intelligently, organize notes, set reminders, and access your information anytime, anywhere.';

  return {
    title,
    description,
    keywords: ["assistant.kynex.dev", "AI assistant", "personal workspace", "note taking", "reminders", "productivity", "long-term memory", "chat assistant", "intelligent workspace"],
    authors: [{ name: "KYNEX.dev" }],
    creator: "KYNEX.dev",
    publisher: "KYNEX.dev",
    robots: {
      index: true,
      follow: true
    },
    openGraph: {
      title,
      description,
      url: 'https://assistant.kynex.dev',
      siteName: 'KYNEX.dev',
      images: [
        {
          url: '/logo.png',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/logo.png'],
      creator: '@kynexdev',
    },
    icons: {
      icon: [
        { url: '/favicon.ico' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      ],
      apple: { url: '/apple-touch-icon.png' },
    },
    manifest: "/site.webmanifest",
    metadataBase: new URL('https://assistant.kynex.dev'),
    alternates: {
      canonical: "https://assistant.kynex.dev"
    }
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Roboto+Mono:wght@700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          .font-quador {
            font-family: "quador", Arial, sans-serif;
            font-weight: 700;
            font-style: italic;
          }
          .logo-text {
            font-family: "quador", Arial, sans-serif;
            font-weight: 700;
            font-style: italic;
            letter-spacing: -0.02em;
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
          }
          .floating {
            animation: float 6s ease-in-out infinite;
          }
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          .pulse-animation {
            animation: pulse 4s ease-in-out infinite;
          }
          @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .animate-gradient {
            background-size: 200% 200%;
            animation: gradient 8s ease infinite;
          }
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
        `}</style>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50 dark:bg-gray-950 relative`}>
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/30 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/20 animate-gradient"></div>
          <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,rgba(15,76,117,0.1)_0%,rgba(0,0,0,0)_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(15,76,117,0.2)_0%,rgba(0,0,0,0)_70%)]"></div>
          
          {/* Floating elements */}
          <div className="absolute top-1/4 left-1/6 floating animate-float" style={{ animationDelay: '0s' }}>
            <Star className="h-6 w-6 text-blue-400/30 dark:text-blue-400/20" fill="currentColor" />
          </div>
          <div className="absolute top-1/3 right-1/4 floating animate-float" style={{ animationDelay: '2s' }}>
            <Sparkles className="h-5 w-5 text-purple-400/30 dark:text-purple-400/20" />
          </div>
          <div className="absolute bottom-1/4 left-1/3 floating animate-float" style={{ animationDelay: '4s' }}>
            <Zap className="h-6 w-6 text-cyan-400/30 dark:text-cyan-400/20" />
          </div>
        </div>
        
        <AuthProvider>
          <NotificationProvider>
            <div className="relative flex min-h-screen flex-col">
              <SchemaMarkup />
              <main className="flex-1">{children}</main>
              <NotificationToast />
            </div>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}