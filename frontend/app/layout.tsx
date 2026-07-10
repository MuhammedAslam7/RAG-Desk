import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { SidebarProvider } from "@/lib/sidebar-context";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "RAG Desk - AI Support",
  description: "Intelligent AI customer support powered by knowledge base",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full dark`}
      >
        <body className="h-full bg-background text-foreground antialiased flex flex-col">
          <SidebarProvider>
            {/* Mobile Header with hamburger menu */}
            <MobileHeader />
            
            <div className="flex flex-1 overflow-hidden">
              {/* Desktop Sidebar - hidden on mobile */}
              <div className="hidden md:flex">
                <AppSidebar />
              </div>
              
              {/* Main Content */}
              <main className="flex-1 overflow-hidden w-full">
                {children}
              </main>
            </div>
          </SidebarProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
